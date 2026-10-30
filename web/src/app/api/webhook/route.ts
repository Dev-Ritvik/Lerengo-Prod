import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { ensureCourseEnrollmentUnlocked } from "@/lib/courses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logServerEvent } from "@/lib/server-log";

export async function POST(request: Request) {
    try {
        const text = await request.text();
        const headersList = await headers();
        const signature = headersList.get("x-razorpay-signature");

        if (!signature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 400 });
        }

        const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";
        if (!secret) {
            return NextResponse.json(
                { error: "RAZORPAY_WEBHOOK_SECRET is not configured." },
                { status: 503 }
            );
        }
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(text)
            .digest("hex");

        const signatureBuffer = Buffer.from(signature, "utf8");
        const expectedBuffer = Buffer.from(expectedSignature, "utf8");

        if (
            signatureBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
        ) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        const event = JSON.parse(text);

        /**
         * H4 fix — receipt ↔ userId cross-check.
         * Orders are created by our own APIs with receipts of the form
         * `course_<slug>_<userId>` or `note_<noteId>_<userId>`. If a captured
         * payment carries a receipt that does not end with the userId claimed
         * in payment notes, the payload is inconsistent/tampered and must never
         * grant access. Unknown receipt shapes are rejected fail-closed.
         */
        function receiptMatchesUser(receipt: unknown, userId: string): boolean {
            if (typeof receipt !== "string" || receipt.length === 0) {
                return false;
            }
            return /^.*_(.+)$/.test(receipt) && receipt.endsWith(`_${userId}`);
        }

        /**
         * H4 fix — amount validation. Razorpay caps order amounts at ₹1 crore
         * (10,000,000 paise). Anything above this cannot correspond to a real
         * catalog item price, so treat it as invalid rather than granting access.
         */
        const MAX_VALID_AMOUNT_PAISE = 10_000_000;
        function isValidCapturedAmount(amount: unknown): boolean {
            return typeof amount === "number" && Number.isInteger(amount) && amount > 0 && amount <= MAX_VALID_AMOUNT_PAISE;
        }

        // We only care about payment.captured (or order.paid)
        if (event.event === "payment.captured") {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            const notes = payment.notes || {};
            const noteId = notes.noteId;
            const courseId = notes.courseId;
            const userId = notes.userId;

            const supabaseAdmin = createSupabaseAdminClient();

            if (!userId || (!noteId && !courseId)) {
                console.error("Webhook missing metadata", notes);
                return NextResponse.json({ received: true });
            }

            // H4(a): reject payments whose receipt does not match the claimed user.
            if (!receiptMatchesUser(payment.receipt, userId)) {
                logServerEvent("error", "payments.webhook_receipt_user_mismatch", {
                    orderId,
                    receipt: payment.receipt,
                    userId,
                });
                return NextResponse.json(
                    { error: "Receipt/user mismatch — access not granted." },
                    { status: 400 }
                );
            }

            // H4(b): reject implausible amounts instead of trusting the payload.
            if (!isValidCapturedAmount(payment.amount)) {
                logServerEvent("error", "payments.webhook_invalid_amount", {
                    amount: payment.amount,
                    orderId,
                    userId,
                });
                return NextResponse.json(
                    { error: "Invalid payment amount — access not granted." },
                    { status: 400 }
                );
            }

            if (courseId) {
                const { error: coursePaymentError } = await supabaseAdmin
                    .from("course_payments")
                    .upsert({
                        amount_paise: payment.amount,
                        course_id: courseId,
                        currency: payment.currency ?? "INR",
                        payment_provider: "razorpay",
                        razorpay_order_id: orderId,
                        razorpay_payment_id: payment.id,
                        status: "success",
                        user_id: userId,
                        updated_at: new Date().toISOString()
                    }, { onConflict: "razorpay_order_id" });

                if (coursePaymentError) {
                    console.error("Failed to save course payment", coursePaymentError);
                    return NextResponse.json({ error: "Db Error" }, { status: 500 });
                }

                const enrollmentResult = await ensureCourseEnrollmentUnlocked({
                    courseId,
                    progressPercent: 12,
                    source: "course_purchase",
                    status: "active",
                    userId,
                });

                if (!enrollmentResult.ok) {
                    console.error("Failed to unlock course enrollment", enrollmentResult.error);
                    return NextResponse.json({ error: "Db Error" }, { status: 500 });
                }
            }

            if (noteId) {
                const { data: paymentRecord, error: paymentError } = await supabaseAdmin
                    .from("payments")
                    .upsert({
                        amount_paise: payment.amount,
                        note_id: noteId,
                        razorpay_order_id: orderId,
                        razorpay_payment_id: payment.id,
                        razorpay_signature: signature,
                        status: "success",
                        user_id: userId,
                        updated_at: new Date().toISOString()
                    }, { onConflict: "razorpay_order_id" })
                    .select("id")
                    .maybeSingle();

                if (paymentError) {
                    console.error("Failed to save payment", paymentError);
                    return NextResponse.json({ error: "Db Error" }, { status: 500 });
                }

                const { error: accessError } = await supabaseAdmin
                    .from("note_access")
                    .upsert({
                        user_id: userId,
                        note_id: noteId,
                        payment_id: paymentRecord?.id ?? null,
                    }, { onConflict: "user_id, note_id" });

                if (accessError) {
                    const { data: existing, error: checkError } = await supabaseAdmin
                        .from("note_access")
                        .select("id")
                        .eq("user_id", userId)
                        .eq("note_id", noteId)
                        .maybeSingle();

                    // H4(c): the existence probe itself failed — we cannot know
                    // whether access exists. Return 500 so Razorpay retries the
                    // webhook instead of silently dropping the grant.
                    if (checkError) {
                        logServerEvent("error", "payments.webhook_note_access_check_failed", {
                            error: checkError,
                            noteId,
                            userId,
                        });
                        return NextResponse.json({ error: "Db Error" }, { status: 500 });
                    }

                    if (!existing) {
                        const { error: insertError } = await supabaseAdmin
                            .from("note_access")
                            .insert({
                                user_id: userId,
                                note_id: noteId,
                                payment_id: paymentRecord?.id ?? null,
                                granted_at: new Date().toISOString()
                            });

                        // H4(c): a paid user must never be left without access
                        // silently — surface the failure so the webhook retries.
                        if (insertError) {
                            logServerEvent("error", "payments.webhook_note_access_grant_failed", {
                                error: insertError,
                                noteId,
                                userId,
                            });
                            return NextResponse.json({ error: "Db Error" }, { status: 500 });
                        }
                    } else {
                        logServerEvent("warn", "payments.webhook_note_access_upsert_conflict_resolved", {
                            noteId,
                            userId,
                        });
                    }
                }
            }
        }

        return NextResponse.json({ received: true });

    } catch (err) {
        console.error("Webhook Error:", err);
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 500 }
        );
    }
}
