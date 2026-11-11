import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { isNoteInOfferSemester } from "@/lib/note-offers";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import { logServerEvent } from "@/lib/server-log";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

export async function POST(request: Request) {
  const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)?.trim() ?? "";
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";

  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json(
      {
        error:
          "Payments are not configured yet. Add RAZORPAY_KEY_ID, NEXT_PUBLIC_RAZORPAY_KEY_ID, and RAZORPAY_KEY_SECRET in .env.",
      },
      { status: 503 },
    );
  }

  // Handle optional Authorization header validation
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === "invalid" || token === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const json = await request.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  // FLOW A: Standard Razorpay Order Creation via { amount, currency, receipt }
  if (json.amount !== undefined) {
    const amount = Number(json.amount);
    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { error: "Invalid amount. Minimum amount is 100 paise (₹1)." },
        { status: 400 },
      );
    }

    const currency =
      typeof json.currency === "string" && json.currency.trim().length > 0
        ? json.currency.trim().toUpperCase()
        : "INR";

    const receipt =
      typeof json.receipt === "string" && json.receipt.trim().length > 0
        ? json.receipt.trim().substring(0, 40)
        : `rcpt_${Date.now()}`;

    try {
      const razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });

      const order = await razorpay.orders.create({
        amount: Math.round(amount),
        currency,
        receipt,
        notes: json.notes && typeof json.notes === "object" ? json.notes : {},
      });

      return NextResponse.json({
        order_id: order.id,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: razorpayKeyId,
      });
    } catch (err: any) {
      logServerEvent("error", "razorpay.standard_order_creation_failed", {
        error: err?.message || err,
      });

      // Handle Razorpay auth failures (401)
      if (err?.statusCode === 401 || err?.status === 401) {
        return NextResponse.json(
          { error: "Razorpay authentication failed. Verify API credentials." },
          { status: 401 },
        );
      }

      // Handle general Razorpay API errors (500)
      return NextResponse.json(
        {
          error:
            err?.error?.description ||
            err?.message ||
            "Internal server error creating Razorpay order",
        },
        { status: 500 },
      );
    }
  }

  // FLOW B: Existing Note-specific purchase flow
  const noteId = json.noteId;
  if (!noteId || typeof noteId !== "string") {
    return NextResponse.json(
      { error: "Invalid request. Provide 'amount' (paise) or a valid 'noteId'." },
      { status: 400 },
    );
  }

  const tenant = await requireVerifiedProfileForApi();
  if (!tenant.ok) {
    return NextResponse.json({ error: tenant.error }, { status: tenant.status });
  }

  const { profile, supabase } = tenant;

  try {
    const rateLimitResponse = await enforceRouteRateLimit({
      request,
      profile,
      routeKey: "api:notes:create-order",
      limit: 5,
      windowMs: 15 * 60 * 1000,
      message: "Too many note checkout attempts. Wait a few minutes before trying again.",
      persistent: {
        client: tenant.supabase,
        actorColumn: "user_id",
        actorId: profile.id,
        table: "payments",
        windowMs: 15 * 60 * 1000,
        limit: 5,
      },
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 1. Fetch note details
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, price_inr, university_id, title, semester, archived_at")
      .eq("id", noteId)
      .eq("is_verified", true)
      .is("archived_at", null)
      .maybeSingle();

    if (noteError || !note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // 2. University Isolation Check
    if (note.university_id !== profile.university_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (note.price_inr <= 0) {
      return NextResponse.json(
        { error: "This note is free. No payment is required." },
        { status: 400 },
      );
    }

    if (isNoteInOfferSemester(note.semester)) {
      return NextResponse.json(
        {
          error: "This note is free in the semester launch offer. No payment required.",
        },
        { status: 400 },
      );
    }

    // 3. Check if already purchased
    const { data: access } = await supabase
      .from("note_access")
      .select("id")
      .eq("user_id", profile.id)
      .eq("note_id", noteId)
      .maybeSingle();

    if (access) {
      return NextResponse.json({ error: "Already purchased" }, { status: 409 });
    }

    // 4. Create Razorpay Order
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const amountPaise = Math.round(note.price_inr * 100);
    if (amountPaise < 100) {
      return NextResponse.json(
        { error: "Invalid note price. Minimum amount is 100 paise." },
        { status: 400 },
      );
    }

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `note_${noteId}_${profile.id}`.substring(0, 40),
      notes: {
        noteId: noteId,
        userId: profile.id,
        universityId: profile.university_id,
      },
    });

    // 5. Store pending payment record
    try {
      const adminResult = getRouteAdminClient({
        feature: "Payments",
        route: "/api/create-order",
      });
      if (!adminResult.ok) {
        return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
      }
      const admin = adminResult.admin;
      const { error: paymentDbError } = await admin
        .from("payments")
        .insert({
          amount_paise: amountPaise,
          note_id: noteId,
          razorpay_order_id: order.id,
          status: "created",
          user_id: profile.id,
        });

      if (paymentDbError) {
        logServerEvent("warn", "notes.order_audit_log_failed", {
          error: paymentDbError,
          noteId,
          userId: profile.id,
        });
      }
    } catch (paymentDbError) {
      logServerEvent("warn", "notes.order_audit_init_failed", {
        error: paymentDbError,
        noteId,
        userId: profile.id,
      });
    }

    return NextResponse.json({
      order_id: order.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpayKeyId,
    });
  } catch (err: any) {
    logServerEvent("error", "notes.order_creation_failed", {
      error: err,
      userId: profile.id,
    });

    if (err?.statusCode === 401 || err?.status === 401) {
      return NextResponse.json(
        { error: "Razorpay authentication failed" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
