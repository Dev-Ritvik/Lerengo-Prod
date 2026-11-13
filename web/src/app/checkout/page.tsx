"use client";

import { useState } from "react";
import Link from "next/link";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";

export default function CheckoutPage() {
  const [amountInr, setAmountInr] = useState<number>(500);
  const [lastPaymentResult, setLastPaymentResult] = useState<{
    orderId: string;
    paymentId: string;
    signature: string;
  } | null>(null);

  const amountPaise = Math.max(100, Math.round(amountInr * 100));

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#090d16",
        color: "#f8fafc",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <Link
            href="/"
            style={{
              fontSize: "14px",
              color: "#94a3b8",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "16px",
            }}
          >
            ← Back to Home
          </Link>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              marginBottom: "12px",
            }}
          >
            Razorpay Standard Web Checkout
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Secure Checkout
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "#94a3b8",
              marginTop: "8px",
              lineHeight: 1.5,
            }}
          >
            Complete your transaction using cards, UPI, netbanking, or digital wallets
            via the official Razorpay payment modal.
          </p>
        </div>

        {/* Checkout Card */}
        <div
          style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              marginTop: 0,
              marginBottom: "20px",
              color: "#f1f5f9",
            }}
          >
            Select Order Amount
          </h2>

          {/* Quick preset buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            {[
              { label: "₹1 (Test Minimum)", value: 1 },
              { label: "₹99 (Notes Access)", value: 99 },
              { label: "₹500 (Standard)", value: 500 },
            ].map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setAmountInr(preset.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border:
                    amountInr === preset.value
                      ? "2px solid #3b82f6"
                      : "1px solid #374151",
                  backgroundColor:
                    amountInr === preset.value ? "rgba(59, 130, 246, 0.15)" : "#1f2937",
                  color: amountInr === preset.value ? "#60a5fa" : "#e2e8f0",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="amount-input"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#94a3b8",
                marginBottom: "8px",
              }}
            >
              Or enter custom amount in INR (minimum ₹1):
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                ₹
              </span>
              <input
                id="amount-input"
                type="number"
                min="1"
                step="1"
                value={amountInr}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) setAmountInr(Math.max(1, val));
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 34px",
                  borderRadius: "8px",
                  border: "1px solid #374151",
                  backgroundColor: "#0f172a",
                  color: "#f8fafc",
                  fontSize: "15px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Order Summary */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "#0f172a",
              borderRadius: "10px",
              border: "1px solid #1e293b",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "14px",
                color: "#94a3b8",
                marginBottom: "8px",
              }}
            >
              <span>Product Description:</span>
              <span style={{ color: "#e2e8f0", fontWeight: 500 }}>
                LerenGO Standard Web Checkout
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "14px",
                color: "#94a3b8",
                marginBottom: "8px",
              }}
            >
              <span>Amount in Paise:</span>
              <span style={{ color: "#e2e8f0", fontWeight: 500 }}>
                {amountPaise} paise
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "16px",
                fontWeight: 700,
                color: "#f8fafc",
                paddingTop: "8px",
                borderTop: "1px solid #1e293b",
              }}
            >
              <span>Total Payable:</span>
              <span style={{ color: "#38bdf8" }}>₹{amountInr.toFixed(2)}</span>
            </div>
          </div>

          {/* Razorpay Standard Checkout Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <RazorpayCheckoutButton
              amountPaise={amountPaise}
              currency="INR"
              name="LerenGO"
              description={`Payment of ₹${amountInr.toFixed(0)}`}
              buttonText={`Pay ₹${amountInr.toFixed(0)} with Razorpay`}
              prefill={{
                name: "Test User",
                email: "test.student@lerengo.dev",
                contact: "+919876543210",
              }}
              onSuccess={(result) => {
                setLastPaymentResult(result);
              }}
            />
          </div>
        </div>

        {/* Verification Log */}
        {lastPaymentResult && (
          <div
            style={{
              marginTop: "24px",
              backgroundColor: "rgba(34, 197, 94, 0.08)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "15px",
                color: "#4ade80",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              ✓ Payment Verified Server-Side
            </h3>
            <div
              style={{
                fontSize: "13px",
                color: "#cbd5e1",
                fontFamily: "monospace",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div>
                <strong>Order ID:</strong> {lastPaymentResult.orderId}
              </div>
              <div>
                <strong>Payment ID:</strong> {lastPaymentResult.paymentId}
              </div>
              <div>
                <strong>HMAC Signature:</strong> {lastPaymentResult.signature}
              </div>
            </div>
          </div>
        )}

        {/* Policy & Security Note */}
        <div
          style={{
            marginTop: "32px",
            fontSize: "12px",
            color: "#64748b",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Protected by Razorpay 256-bit SSL encryption. All payments are verified
          server-side using HMAC-SHA256. See our{" "}
          <Link href="/terms" style={{ color: "#94a3b8", textDecoration: "underline" }}>
            Terms
          </Link>
          ,{" "}
          <Link href="/privacy" style={{ color: "#94a3b8", textDecoration: "underline" }}>
            Privacy Policy
          </Link>
          , and{" "}
          <Link
            href="/shipping-policy"
            style={{ color: "#94a3b8", textDecoration: "underline" }}
          >
            Shipping & Delivery Policy
          </Link>
          .
        </div>
      </div>
    </main>
  );
}

