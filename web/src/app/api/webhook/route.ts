import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { ensureCourseEnrollmentUnlocked } from "@/lib/courses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
                    const { data: existing } = await supabaseAdmin
                        .from("note_access")
                        .select("id")
                        .eq("user_id", userId)
                        .eq("note_id", noteId)
                        .maybeSingle();
                    if (!existing) {
                        await supabaseAdmin.from("note_access").insert({
                            user_id: userId,
                            note_id: noteId,
                            payment_id: paymentRecord?.id ?? null,
                            granted_at: new Date().toISOString()
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
