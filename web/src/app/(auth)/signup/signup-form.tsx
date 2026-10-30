"use client";

import React, { useState, useTransition } from "react";
import { EyeIcon, EyeOffIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createSignupAccount } from "./actions";
import styles from "./signup-form.module.css";

interface SignUpFormProps {
  nextPath: string;
  errorMessage: string | null;
  googleHref: string;
  signInHref: string;
  heroTitle: string;
  heroBody: string;
}

export function SignUpForm({
  nextPath,
  errorMessage,
  googleHref,
  signInHref,
  heroTitle,
  heroBody,
}: SignUpFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createSignupAccount(formData);
    });
  };

  const heroWords = heroTitle.split(" ");

  return (
    <div className={styles.root}>
      {/* Editorial grid lines */}
      <div className={styles.gridLineV} />
      <div className={styles.gridLineH} />

      {/* Left Pane */}
      <div className={styles.leftPane}>
        <Link href="/" className={styles.brandLink}>
          <Image
            src="/logo.lerengo.embedded.svg"
            alt="LerenGO"
            width={562}
            height={303}
            className={styles.brandLogo}
            priority
          />
        </Link>

        <div className={styles.heroBlock}>
          <div>
            <span className={styles.eyebrow}>02 / Access Setup</span>
            <h1 className={styles.heroTitle}>
              {heroWords.map((word, i) => (
                <span
                  key={i}
                  className={i % 3 === 2 ? styles.heroWordAccent : styles.heroWord}
                >
                  {word}{" "}
                </span>
              ))}
            </h1>
          </div>
          <p className={styles.heroBody}>{heroBody}</p>
        </div>

        <div className={styles.footerRow}>
          <Link href="/" className={styles.footerLink}>
            <ArrowLeft width={14} height={14} />
            Back to homepage
          </Link>
          <span className={styles.footerDot}>•</span>
          <span>Integrated Platform Identity</span>
        </div>
      </div>

      {/* Right Pane */}
      <div className={styles.rightPane}>
        <div className={styles.card}>
          <div className={styles.cardInner}>
            <h2 className={styles.cardTitle}>Create account</h2>
            <p className={styles.cardDesc}>Establish your global credentials for LerenGO</p>

            {errorMessage && (
              <div className={styles.errorBanner}>{errorMessage}</div>
            )}

            {/* Social */}
            <div className={styles.socialRow}>
              <Link href={googleHref} className={styles.socialBtn}>
                <Image src="/google.png" alt="Google" width={16} height={16} className={styles.socialIcon} />
                Sign up with Google
              </Link>
            </div>

            <div className={styles.divider}>
              <hr className={styles.dividerLine} />
              <span className={styles.dividerText}>Or fill credentials</span>
              <hr className={styles.dividerLine} />
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <input type="hidden" name="next" value={nextPath} />

              <div className={styles.fieldGroup}>
                <label htmlFor="fullName" className={styles.label}>Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter full name"
                  required
                  autoComplete="name"
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="email" className={styles.label}>Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGrid}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="password" className={styles.label}>Password</label>
                  <div className={styles.inputWrap}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 chars"
                      required
                      autoComplete="new-password"
                      className={`${styles.input} ${styles.inputWithToggle}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.eyeToggle}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat password"
                    required
                    autoComplete="new-password"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.agreeRow}>
                <input
                  type="checkbox"
                  id="agree"
                  required
                  className={styles.checkInput}
                />
                <label htmlFor="agree" className={styles.agreeLabel}>
                  I agree to the{" "}
                  <Link href="/terms" className={styles.agreeLink}>Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/privacy" className={styles.agreeLink}>Privacy Policy</Link>.
                </label>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isPending}>
                {isPending ? (
                  <>
                    <span className={styles.spinner} />
                    Registering account...
                  </>
                ) : (
                  "Create free account"
                )}
              </button>
            </form>
          </div>

          <div className={styles.cardFooter}>
            <p className={styles.footerNote}>
              Already have an account?{" "}
              <Link href={signInHref} className={styles.footerNoteLink}>
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
