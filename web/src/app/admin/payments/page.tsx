import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import styles from "../workspace.module.css";

function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const { appUser, supabase } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const [{ data: university, error: universityError }, { data: notes, error: notesError }] =
    await Promise.all([
      supabase.from("universities").select("name").eq("id", appUser.university_id).maybeSingle(),
      admin.from("notes").select("id, title").eq("university_id", appUser.university_id),
    ]);

  if (universityError || notesError) {
    throw new Error(universityError?.message || notesError?.message || "Failed to load payments.");
  }

  const noteIds = ((notes ?? []) as any[]).map((item: any) => item.id);
  const noteTitleById = new Map(((notes ?? []) as any[]).map((item: any) => [item.id, item.title]));

  const { data: payments, error: paymentsError } = noteIds.length
    ? await admin
        .from("payments")
        .select("id, user_id, note_id, amount_paise, status, razorpay_order_id, razorpay_payment_id, created_at")
        .in("note_id", noteIds)
        .order("created_at", { ascending: false })
        .limit(80)
    : { data: [], error: null };

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const userIds = Array.from(new Set(((payments ?? []) as any[]).map((item: any) => item.user_id)));
  const { data: users, error: usersError } = userIds.length
    ? await admin.from("users").select("id, email, full_name").in("id", userIds)
    : { data: [], error: null };

  if (usersError) {
    throw new Error(usersError.message);
  }

  const usersById = new Map(((users ?? []) as any[]).map((item: any) => [item.id, item]));
  const totals = {
    created: (payments ?? []).filter((item: any) => item.status === "created").length ?? 0,
    failed: (payments ?? []).filter((item: any) => item.status === "failed").length ?? 0,
    revenue: (payments ?? []).filter((item: any) => item.status === "success").reduce((sum: number, item: any) => sum + item.amount_paise, 0) ?? 0,
    success: (payments ?? []).filter((item: any) => item.status === "success").length ?? 0,
  };

  return (
    <main className={`shell ${styles.page}`}>
      <section className={styles.topbar}>
        <div className={styles.titleWrap}>
          <p className={styles.eyebrow}>Admin Workspace</p>
          <h1 className={styles.title}>Payments</h1>
          <p className={styles.subtitle}>
            Review note purchases, failures, and audit trails for {university?.name ?? "your campus"}.
            Refund and payout controls can layer on top of this transaction base.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="button secondary small" href="/admin">
            Admin Dashboard
          </Link>
          <Link className="button secondary small" href="/admin/notes">
            Notes Management
          </Link>
          <Link className="button secondary small" href="/browse-notes">
            Browse Notes
          </Link>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{totals.success}</span>
          <span className={styles.statLabel}>Successful payments</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{totals.created}</span>
          <span className={styles.statLabel}>Pending or created</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{totals.failed}</span>
          <span className={styles.statLabel}>Failed payments</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{formatCurrency(totals.revenue)}</span>
          <span className={styles.statLabel}>Captured revenue</span>
        </article>
      </section>

      <section className={styles.gridTwo}>
        <article className={styles.surfaceCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Operational Scope</h2>
            <p className={styles.sectionSubtitle}>
              Current payment module covers audit and transaction visibility while refunds remain the next layer.
            </p>
          </div>
          <div className={styles.list}>
            <div className={styles.listItem}>
              <p className={styles.primaryText}>What works now</p>
              <div className={styles.pillRow}>
                <span className={styles.pill}>Order status tracking</span>
                <span className={styles.pill}>Revenue count</span>
                <span className={styles.pill}>Buyer and note audit</span>
              </div>
            </div>
            <div className={styles.listItem}>
              <p className={styles.primaryText}>Next controls</p>
              <div className={styles.pillRow}>
                <span className={styles.pill}>Refund queue</span>
                <span className={styles.pill}>Failure reason mapping</span>
                <span className={styles.pill}>Manual reconciliation</span>
              </div>
            </div>
          </div>
        </article>

        <article className={styles.surfaceCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Status Mix</h2>
            <p className={styles.sectionSubtitle}>Payment health across recent note purchases.</p>
          </div>
          <div className={styles.list}>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Success</span>
                <span className={`${styles.statusPill} ${styles.statusPositive}`}>{totals.success}</span>
              </div>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Created</span>
                <span className={`${styles.statusPill} ${styles.statusWarning}`}>{totals.created}</span>
              </div>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Failed</span>
                <span className={`${styles.statusPill} ${styles.statusNegative}`}>{totals.failed}</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Payment Audit</h2>
          <p className={styles.sectionSubtitle}>Transaction-level view for note purchases tied to this campus.</p>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Note</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Order / Payment</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className={styles.mutedText}>No payment records yet for this campus.</p>
                  </td>
                </tr>
              ) : (
                ((payments ?? []) as any[]).map((payment: any) => {
                  const buyer = usersById.get(payment.user_id);
                  const statusClass =
                    payment.status === "success"
                      ? styles.statusPositive
                      : payment.status === "failed"
                        ? styles.statusNegative
                        : styles.statusWarning;

                  return (
                    <tr key={payment.id}>
                      <td>
                        <p className={styles.primaryText}>{buyer?.full_name?.trim() || "Campus Member"}</p>
                        <p className={styles.mutedText}>{buyer?.email ?? "No email"}</p>
                      </td>
                      <td>{noteTitleById.get(payment.note_id) ?? "Unknown note"}</td>
                      <td>{formatCurrency(payment.amount_paise)}</td>
                      <td>
                        <span className={`${styles.statusPill} ${statusClass}`}>{payment.status}</span>
                      </td>
                      <td>
                        <p className={styles.primaryText}>{payment.razorpay_order_id}</p>
                        <p className={styles.mutedText}>{payment.razorpay_payment_id ?? "No payment id yet"}</p>
                      </td>
                      <td>{formatDateTime(payment.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
