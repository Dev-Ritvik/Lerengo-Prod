import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { isNoteInOfferSemester } from "@/lib/note-offers";
import { enforceRouteRateLimit, getRouteAdminClient } from "@/lib/route-security";
import { logServerEvent } from "@/lib/server-log";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

export async function POST(request: Request) {
  const tenant = await requireVerifiedProfileForApi();
  if (!tenant.ok) {
    return NextResponse.json({ error: tenant.error }, { status: tenant.status });
  }

  const { profile, supabase } = tenant;
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ?? "";
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";

  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json(
      {
        error:
          "Payments are not configured yet. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local.",
      },
      { status: 503 },
    );
  }
  
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

    const json = await request.json();
    const noteId = json.noteId;

    if (!noteId || typeof noteId !== "string") {
      return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
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

    // 5. Store pending payment record (optional but recommended for reconciliation)
    // We will rely on webhook to create the final payment record, 
    // but creating a 'created' state record here can be good for analytics/abandoned cart tracking.
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
      // Proceeding anyway since the order is already created at the gateway.
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpayKeyId, // Send key to client for convenience
    });

  } catch (err) {
    logServerEvent("error", "notes.order_creation_failed", {
      error: err,
      userId: profile.id,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
