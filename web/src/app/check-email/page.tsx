import Image from "next/image";
import Link from "next/link";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import authStyles from "../(auth)/auth-flow.module.css";
import { resendSignupConfirmation } from "./actions";
import styles from "./check-email.module.css";

type Props = {
  searchParams: Promise<{
    email?: string;
    next?: string;
    notice?: string;
    error?: string;
  }>;
};

function getNoticeMessage(notice: string | undefined) {
  if (!notice) {
    return null;
  }

  if (notice === "signup_created") {
    return "Account created. Confirm your email before signing in.";
  }

  if (notice === "signin_unconfirmed") {
    return "Your account exists, but the email is not confirmed yet.";
  }

  if (notice === "resent") {
    return "A fresh confirmation email has been sent.";
  }

  return null;
}

function getErrorMessage(error: string | undefined) {
  if (!error) {
    return null;
  }

  if (error === "resend_rate_limited") {
    return "Too many resend attempts. Wait a minute, then try again.";
  }

  if (error === "resend_failed") {
    return "Could not resend the confirmation email. Check SMTP/auth settings and retry.";
  }

  return "Could not continue the confirmation flow. Try again.";
}

export default async function CheckEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/";
  const signInHref =
    nextPath === "/" ? "/signin" : `/signin?next=${encodeURIComponent(nextPath)}`;
  const signUpHref =
    nextPath === "/" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`;
  const noticeMessage = getNoticeMessage(params.notice);
  const errorMessage = getErrorMessage(params.error);

  return (
    <div className={authStyles.page}>
      <ScrollRevealController />
      <main className={authStyles.shell}>
        <header className={`${authStyles.topBar} ${authStyles.reveal}`} data-reveal>
          <Link href="/" aria-label="LerenGO home" className={authStyles.brand}>
            <Image
              src="/logo.lerengo.embedded.svg"
              alt="LerenGO"
              width={562}
              height={303}
              priority
            />
          </Link>
          <div className={authStyles.topActions}>
            <TransitionLink className={authStyles.signin} href={signUpHref}>
              Back
            </TransitionLink>
          </div>
        </header>

        <section className={`${authStyles.outerCard} ${authStyles.reveal} ${styles.authCard}`} data-reveal>
          <div className={styles.contentStack}>
            <div className={styles.heroBlock}>
              <span className={styles.eyebrow}>Check your inbox</span>
              <h1 className={authStyles.title}>Confirm your email</h1>
              <p className={`${authStyles.subtext} ${styles.heroSubtext}`}>
                LerenGO needs one email confirmation before password sign-in is allowed.
              </p>
            </div>

            {noticeMessage ? (
              <p className={`${styles.message} ${styles.messageSuccess}`}>{noticeMessage}</p>
            ) : null}
            {errorMessage ? (
              <p className={`${styles.message} ${styles.messageError}`}>{errorMessage}</p>
            ) : null}

            <section className={styles.formPanel}>
              <div className={styles.highlightCard}>
                <span className={styles.highlightLabel}>Confirmation email</span>
                <span className={styles.highlightValue}>
                  {email || "Use the same email you used during sign up"}
                </span>
              </div>

              <ol className={styles.stepList}>
                <li>Open the confirmation email from LerenGO or Supabase Auth.</li>
                <li>Click the confirmation link to activate the account.</li>
                <li>Return here and sign in with your email and password.</li>
              </ol>

              <div className={styles.actionRow}>
                {email ? (
                  <form action={resendSignupConfirmation} className={styles.buttonForm}>
                    <input name="email" type="hidden" value={email} />
                    <input name="next" type="hidden" value={nextPath} />
                    <button className={styles.primaryAction} type="submit">
                      Resend confirmation email
                    </button>
                  </form>
                ) : null}

                <TransitionLink className={styles.secondaryAction} href={signInHref}>
                  Open sign in
                </TransitionLink>
              </div>

              <p className={styles.helperText}>
                If you used the wrong email, go back to{" "}
                <TransitionLink className={styles.signinLink} href={signUpHref}>
                  sign up
                </TransitionLink>{" "}
                and create the account again.
              </p>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
