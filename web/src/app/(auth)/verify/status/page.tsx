import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { VerificationStatus } from "@/lib/supabase/types";
import styles from "../../auth-flow.module.css";
import statusStyles from "./status.module.css";
import { StatusAutoRefresh } from "./status-auto-refresh";

type Props = {
  searchParams: Promise<{
    request_id?: string;
  }>;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toReasonLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function getReasonHighlights(reasons: unknown) {
  if (!reasons || typeof reasons !== "object" || Array.isArray(reasons)) {
    return { attention: [] as string[], passed: [] as string[] };
  }

  const entries = Object.entries(reasons as Record<string, unknown>);
  const attention = entries
    .filter(([, result]) => result === false)
    .map(([key]) => toReasonLabel(key));
  const passed = entries
    .filter(([, result]) => result === true)
    .map(([key]) => toReasonLabel(key));

  return { attention, passed };
}

export default async function VerificationStatusPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  let user: { id: string } | null = null;
  let authError: { message: string } | null = null;

  try {
    const response = await supabase.auth.getUser();
    user = response.data.user ? { id: response.data.user.id } : null;
    authError = response.error ? { message: response.error.message } : null;
  } catch {
    authError = { message: "Auth fetch failed." };
  }

  if (authError || !user) {
    redirect("/signin?next=%2Fverify%2Fstatus");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, university_id, verified")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.university_id) {
    redirect("/onboarding/university");
  }

  const requestQuery = supabase
    .from("verification_requests")
    .select("id, status, score, reasons, decided_at, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const requestResult = params.request_id
    ? await supabase
        .from("verification_requests")
        .select("id, status, score, reasons, decided_at, created_at")
        .eq("id", params.request_id)
        .eq("user_id", profile.id)
        .maybeSingle()
    : await requestQuery.maybeSingle();

  if (requestResult.error) {
    throw new Error(requestResult.error.message);
  }

  const request = requestResult.data;
  const status: VerificationStatus =
    profile.verified === true
      ? "approved"
      : request?.status === "rejected"
        ? "rejected"
        : "pending";

  if (status === "approved") {
    redirect("/campus-network");
  }

  const titleByStatus: Record<VerificationStatus, string> = {
    approved: "Verified",
    pending: "Verification in review",
    rejected: "Verification not approved",
  };

  const messageByStatus: Record<VerificationStatus, string> = {
    approved: "Access is unlocked for your campus workspace.",
    pending: "Your submission is in the campus admin verification queue.",
    rejected: "Your upload did not meet the verification checks.",
  };
  const subtitleByStatus: Record<VerificationStatus, string> = {
    approved: "You can continue with notes, doubts, and CampusGO access now.",
    pending: "You can refresh status later or complete verification through university email OTP.",
    rejected: "Retry with a clearer ID image or verify through university email OTP.",
  };
  const statusClassByType: Record<VerificationStatus, string> = {
    approved: statusStyles.approved,
    pending: statusStyles.pending,
    rejected: statusStyles.rejected,
  };
  const score =
    typeof request?.score === "number" && Number.isFinite(request.score)
      ? request.score
      : null;
  const reasonHighlights = getReasonHighlights(request?.reasons);
  const refreshHref = request?.id
    ? `/verify/status?request_id=${encodeURIComponent(request.id)}`
    : "/verify/status";

  return (
    <div className={styles.page}>
      <ScrollRevealController />
      <main className={styles.shell}>
        <header className={`${styles.topBar} ${styles.reveal}`} data-reveal>
          <Link href="/" aria-label="LerenGO home" className={styles.brand}>
            <Image src="/logo.lerengo.embedded.svg" alt="LerenGO" width={562} height={303} priority />
          </Link>
          <div className={styles.topActions}>
            <span className={styles.stepLabel}>Review</span>
            <TransitionLink className={styles.signin} href="/verify">
              Verification
            </TransitionLink>
          </div>
        </header>

        <section className={`${styles.outerCard} ${styles.reveal}`} data-reveal>
          <div className={styles.chipRowCenter}>
            <p className={styles.stepChip}>Step 3 of 3</p>
          </div>

          <h1 className={styles.title}>Verification status</h1>
          <p className={styles.subtext}>{subtitleByStatus[status]}</p>

          <section className={`${styles.panel} ${statusStyles.statusPanel} ${styles.reveal}`} data-reveal>
            <div className={statusStyles.heroRow}>
              <p
                className={`${statusStyles.statusPill} ${statusClassByType[status]}`}
              >
                {titleByStatus[status]}
              </p>
              {score !== null ? (
                <p className={statusStyles.scorePill}>Score {score} / 100</p>
              ) : null}
            </div>

            <p className={statusStyles.summary}>{messageByStatus[status]}</p>

            <div className={statusStyles.metaGrid}>
              <article className={statusStyles.metaCard}>
                <p className={statusStyles.metaLabel}>Submitted</p>
                <p className={statusStyles.metaValue}>
                  {formatDateTime(request?.created_at)}
                </p>
              </article>
              <article className={statusStyles.metaCard}>
                <p className={statusStyles.metaLabel}>Last review</p>
                <p className={statusStyles.metaValue}>
                  {formatDateTime(request?.decided_at)}
                </p>
              </article>
              <article className={statusStyles.metaCard}>
                <p className={statusStyles.metaLabel}>Current state</p>
                <p className={statusStyles.metaValue}>{titleByStatus[status]}</p>
              </article>
            </div>

            {reasonHighlights.attention.length > 0 ? (
              <section className={statusStyles.reasonSection}>
                <h2 className={statusStyles.reasonTitle}>Needs attention</h2>
                <ul className={statusStyles.reasonList}>
                  {reasonHighlights.attention.slice(0, 4).map((reason) => (
                    <li className={`${statusStyles.reasonItem} ${statusStyles.reasonBad}`} key={reason}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {reasonHighlights.passed.length > 0 ? (
              <section className={statusStyles.reasonSection}>
                <h2 className={statusStyles.reasonTitle}>Checks passed</h2>
                <ul className={statusStyles.reasonList}>
                  {reasonHighlights.passed.slice(0, 4).map((reason) => (
                    <li className={`${statusStyles.reasonItem} ${statusStyles.reasonGood}`} key={reason}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <StatusAutoRefresh
              enabled={status === "pending"}
              requestId={request?.id ?? null}
            />

            <div className={styles.actions}>
              {status === "pending" ? (
                <TransitionLink className={styles.primaryBtn} href={refreshHref}>
                  Refresh status
                </TransitionLink>
              ) : (
                <TransitionLink className={styles.primaryBtn} href="/verify">
                  Retry verification
                </TransitionLink>
              )}

              {status === "pending" ? (
                <TransitionLink className={styles.secondaryBtn} href="/verify">
                  Continue verification
                </TransitionLink>
              ) : (
                <TransitionLink className={styles.secondaryBtn} href="/verify">
                  Retry with new upload
                </TransitionLink>
              )}

              <TransitionLink className={styles.mutedText} href="/onboarding/university">
                Change university
              </TransitionLink>
            </div>
          </section>

        </section>
      </main>
    </div>
  );
}
