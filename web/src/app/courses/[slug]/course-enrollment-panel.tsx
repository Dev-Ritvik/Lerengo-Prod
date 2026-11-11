"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  CourseAccessState,
  CourseCertificateSummary,
  CourseEnrollmentSummary,
  CoursePurchaseSummary,
} from "@/lib/courses";
import styles from "./page.module.css";

type Props = {
  accessState: CourseAccessState;
  certificate: CourseCertificateSummary | null;
  courseSlug: string;
  courseTitle: string;
  enrollment: CourseEnrollmentSummary | null;
  isSignedIn: boolean;
  purchase: CoursePurchaseSummary;
};

type RazorpayWindow = Window & {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
};

let checkoutScriptPromise: Promise<boolean> | null = null;

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function loadCheckoutScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if ((window as RazorpayWindow).Razorpay) {
    return Promise.resolve(true);
  }

  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return checkoutScriptPromise;
}

export function CourseEnrollmentPanel({
  accessState,
  certificate,
  courseSlug,
  courseTitle,
  enrollment,
  isSignedIn,
  purchase,
}: Props) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePurchase() {
    setNotice(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const canLoad = await loadCheckoutScript();
      if (!canLoad) {
        setError("Could not load Razorpay checkout. Try again.");
        return;
      }

      const response = await fetch("/api/courses/orders", {
        body: JSON.stringify({ courseSlug }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            amount?: number;
            courseTitle?: string;
            currency?: string;
            error?: string;
            key?: string;
            orderId?: string;
          }
        | null;

      if (!response.ok || !payload?.orderId || !payload.key || !payload.amount || !payload.currency) {
        setError(payload?.error ?? "Could not start the purchase flow.");
        return;
      }

      const Razorpay = (window as RazorpayWindow).Razorpay;
      if (!Razorpay) {
        setError("Checkout is unavailable right now.");
        return;
      }

      const instance = new Razorpay({
        amount: payload.amount,
        currency: payload.currency,
        description: payload.courseTitle ?? courseTitle,
        handler: async (response?: {
          razorpay_order_id?: string;
          razorpay_payment_id?: string;
          razorpay_signature?: string;
        }) => {
          setNotice("Payment captured. Verifying signature...");
          if (response?.razorpay_signature) {
            try {
              await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
            } catch {
              // Webhook handles fulfillment independently if direct call fails
            }
          }
          setNotice("Payment confirmed! Unlocking course access...");
          window.setTimeout(() => {
            router.refresh();
          }, 1500);
        },
        key: payload.key,
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setError("Checkout was cancelled.");
          },
        },
        name: "LerenGO SkillGO",
        order_id: payload.orderId,
        theme: {
          color: "#96a1ab",
        },
      });

      if (typeof (instance as any).on === "function") {
        (instance as any).on("payment.failed", (failedRes: any) => {
          setIsSubmitting(false);
          setError(failedRes?.error?.description || "Payment failed. Please try again.");
        });
      }

      instance.open();
    } catch {
      setError("Purchase flow failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isSignedIn) {
    return (
      <div className={styles.enrollmentCard}>
        <span className={styles.enrollmentEyebrow}>Sign in required</span>
        <h2 className={styles.enrollmentTitle}>Buy and unlock this course with your LerenGO account.</h2>
        <p className={styles.enrollmentBody}>
          Private lessons, the final assessment, and your certificate stay attached to the same identity.
        </p>
        <Link href={`/signin?next=/courses/${courseSlug}`} className={styles.enrollButton}>
          Sign in to continue
        </Link>
      </div>
    );
  }

  if (purchase.hasAccess) {
    return (
      <div className={styles.enrollmentCard}>
        <span className={styles.enrollmentEyebrow}>Access active</span>
        <h2 className={styles.enrollmentTitle}>
          {accessState === "completed" ? "Certificate-ready" : formatStatus(enrollment?.status ?? "active")}
        </h2>
        <p className={styles.enrollmentBody}>
          {accessState === "completed"
            ? "You have already cleared the paid access gate for this course. Finish or revisit the curriculum inside the private learning console."
            : "Private lessons are unlocked. Move through the curriculum, finish the final assessment, and collect your certificate."}
        </p>
        {enrollment ? (
          <>
            <div className={styles.progressRail}>
              <span className={styles.progressFill} style={{ width: `${enrollment.progressPercent}%` }} />
            </div>
            <p className={styles.enrollmentHint}>
              Progress: {enrollment.progressPercent}% / Source: {enrollment.source.replace(/_/g, " ")}.
            </p>
          </>
        ) : null}
        {certificate ? (
          <div className={styles.certificateBlock}>
            <span className={styles.certificateLabel}>Certificate issued</span>
            <strong>{certificate.certificateNumber}</strong>
            <Link href={certificate.href} className={styles.backLink}>
              Open certificate
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.enrollmentCard}>
      <span className={styles.enrollmentEyebrow}>Paid access</span>
      <h2 className={styles.enrollmentTitle}>Buy once, learn inside the site, and test for certification.</h2>
      <p className={styles.enrollmentBody}>
        This course unlocks private lesson delivery, a graded final check, and certificate issuance after you pass.
      </p>
      <div className={styles.priceStack}>
        <strong className={styles.purchasePrice}>{formatPrice(purchase.priceInr)}</strong>
        {purchase.listPriceInr ? (
          <span className={styles.purchaseStrike}>{formatPrice(purchase.listPriceInr)}</span>
        ) : null}
      </div>
      <button className={styles.enrollButton} disabled={isSubmitting} onClick={handlePurchase} type="button">
        {isSubmitting ? "Starting checkout..." : "Buy course access"}
      </button>
      {purchase.paymentStatus === "created" ? (
        <p className={styles.enrollmentHint}>
          A pending payment was already created for this course. Complete checkout or wait for capture confirmation.
        </p>
      ) : null}
      {error ? <p className={styles.enrollmentError}>{error}</p> : null}
      {notice ? <p className={styles.enrollmentSuccess}>{notice}</p> : null}
    </div>
  );
}
