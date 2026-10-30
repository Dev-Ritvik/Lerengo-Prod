import { requireSuperAdminUser, ASSIGNABLE_ROLES } from "@/lib/superadmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import styles from "../../control.module.css";
import { banUser, setUserRole, setUserVerified, unbanUser } from "./actions";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

type Props = {
  searchParams: Promise<{ q?: string; success?: string; error?: string }>;
};

const SUCCESS_MESSAGES: Record<string, string> = {
  user_banned: "User banned.",
  user_unbanned: "User unbanned.",
  role_updated: "Role updated.",
  user_verified: "User verified.",
  user_unverified: "User verification removed.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_target: "Invalid user.",
  invalid_role: "Invalid role.",
  cannot_ban_self: "You cannot ban your own account.",
  cannot_demote_self: "You cannot remove your own superadmin access.",
  update_failed: "The update could not be saved.",
};

function sanitizeQuery(value: string) {
  // Strip characters that would break a PostgREST or() filter.
  return value.replace(/[,()%*]/g, " ").trim().slice(0, 80);
}

export const dynamic = "force-dynamic";

export default async function ControlUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser } = await requireSuperAdminUser();
  const admin = createSupabaseAdminClient();

  const rawQuery = typeof params.q === "string" ? params.q.trim() : "";
  const q = sanitizeQuery(rawQuery);

  let usersQuery = admin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);

  if (q) {
    usersQuery = usersQuery.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const [{ data: usersData, error: usersError }, { data: universitiesData }] = await Promise.all([
    usersQuery,
    admin.from("universities").select("id, name"),
  ]);

  if (usersError) {
    throw new Error(usersError.message);
  }

  const users = (usersData ?? []) as UserRow[];
  const universityNameById = new Map<string, string>(
    (universitiesData ?? []).map((u: { id: string; name: string }) => [u.id, u.name]),
  );

  const successMessage = params.success ? SUCCESS_MESSAGES[params.success] : null;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>Surface 1 · Users</p>
        <h1 className={styles.heroTitle}>User management</h1>
        <p className={styles.heroSubtitle}>
          Search every account across every campus. Ban or unban, change roles, and control
          verification. Actions here apply platform-wide and are written to the audit log.
        </p>
      </section>

      {successMessage ? (
        <p className={`${styles.notice} ${styles.noticeSuccess}`}>{successMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className={`${styles.notice} ${styles.noticeError}`}>{errorMessage}</p>
      ) : null}

      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <form className={styles.searchForm} method="get">
            <input
              className={styles.input}
              name="q"
              defaultValue={rawQuery}
              placeholder="Search by email or name…"
              type="search"
            />
            <button className={styles.btn} type="submit">
              Search
            </button>
          </form>
          <span className={styles.mutedText}>
            Showing {users.length} account{users.length === 1 ? "" : "s"}
            {q ? ` matching “${q}”` : " (most recent)"}
          </span>
        </div>

        {users.length === 0 ? (
          <div className={styles.emptyState}>No users found.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Campus</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === appUser.id;
                  const universityName = user.university_id
                    ? universityNameById.get(user.university_id) ?? "Unknown"
                    : "—";

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className={styles.primaryText}>{user.full_name || "Unnamed"}</div>
                        <div className={styles.mutedText}>{user.email}</div>
                        {isSelf ? <div className={styles.mutedText}>(you)</div> : null}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeRole}`}>{user.role}</span>
                      </td>
                      <td>
                        <div>{universityName}</div>
                        {user.program_domain ? (
                          <div className={styles.mutedText}>{user.program_domain}</div>
                        ) : null}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          <span
                            className={`${styles.badge} ${
                              user.verified ? styles.badgeGood : styles.badgeWarn
                            }`}
                          >
                            {user.verified ? "Verified" : "Unverified"}
                          </span>
                          {user.is_banned ? (
                            <span className={`${styles.badge} ${styles.badgeDanger}`}>Banned</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <form className={styles.inlineForm} action={setUserRole}>
                            <input type="hidden" name="userId" value={user.id} />
                            <input type="hidden" name="q" value={rawQuery} />
                            <select
                              className={styles.selectInline}
                              name="role"
                              defaultValue={user.role}
                              aria-label="Role"
                            >
                              {ASSIGNABLE_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <button className={styles.btn} type="submit">
                              Set role
                            </button>
                          </form>

                          <form className={styles.inlineForm} action={setUserVerified}>
                            <input type="hidden" name="userId" value={user.id} />
                            <input type="hidden" name="q" value={rawQuery} />
                            <input
                              type="hidden"
                              name="verified"
                              value={user.verified ? "false" : "true"}
                            />
                            <button className={styles.btn} type="submit">
                              {user.verified ? "Unverify" : "Verify"}
                            </button>
                          </form>

                          {user.is_banned ? (
                            <form className={styles.inlineForm} action={unbanUser}>
                              <input type="hidden" name="userId" value={user.id} />
                              <input type="hidden" name="q" value={rawQuery} />
                              <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
                                Unban
                              </button>
                            </form>
                          ) : (
                            <form className={styles.inlineForm} action={banUser}>
                              <input type="hidden" name="userId" value={user.id} />
                              <input type="hidden" name="q" value={rawQuery} />
                              <input
                                className={styles.selectInline}
                                name="reason"
                                placeholder="Reason (optional)"
                                type="text"
                                style={{ width: "150px" }}
                              />
                              <button
                                className={`${styles.btn} ${styles.btnDanger}`}
                                type="submit"
                                disabled={isSelf}
                              >
                                Ban
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
