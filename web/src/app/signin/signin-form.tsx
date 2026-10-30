"use client";

import React, { useState, useTransition } from "react";
import { EyeIcon, EyeOffIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { signInWithPassword } from "./actions";
import styles from "./signin-form.module.css";

interface SignInFormProps {
  nextPath: string;
  errorMessage: string | null;
  noticeMessage: string | null;
  googleEnabled: boolean;
  googleHref: string;
  signUpHref: string;
  heroTitle: string;
  heroBody: string;
}

export function SignInForm({
  nextPath,
  errorMessage,
  noticeMessage,
  googleEnabled,
  googleHref,
  signUpHref,
  heroTitle,
  heroBody,
}: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await signInWithPassword(formData);
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
            <span className={styles.eyebrow}>01 / Secure Gate</span>
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
          <span>Global Access Identity</span>
        </div>
      </div>

      {/* Right Pane */}
      <div className={styles.rightPane}>
        <div className={styles.card}>
          <div className={styles.cardInner}>
            <h2 className={styles.cardTitle}>Welcome back</h2>
            <p className={styles.cardDesc}>Securely authenticate using your account credentials</p>

            {errorMessage && (
              <div className={styles.errorBanner}>{errorMessage}</div>
            )}
            {noticeMessage && (
              <div className={styles.noticeBanner}>{noticeMessage}</div>
            )}

            {/* Social */}
            <div className={styles.socialRow}>
              {googleEnabled ? (
                <Link href={googleHref} className={styles.socialBtn}>
                  <Image src="/google.png" alt="Google" width={16} height={16} className={styles.socialIcon} />
                  Continue with Google
                </Link>
              ) : (
                <div className={`${styles.socialBtn} ${styles.socialBtnDisabled}`}>
                  <Image src="/google.png" alt="Google" width={16} height={16} className={styles.socialIcon} style={{ filter: "grayscale(1)" }} />
                  Google Provider Disabled
                </div>
              )}
            </div>

            <div className={styles.divider}>
              <hr className={styles.dividerLine} />
              <span className={styles.dividerText}>Or password credentials</span>
              <hr className={styles.dividerLine} />
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <input type="hidden" name="next" value={nextPath} />

              <div className={styles.fieldGroup}>
                <label htmlFor="username" className={styles.label}>Email address</label>
                <input
                  id="username"
                  name="username"
                  type="email"
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.fieldRow}>
                  <label htmlFor="password" className={styles.label}>Password</label>
                  <button
                    type="button"
                    className={styles.forgotLink}
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password reset is managed via administrators or OTP flow.");
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className={styles.inputWrap}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
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

              <div className={styles.checkRow}>
                <input
                  type="checkbox"
                  id="remember"
                  name="rememberMe"
                  className={styles.checkInput}
                />
                <label htmlFor="remember" className={styles.checkLabel}>
                  Remember session details
                </label>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isPending}>
                {isPending ? (
                  <>
                    <span className={styles.spinner} />
                    Signing in...
                  </>
                ) : (
                  "Sign in to account"
                )}
              </button>
            </form>
          </div>

          <div className={styles.cardFooter}>
            <p className={styles.footerNote}>
              Don&apos;t have an account yet?{" "}
              <Link href={signUpHref} className={styles.footerNoteLink}>
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
