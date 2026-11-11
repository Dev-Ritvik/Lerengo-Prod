"use client";

import { useEffect, useState } from "react";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayError = {
  code: string;
  description: string;
  source?: string;
  step?: string;
  reason?: string;
};

export type RazorpayCheckoutProps = {
  amountPaise?: number; // Minimum 100 paise (₹1)
  currency?: string;
  receipt?: string;
  name?: string;
  description?: string;
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  buttonText?: string;
  className?: string;
  onSuccess?: (data: { orderId: string; paymentId: string; signature: string }) => void;
  onError?: (error: string) => void;
  onDismiss?: () => void;
};

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayCheckoutButton({
  amountPaise = 50000, // ₹500 default
  currency = "INR",
  receipt,
  name = "LerenGO",
  description = "Standard Web Checkout",
  notes,
  prefill,
  buttonText,
  className,
  onSuccess,
  onError,
  onDismiss,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    // Preload checkout script
    loadScript("https://checkout.razorpay.com/v1/checkout.js");
  }, []);

  async function handleCheckout() {
    setStatusMessage(null);
    setLoading(true);

    try {
      // 1. Ensure Razorpay checkout.js script is loaded
      const isLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!isLoaded || !(window as any).Razorpay) {
        const errMsg = "Failed to load Razorpay checkout script. Please check your internet connection.";
        setStatusMessage({ type: "error", text: errMsg });
        onError?.(errMsg);
        setLoading(false);
        return;
      }

      // 2. Step 1: Call Backend to Create Order
      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes,
        }),
      });

      const orderData = await orderRes.json().catch(() => null);

      if (!orderRes.ok || !orderData?.order_id) {
        const errMsg = orderData?.error || `Failed to create order (HTTP ${orderRes.status})`;
        setStatusMessage({ type: "error", text: errMsg });
        onError?.(errMsg);
        setLoading(false);
        return;
      }

      const keyId =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        orderData.key ||
        "";

      // 3. Step 2: Open Razorpay Payment Modal
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name,
        description,
        order_id: orderData.order_id,
        prefill: {
          name: prefill?.name || "",
          email: prefill?.email || "",
          contact: prefill?.contact || "",
        },
        notes: notes || {},
        theme: {
          color: "#2563eb",
        },
        handler: async function (response: RazorpayResponse) {
          // 4. Step 3: Send verification payload to backend
          setLoading(true);
          setStatusMessage({
            type: "info",
            text: "Payment captured. Verifying signature...",
          });

          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json().catch(() => null);

            if (verifyRes.ok && verifyData?.success) {
              const successText = `Payment successful! Payment ID: ${response.razorpay_payment_id}`;
              setStatusMessage({ type: "success", text: successText });
              onSuccess?.({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
            } else {
              const errMsg =
                verifyData?.error || "Signature verification failed. Payment not confirmed.";
              setStatusMessage({ type: "error", text: errMsg });
              onError?.(errMsg);
            }
          } catch {
            const errMsg = "Network error verifying payment with server.";
            setStatusMessage({ type: "error", text: errMsg });
            onError?.(errMsg);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            // Handle user cancel / dismiss
            setLoading(false);
            setStatusMessage({
              type: "info",
              text: "Checkout cancelled by user.",
            });
            onDismiss?.();
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);

      // Handle payment.failed event
      razorpayInstance.on("payment.failed", function (response: { error: RazorpayError }) {
        setLoading(false);
        const errMsg =
          response.error?.description ||
          response.error?.reason ||
          "Payment transaction failed.";
        setStatusMessage({ type: "error", text: `Payment Failed: ${errMsg}` });
        onError?.(errMsg);
      });

      razorpayInstance.open();
    } catch (err: any) {
      setLoading(false);
      const errMsg = err?.message || "An unexpected error occurred during checkout.";
      setStatusMessage({ type: "error", text: errMsg });
      onError?.(errMsg);
    }
  }

  const defaultBtnText = buttonText || `Pay ₹${(amountPaise / 100).toFixed(0)} with Razorpay`;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: "8px" }}>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={className}
        style={
          className
            ? undefined
            : {
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.2s ease",
              }
        }
      >
        {loading ? (
          <>
            <span
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                borderTopColor: "#ffffff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                display: "inline-block",
              }}
            />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 512 512"
              fill="currentColor"
              style={{ flexShrink: 0 }}
            >
              <polygon points="448,32 304,32 176,288 320,288" />
              <polygon points="336,224 192,224 64,480 208,480" />
            </svg>
            <span>{defaultBtnText}</span>
          </>
        )}
      </button>

      {statusMessage && (
        <div
          role="alert"
          style={{
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "13px",
            lineHeight: 1.4,
            fontWeight: 500,
            marginTop: "4px",
            backgroundColor:
              statusMessage.type === "success"
                ? "rgba(34, 197, 94, 0.12)"
                : statusMessage.type === "error"
                  ? "rgba(239, 68, 68, 0.12)"
                  : "rgba(59, 130, 246, 0.12)",
            color:
              statusMessage.type === "success"
                ? "#16a34a"
                : statusMessage.type === "error"
                  ? "#dc2626"
                  : "#2563eb",
            border: `1px solid ${
              statusMessage.type === "success"
                ? "rgba(34, 197, 94, 0.3)"
                : statusMessage.type === "error"
                  ? "rgba(239, 68, 68, 0.3)"
                  : "rgba(59, 130, 246, 0.3)"
            }`,
          }}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}

