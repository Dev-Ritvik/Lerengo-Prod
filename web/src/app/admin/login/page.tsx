import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuthShell } from "../admin-auth-shell";
import styles from "../admin-auth-shell.module.css";
import { sendAdminOtpLink } from "./actions";
import {
  resolveAppUrl,
  resolveCampusNetworkAppUrl,
  resolveCoursesAppUrl,
  resolveLabsAppUrl,
} from "@/lib/app-url";
import { getSessionUser } from "@/lib/tenant";

type Props = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    email?: string;
    userId?: string;
  }>;
};

function getErrorMessage(error: string | undefined) {
  if (!error) {
    return null;
  }

  if (error === "missing_credentials" || error === "email_required") {
    return "Enter the verified admin email address.";
  }

  if (error === "invalid_credentials") {
    return "This email is not approved for admin access.";
  }

  if (error === "password_signin_failed" || error === "reset_failed" || error === "recovery_required") {
    return "Admin sign-in now starts only from the email verification link.";
  }

  if (error === "not_admin") {
    return "This account is not approved for admin access.";
  }

  if (error === "not_verified") {
    return "Your admin account is not verified yet.";
  }

  if (error === "otp_failed") {
    return "Could not send the one-time admin access link. Retry after checking the verified admin email.";
  }

  return "Admin sign-in failed. Please retry.";
}

function getNoticeMessage(notice: string | undefined) {
  if (notice === "otp_sent") {
    return "One-time admin access link sent. Open it from the same verified admin inbox.";
  }

  return null;
}

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const appUrl = resolveAppUrl();
  const campusNetworkUrl = resolveCampusNetworkAppUrl();
  const coursesUrl = resolveCoursesAppUrl();
  const labsUrl = resolveLabsAppUrl();
  const defaultEmail =
    typeof params.email === "string"
      ? params.email.trim().toLowerCase()
      : typeof params.userId === "string"
        ? params.userId.trim().toLowerCase()
        : "";
  const errorMessage = getErrorMessage(params.error);
  const noticeMessage = getNoticeMessage(params.notice);

  const session = await getSessionUser();
  if (session) {
    const { data: profile } = await session.supabase
      .from("users")
      .select("role, verified")
      .eq("id", session.authUser.id)
      .maybeSingle();

    if (profile?.role === "admin" && profile?.verified) {
      redirect("/admin/surfaces");
    }

    if (profile?.role !== "admin") {
      redirect(
        `/admin/request-access?reason=not_admin&email=${encodeURIComponent(
          session.authUser.email ?? "",
        )}`,
      );
    }

    if (!profile?.verified) {
      redirect(
        `/admin/request-access?reason=not_verified&email=${encodeURIComponent(
          session.authUser.email ?? "",
        )}`,
      );
    }
  }

  return (
    <AdminAuthShell
      backHref={appUrl}
      backLabel="Back to main site"
      checklist={[
        "Admin access starts only from a verified one-time link sent to the approved admin email.",
        "After OTP verification, choose whether you are entering CampusGO operations, SkillGO operations, or ForgeGO operations.",
        "There is no public admin signup or password-first flow on this surface anymore.",
      ]}
      chips={["OTP only", "Verified admin email", "Separate control plane"]}
      description="Sign in to the isolated admin lane with the one-time link sent to the approved admin inbox."
      eyebrow="Admin access"
      spotlightBody="The admin host is intentionally separate from the student product. The link arrives in the approved admin inbox, then the workspace lane is chosen after verification."
      spotlightEyebrow="Control plane"
      spotlightTitle="Admin sign in now starts with email verification, not password entry."
      title="Verify admin email and continue"
    >
      <div>
        <p className={styles.panelEyebrow}>Admin email verification</p>
        <h2 className={styles.panelTitle}>The admin lane opens only after OTP verification</h2>
        <p className={styles.panelCopy}>
          Enter the approved admin email. We send a one-time sign-in link, then you choose whether
          to open the CampusGO admin lane, the SkillGO admin lane, or the ForgeGO admin lane.
        </p>
      </div>

      {noticeMessage ? <p className={`${styles.message} ${styles.notice}`}>{noticeMessage}</p> : null}
      {errorMessage ? <p className={`${styles.message} ${styles.error}`}>{errorMessage}</p> : null}

      <div className={styles.optionGrid}>
        <article className={styles.optionCard}>
          <div className={styles.optionHeader}>
            <p className={styles.panelEyebrow}>CampusGO</p>
            <span className={styles.optionBadge}>Ops lane</span>
          </div>
          <h3 className={styles.optionTitle}>
            Notes, verification, community, mentorship, and weekly campus control.
          </h3>
          <p className={styles.optionBody}>
            This lane is for moderation, student verification pressure, notes management, mentor approvals,
            and campus activity signals.
          </p>
          <a className={styles.optionLink} href={campusNetworkUrl}>
            Open live CampusGO
          </a>
        </article>

        <article className={styles.optionCard}>
          <div className={styles.optionHeader}>
            <p className={styles.panelEyebrow}>SkillGO</p>
            <span className={styles.optionBadge}>Ops lane</span>
          </div>
          <h3 className={styles.optionTitle}>
            Catalog, private videos, assessments, certificates, and enrollment flow.
          </h3>
          <p className={styles.optionBody}>
            This lane is for paid course operations, lesson structure, private video delivery,
            assessment setup, and course-side publishing.
          </p>
          <a className={styles.optionLink} href={coursesUrl}>
            Open live SkillGO
          </a>
        </article>

        <article className={styles.optionCard}>
          <div className={styles.optionHeader}>
            <p className={styles.panelEyebrow}>ForgeGO</p>
            <span className={styles.optionBadge}>Ops lane</span>
          </div>
          <h3 className={styles.optionTitle}>
            Idea intake, research routing, patent guidance, publication support, and build review.
          </h3>
          <p className={styles.optionBody}>
            This lane is for reviewing incoming ideas, classifying serious submissions,
            and moving accepted work into research, prototype, publication, or patent tracks.
          </p>
          <a className={styles.optionLink} href={labsUrl}>
            Open live ForgeGO
          </a>
        </article>
      </div>

      <form className={styles.form} action={sendAdminOtpLink}>
        <label className={styles.label} htmlFor="admin-email">
          Verified admin email
        </label>
        <input
          autoComplete="email"
          className={styles.input}
          defaultValue={defaultEmail}
          id="admin-email"
          name="email"
          placeholder="admin@youruniversity.edu"
          required
          type="email"
        />

        <button className={styles.primaryButton} type="submit">
          Verify email and send sign-in link
        </button>
      </form>

      <div className={styles.helperStack}>
        <div className={styles.helperRow}>
          <span>Platform superadmin?</span>
          <Link className={styles.helperLink} href="/admin/control/login">
            Open the control plane
          </Link>
        </div>
        <div className={styles.helperRow}>
          <span>Need admin approval?</span>
          <Link className={styles.helperLink} href="/admin/request-access">
            Request admin access
          </Link>
        </div>
        <div className={styles.helperRow}>
          <span>Need campus access instead?</span>
          <Link className={styles.helperLink} href={`${appUrl}/signin`}>
            Go to user sign in
          </Link>
        </div>
      </div>
    </AdminAuthShell>
  );
}
