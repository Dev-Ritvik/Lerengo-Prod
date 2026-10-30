"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../auth-flow.module.css";

type UploadResponse = {
  request_id: string;
  score: number;
  status: "pending" | "approved" | "rejected";
};

type VerifyEmailResponse = {
  success: boolean;
  email?: string;
};

type Props = {
  currentEmail: string;
  demoMode?: boolean;
  nextPath?: string;
  universityDomain: string | null;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

async function parseApiPayload<T>(
  response: Response,
): Promise<T & { error?: string }> {
  const responseText = await response.text();
  if (!responseText) {
    return {} as T & { error?: string };
  }

  try {
    return JSON.parse(responseText) as T & { error?: string };
  } catch {
    if (response.ok) {
      return { error: "Unexpected server response." } as T & { error?: string };
    }

    return {
      error: `Request failed with status ${response.status}.`,
    } as T & { error?: string };
  }
}

export function VerifyUploadClient({
  currentEmail,
  demoMode = false,
  nextPath = "/campus-network",
  universityDomain,
}: Props) {
  const router = useRouter();
  const dragDepthRef = useRef(0);
  const [emailInput, setEmailInput] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [regIdInput, setRegIdInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canUseUniversityEmail = useMemo(() => {
    if (!universityDomain) {
      return false;
    }

    return emailInput.toLowerCase().endsWith(`@${universityDomain.toLowerCase()}`);
  }, [emailInput, universityDomain]);

  const resolvedNextPath = useMemo(() => {
    if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
      return "/campus-network";
    }

    return nextPath;
  }, [nextPath]);

  const emailExample = useMemo(() => {
    if (universityDomain) {
      return `student@${universityDomain.toLowerCase()}`;
    }

    const fallbackDomain = currentEmail.split("@")[1]?.toLowerCase();
    return fallbackDomain ? `student@${fallbackDomain}` : "student@university.edu";
  }, [currentEmail, universityDomain]);

  const accountEmailNotice = useMemo(() => {
    if (!currentEmail) {
      return null;
    }

    if (universityDomain && !currentEmail.toLowerCase().endsWith(`@${universityDomain.toLowerCase()}`)) {
      return `Signed in as ${currentEmail}. Enter your university-issued email below for OTP verification.`;
    }

    return `Signed in as ${currentEmail}. You can verify with the same university email below.`;
  }, [currentEmail, universityDomain]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = window.URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      window.URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  function validateIdFile(inputFile: File) {
    const normalizedType = inputFile.type.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(normalizedType)) {
      return "Only JPG, PNG, or WEBP images are allowed.";
    }

    if (inputFile.size > MAX_FILE_BYTES) {
      return "Image size exceeds 8MB limit.";
    }

    return null;
  }

  function setSelectedFile(inputFile: File | null) {
    if (!inputFile) {
      setFile(null);
      return;
    }

    const validationError = validateIdFile(inputFile);
    if (validationError) {
      setUploadErrorMessage(validationError);
      setUploadSuccessMessage(null);
      setFile(null);
      return;
    }

    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);
    setFile(inputFile);
  }

  function handleDragEnter(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    setSelectedFile(droppedFile);
  }

  async function handleSendEmailOtp() {
    setOtpErrorMessage(null);
    setOtpSuccessMessage(null);

    if (demoMode) {
      if (!emailInput.trim()) {
        setOtpErrorMessage("Enter your university email first.");
        return;
      }

      setOtpSent(true);
      setOtpEmail(emailInput.trim());
      setOtpSuccessMessage("Demo mode active. Enter any 6-digit OTP to continue.");
      return;
    }

    if (!emailInput.trim()) {
      setOtpErrorMessage("Enter your university email first.");
      return;
    }

    if (!universityDomain) {
      setOtpErrorMessage("No university email domain configured for this campus.");
      return;
    }

    if (!canUseUniversityEmail) {
      setOtpErrorMessage(`Email must end with @${universityDomain}.`);
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch("/api/verify/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailInput.trim(),
        }),
      });

      const payload = await parseApiPayload<Partial<VerifyEmailResponse>>(response);

      if (!response.ok || !payload.success) {
        setOtpErrorMessage(payload.error ?? "Could not send OTP.");
        return;
      }

      setOtpSent(true);
      setOtpEmail(emailInput.trim());
      setOtpSuccessMessage(`OTP sent to ${emailInput.trim()}.`);
    } catch {
      setOtpErrorMessage("Could not send OTP. Check your connection and try again.");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyEmailOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOtpErrorMessage(null);
    setOtpSuccessMessage(null);

    const normalizedCode = otpCode.trim();
    if (normalizedCode.length < 4) {
      setOtpErrorMessage("Enter the OTP code sent to your university email.");
      return;
    }

    if (demoMode) {
      const demoTarget = resolvedNextPath.includes("?")
        ? `${resolvedNextPath}&demo=1`
        : `${resolvedNextPath}?demo=1`;
      router.push(demoTarget);
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch("/api/verify/email/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: normalizedCode,
          email: otpEmail || emailInput.trim(),
        }),
      });

      const payload = await parseApiPayload<Partial<VerifyEmailResponse>>(response);

      if (!response.ok || !payload.success) {
        setOtpErrorMessage(payload.error ?? "OTP verification failed.");
        return;
      }

      setOtpSuccessMessage("Email verified successfully.");
      router.push(resolvedNextPath);
    } catch {
      setOtpErrorMessage("Could not verify OTP. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleUploadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoMode) {
      setUploadErrorMessage(null);
      setUploadSuccessMessage("Preview mode enabled. Connect auth keys to submit verification.");
      return;
    }

    if (!file) {
      setUploadErrorMessage("Please upload your university ID front image.");
      return;
    }

    const validationError = validateIdFile(file);
    if (validationError) {
      setUploadErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("idFront", file);
      if (regIdInput.trim()) {
        formData.append("regId", regIdInput.trim());
      }

      const response = await fetch("/api/verify/upload", {
        body: formData,
        method: "POST",
      });

      const payload = await parseApiPayload<Partial<UploadResponse>>(response);

      if (!response.ok || !payload.request_id || !payload.status) {
        setUploadErrorMessage(payload.error ?? "Verification upload failed.");
        return;
      }

      if (payload.status === "pending") {
        setUploadSuccessMessage("Uploaded. Verification is in progress.");
        router.push(
          `/verify/status?request_id=${encodeURIComponent(payload.request_id)}`,
        );
        return;
      }

      if (payload.status === "approved") {
        setUploadSuccessMessage("Verification approved. Redirecting to CampusGO...");
        router.push(resolvedNextPath);
        return;
      }

      router.push(
        `/verify/status?request_id=${encodeURIComponent(payload.request_id)}`,
      );
    } catch {
      setUploadErrorMessage("Verification upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      {demoMode ? (
        <p className={styles.notice}>
          Preview mode is active. Real OTP emails are disabled; use any 6-digit code.
        </p>
      ) : null}
      <h3 className={styles.panelTitle}>Verify via student email ID</h3>
      <p className={styles.panelSubtext}>Use your official university student email address.</p>
      {accountEmailNotice ? <p className={styles.centerMuted}>{accountEmailNotice}</p> : null}
      <input
        className={styles.input}
        name="universityEmail"
        onChange={(event) => setEmailInput(event.target.value)}
        placeholder={emailExample}
        type="email"
        value={emailInput}
      />
      <button
        className={`${styles.primaryBtn} ${styles.centerButton}`}
        disabled={isSendingOtp}
        onClick={handleSendEmailOtp}
        type="button"
      >
        {isSendingOtp ? "Sending OTP..." : "Send OTP"}
      </button>
      <p className={styles.centerMuted}>
        {universityDomain
          ? `Example: ${emailExample}`
          : "Use the email issued by your university."}
      </p>
      {otpErrorMessage ? <p className={styles.error}>{otpErrorMessage}</p> : null}
      {otpSuccessMessage ? <p className={styles.success}>{otpSuccessMessage}</p> : null}

      {otpSent ? (
        <form className={styles.otpPanel} onSubmit={handleVerifyEmailOtp}>
          <label className={styles.label} htmlFor="otpCode">
            Enter OTP
          </label>
          <div className={styles.otpRow}>
            <input
              className={`${styles.input} ${styles.otpInput}`}
              id="otpCode"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setOtpCode(event.target.value)}
              pattern="[0-9]*"
              placeholder="6-digit code"
              type="text"
              value={otpCode}
            />
            <button className={styles.primaryBtn} disabled={isVerifyingOtp} type="submit">
              {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
          <p className={styles.centerMuted}>Code sent to {otpEmail}.</p>
        </form>
      ) : null}

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span>OR</span>
        <span className={styles.dividerLine} />
      </div>

      <h3 className={styles.panelTitle}>Verify via ID card</h3>
      <p className={styles.panelSubtext}>Upload the front side of your ID card.</p>

      <form className={`${styles.form} ${styles.uploadForm}`} onSubmit={handleUploadSubmit}>
        <label className={styles.label} htmlFor="regId">
          Registration ID (as on card)
        </label>
        <input
          className={styles.input}
          id="regId"
          maxLength={40}
          name="regId"
          onChange={(event) => setRegIdInput(event.target.value.toUpperCase())}
          placeholder="Example: 1234567890"
          type="text"
          value={regIdInput}
        />
        <p className={styles.centerMuted}>
          Helps us match your submission with campus ID format.
        </p>

        <label
          className={`${styles.uploadArea} ${isDragActive ? styles.uploadAreaActive : ""}`}
          htmlFor="idFront"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <span className={styles.uploadIcon} aria-hidden="true" />
          <span className={styles.uploadCopy}>
            <strong>Drag and drop your ID image</strong>
            <span>or choose from your device</span>
          </span>
          <span className={styles.uploadCta}>Select image</span>
          <input
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className={styles.fileInput}
            id="idFront"
            name="idFront"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] ?? null;
              setSelectedFile(selectedFile);
            }}
            required={!demoMode}
            type="file"
          />
        </label>

        {file && previewUrl ? (
          <div className={styles.previewWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Selected ID preview"
              className={styles.previewImage}
              src={previewUrl}
            />
            <div className={styles.previewMeta}>
              <p className={styles.previewTitle}>{file.name}</p>
              <p className={styles.uploadMeta}>
                {(file.size / 1024).toFixed(1)} KB | {file.type || "image"}
              </p>
              <div className={styles.previewActions}>
                <span className={styles.previewBadge}>Ready to submit</span>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => setSelectedFile(null)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className={styles.uploadMeta}>No image selected yet.</p>
        )}

        <div className={styles.checkRow}>
          <span className={styles.checkItem}>Corners clear</span>
          <span className={styles.checkItem}>No glare</span>
          <span className={styles.checkItem}>Text readable</span>
        </div>

        <button
          className={`${styles.primaryBtn} ${styles.centerButton}`}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Submitting..." : "Submit for verification"}
        </button>
      </form>

      {uploadErrorMessage ? <p className={styles.error}>{uploadErrorMessage}</p> : null}
      {uploadSuccessMessage ? <p className={styles.success}>{uploadSuccessMessage}</p> : null}
      <p className={styles.centerMuted}>
        ID images are used only for verification and removed after approval.
      </p>
    </div>
  );
}

