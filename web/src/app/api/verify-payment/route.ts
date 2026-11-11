import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logServerEvent } from "@/lib/server-log";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 },
      );
    }

    const orderId =
      body.razorpay_order_id || body.order_id || body.orderId;
    const paymentId =
      body.razorpay_payment_id || body.payment_id || body.paymentId;
    const signature =
      body.razorpay_signature || body.signature;

    // Validate missing fields -> return 400
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
        },
        { status: 400 },
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay key secret is not configured on the server." },
        { status: 500 },
      );
    }

    // Step 3 Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const signatureBuffer = Buffer.from(String(signature), "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    const isMatch =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    // Signature mismatch -> return 400, do NOT mark as paid
    if (!isMatch) {
      logServerEvent("warn", "razorpay.signature_verification_failed", {
        orderId,
        paymentId,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Signature mismatch: payment verification failed.",
        },
        { status: 400 },
      );
    }

    // If matching order exists in DB, update payment record to 'success'
    try {
      const supabaseAdmin = createSupabaseAdminClient();
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id, status, note_id, user_id")
        .eq("razorpay_order_id", orderId)
        .maybeSingle();

      if (existingPayment) {
        await supabaseAdmin
          .from("payments")
          .update({
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
            status: "success",
          })
          .eq("id", existingPayment.id);

        if (existingPayment.note_id && existingPayment.user_id) {
          await supabaseAdmin
            .from("note_access")
            .upsert(
              {
                note_id: existingPayment.note_id,
                payment_id: existingPayment.id,
                user_id: existingPayment.user_id,
              },
              { onConflict: "user_id,note_id" },
            );
        }
      }
    } catch (dbErr) {
      logServerEvent("warn", "payments.verify_db_update_failed", {
        error: dbErr,
        orderId,
        paymentId,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      order_id: orderId,
      payment_id: paymentId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error during verification" },
      { status: 500 },
    );
  }
}

