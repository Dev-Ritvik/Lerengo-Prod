"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CertificateLookupForm() {
  const router = useRouter();
  const [certificateNumber, setCertificateNumber] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = certificateNumber.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/certificates/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 28,
      }}
    >
      <label
        htmlFor="certificate-number"
        style={{
          color: "rgba(160, 180, 220, 0.85)",
          fontSize: "0.85rem",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Certificate number
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <input
          id="certificate-number"
          name="certificateNumber"
          value={certificateNumber}
          onChange={(event) => setCertificateNumber(event.target.value)}
          placeholder="e.g. LG-CERT-2026-0001"
          autoComplete="off"
          required
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: 999,
            color: "#f0f4ff",
            flex: "1 1 260px",
            fontSize: "1rem",
            minHeight: 52,
            padding: "0 20px",
          }}
        />
        <button
          type="submit"
          style={{
            background: "linear-gradient(135deg, #96a1ab 0%, #7a8590 100%)",
            border: "1px solid rgba(150, 161, 171, 0.4)",
            borderRadius: 999,
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "0.96rem",
            fontWeight: 800,
            minHeight: 52,
            padding: "0 28px",
          }}
        >
          Verify
        </button>
      </div>
    </form>
  );
}
