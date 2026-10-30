import Link from "next/link";
import { AdminAuthShell } from "../admin-auth-shell";
import styles from "../admin-auth-shell.module.css";
import { resolveAppUrl } from "@/lib/app-url";

type Props = {
  searchParams: Promise<{
    reason?: string;
    email?: string;
  }>;
};

function getReasonMessage(reason: string | undefined) {
  if (reason === "not_verified") {
    return "Your account exists, but admin access has not been verified yet.";
  }

  if (reason === "not_admin") {
    return "This email is not attached to an approved admin account.";
  }

  if (reason === "admin_not_provisioned") {
    return "This account has an admin role but is not fully provisioned for the production admin workspace yet.";
  }

  return "Only verified campus admins can continue to the admin workspace.";
}

export default async function AdminRequestAccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const appUrl = resolveAppUrl();
  const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const supportEmail = process.env.SMTP_USER?.trim() || "lerengo.org@gmail.com";
  const subject = encodeURIComponent("Admin access request for LerenGO");
  const body = encodeURIComponent(
    [
      "Hello LerenGO team,",
      "",
      "I need verified admin access for the admin workspace.",
      "",
      `Email: ${email || "[add your email here]"}`,
      "University:",
      "Reason for access:",
      "",
      "Regards,",
    ].join("\n"),
  );
  const requestHref = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

  return (
    <AdminAuthShell
      backHref="/admin/login"
      backLabel="Back to admin login"
      checklist={[
        "Admin access is manual because moderation and verification permissions are sensitive.",
        "Use the campus email that should be attached to the admin account.",
        "Once approved, you sign in by verifying the one-time link sent to the admin inbox.",
      ]}
      chips={["Manual approval", "Campus email", "Separate admin flow"]}
      description={getReasonMessage(params.reason)}
      eyebrow="Admin sign up"
      spotlightBody="There is no open self-serve admin signup. This route exists to request verified access and keep admin onboarding explicit before OTP-based admin sign-in."
      spotlightEyebrow="Access request"
      spotlightTitle="Admin sign up is really an approval workflow."
      title="Request verified admin access"
    >
      <div>
        <p className={styles.panelEyebrow}>What to do next</p>
        <h2 className={styles.panelTitle}>Send the access request from the right inbox</h2>
        <p className={styles.panelCopy}>Admin access is granted manually. Send the request from your campus email so the operations team can verify it.</p>
      </div>

      <p className={`${styles.message} ${styles.notice}`}>
        {email
          ? `We checked ${email} and it is not ready for admin sign in yet.`
          : "Use the request link below if you need admin approval."}
      </p>

      <div className={styles.actionGrid}>
        <a className={styles.primaryButton} href={requestHref}>
          Email admin access request
        </a>
        <Link className={styles.secondaryButton} href={`${appUrl}/signin`}>
          Go to user sign in
        </Link>
      </div>

      <div className={styles.helperStack}>
        <div className={styles.helperRow}>
          <span>Already approved?</span>
          <Link className={styles.helperLink} href="/admin/login">
            Try admin login again
          </Link>
        </div>
      </div>
    </AdminAuthShell>
  );
}
