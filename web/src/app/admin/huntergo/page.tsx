import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import {
  HUNTER_OPPORTUNITY_STATUSES,
  HUNTER_VERIFICATION_STATUSES,
  HUNTERGO_SCHEMA_HINT,
  formatHunterGoValue,
  isMissingHunterGoBackend,
  type HunterCompanyRow,
  type HunterOpportunityRow,
  type HunterRecruiterProfileRow,
  type HunterTalentProfileRow,
} from "@/lib/huntergo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { reviewHunterCompany, reviewHunterOpportunity, reviewHunterRecruiter } from "./actions";
import styles from "../workspace.module.css";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type UserRow = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "email" | "full_name" | "department" | "program_domain">;

const ERROR_MESSAGES: Record<string, string> = {
  company_save_failed: "Could not save the company review.",
  invalid_company_review: "The selected company review values are invalid.",
  invalid_opportunity_review: "The selected opportunity review values are invalid.",
  invalid_recruiter_review: "The selected recruiter review values are invalid.",
  opportunity_save_failed: "Could not save the opportunity review.",
  recruiter_save_failed: "Could not save the recruiter review.",
  schema_missing: HUNTERGO_SCHEMA_HINT,
};

const SUCCESS_MESSAGES: Record<string, string> = {
  company_reviewed: "HunterGO company review saved.",
  opportunity_reviewed: "HunterGO opportunity review saved.",
  recruiter_reviewed: "HunterGO recruiter review saved.",
};

function getStatusClassName(value: string) {
  if (value === "verified" || value === "published") {
    return `${styles.statusPill} ${styles.statusPositive}`;
  }

  if (value === "rejected" || value === "suspended" || value === "closed" || value === "archived") {
    return `${styles.statusPill} ${styles.statusNegative}`;
  }

  return `${styles.statusPill} ${styles.statusWarning}`;
}

export const dynamic = "force-dynamic";

export default async function AdminHunterGoPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const [talentResult, companyResult, recruiterResult, opportunityResult] = await Promise.all([
    admin.from("hunter_talent_profiles").select("*").order("updated_at", { ascending: false }).limit(80),
    admin.from("hunter_companies").select("*").order("updated_at", { ascending: false }).limit(80),
    admin.from("hunter_recruiter_profiles").select("*").order("updated_at", { ascending: false }).limit(80),
    admin.from("hunter_opportunities").select("*").order("updated_at", { ascending: false }).limit(80),
  ]);

  const schemaMissing =
    isMissingHunterGoBackend(talentResult.error) ||
    isMissingHunterGoBackend(companyResult.error) ||
    isMissingHunterGoBackend(recruiterResult.error) ||
    isMissingHunterGoBackend(opportunityResult.error);

  if ((talentResult.error || companyResult.error || recruiterResult.error || opportunityResult.error) && !schemaMissing) {
    throw new Error(
      talentResult.error?.message ||
        companyResult.error?.message ||
        recruiterResult.error?.message ||
        opportunityResult.error?.message ||
        "Failed to load HunterGO admin.",
    );
  }

  const talentProfiles = schemaMissing ? [] : ((talentResult.data ?? []) as HunterTalentProfileRow[]);
  const companies = schemaMissing ? [] : ((companyResult.data ?? []) as HunterCompanyRow[]);
  const recruiters = schemaMissing ? [] : ((recruiterResult.data ?? []) as HunterRecruiterProfileRow[]);
  const opportunities = schemaMissing ? [] : ((opportunityResult.data ?? []) as HunterOpportunityRow[]);
  const userIds = [...new Set([...talentProfiles.map((profile) => profile.user_id), ...recruiters.map((profile) => profile.user_id)])];

  const usersResult =
    userIds.length > 0
      ? await admin.from("users").select("id, email, full_name, department, program_domain").in("id", userIds)
      : { data: [] as UserRow[], error: null };

  if (usersResult.error && !schemaMissing) {
    throw new Error(usersResult.error.message);
  }

  const usersById = new Map(((usersResult.data ?? []) as UserRow[]).map((user) => [user.id, user]));
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const recruitersById = new Map(recruiters.map((recruiter) => [recruiter.id, recruiter]));
  const pendingRecruiters = recruiters.filter((recruiter) => recruiter.verification_status === "pending");
  const verifiedRecruiters = recruiters.filter((recruiter) => recruiter.verification_status === "verified");
  const activeTalent = talentProfiles.filter((profile) => profile.is_active && profile.discoverability !== "private");
  const pendingOpportunities = opportunities.filter((opportunity) => opportunity.status === "pending_review");
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "HunterGO admin action failed." : null;
  const successMessage = params.success ? SUCCESS_MESSAGES[params.success] ?? "HunterGO admin updated." : null;

  return (
    <main className={`shell ${styles.page}`}>
      <section className={styles.topbar}>
        <div className={styles.titleWrap}>
          <p className={styles.eyebrow}>Admin Workspace</p>
          <h1 className={styles.title}>HunterGO Management</h1>
          <p className={styles.subtitle}>
            Verify recruiters and companies, review opportunities, and watch talent visibility without turning HunterGO into a generic job board.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="button secondary small" href="/admin">
            Admin Dashboard
          </Link>
          <Link className="button secondary small" href="/huntergo">
            Live HunterGO
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      {schemaMissing ? (
        <section className={styles.panel}>
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateTitle}>HunterGO schema not applied yet</h3>
            <p className={styles.emptyStateBody}>{HUNTERGO_SCHEMA_HINT}</p>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{activeTalent.length}</span>
              <span className={styles.statLabel}>Discoverable talent</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{pendingRecruiters.length}</span>
              <span className={styles.statLabel}>Pending recruiters</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{verifiedRecruiters.length}</span>
              <span className={styles.statLabel}>Verified recruiters</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{pendingOpportunities.length}</span>
              <span className={styles.statLabel}>Opportunities in review</span>
            </article>
          </section>

          <section className={styles.gridTwo}>
            <article className={styles.surfaceCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Company verification</h2>
                <p className={styles.sectionSubtitle}>Companies must be verified before their recruiters get broad discovery trust.</p>
              </div>
              <div className={styles.list}>
                {companies.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h3 className={styles.emptyStateTitle}>No company requests yet</h3>
                    <p className={styles.emptyStateBody}>Recruiter onboarding will populate this queue.</p>
                  </div>
                ) : (
                  companies.map((company) => (
                    <form action={reviewHunterCompany} className={styles.listItem} key={company.id}>
                      <input name="companyId" type="hidden" value={company.id} />
                      <div className={styles.itemTitleRow}>
                        <span className={styles.itemTitle}>{company.name}</span>
                        <span className={getStatusClassName(company.verification_status)}>
                          {formatHunterGoValue(company.verification_status)}
                        </span>
                      </div>
                      <p className={styles.mutedText}>{company.website}</p>
                      <select className={styles.select} defaultValue={company.verification_status} name="verificationStatus">
                        {HUNTER_VERIFICATION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {formatHunterGoValue(status)}
                          </option>
                        ))}
                      </select>
                      <textarea className={styles.textarea} defaultValue={company.admin_notes ?? ""} name="adminNotes" placeholder="Verification notes." />
                      <button className="button small" type="submit">
                        Save company
                      </button>
                    </form>
                  ))
                )}
              </div>
            </article>

            <article className={styles.surfaceCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Talent visibility</h2>
                <p className={styles.sectionSubtitle}>Talent profiles stay opt-in. This panel is visibility monitoring, not recruiter access.</p>
              </div>
              <div className={styles.list}>
                {talentProfiles.length === 0 ? (
                  <div className={styles.emptyState}>
                    <h3 className={styles.emptyStateTitle}>No talent profiles yet</h3>
                    <p className={styles.emptyStateBody}>Students must activate their HunterGO profile before discovery.</p>
                  </div>
                ) : (
                  talentProfiles.slice(0, 12).map((profile) => {
                    const owner = usersById.get(profile.user_id);

                    return (
                      <div className={styles.listItem} key={profile.id}>
                        <div className={styles.itemTitleRow}>
                          <span className={styles.itemTitle}>{owner?.full_name ?? owner?.email ?? "Student profile"}</span>
                          <span className={profile.is_active ? `${styles.statusPill} ${styles.statusPositive}` : styles.statusPill}>
                            {profile.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className={styles.primaryText}>{profile.headline}</p>
                        <p className={styles.mutedText}>{profile.discoverability} / {profile.contact_visibility}</p>
                        <div className={styles.pillRow}>
                          {profile.target_roles.slice(0, 3).map((role) => (
                            <span className={styles.pill} key={`${profile.id}-${role}`}>
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recruiter review</h2>
              <p className={styles.sectionSubtitle}>
                Verified recruiter status controls broad candidate search and outreach. Invite quotas are enforced as a trust control.
              </p>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Recruiter</th>
                    <th>Company</th>
                    <th>Intent</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {recruiters.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <p className={styles.mutedText}>No recruiter profiles yet.</p>
                      </td>
                    </tr>
                  ) : (
                    recruiters.map((recruiter) => {
                      const owner = usersById.get(recruiter.user_id);
                      const company = recruiter.company_id ? companiesById.get(recruiter.company_id) : null;

                      return (
                        <tr key={recruiter.id}>
                          <td>
                            <p className={styles.primaryText}>{recruiter.display_name}</p>
                            <p className={styles.mutedText}>{recruiter.work_email}</p>
                            <p className={styles.mutedText}>{owner?.email ?? "No account email found"}</p>
                          </td>
                          <td>
                            <p className={styles.primaryText}>{company?.name ?? "Company not linked"}</p>
                            <p className={styles.mutedText}>{company?.website ?? "No website"}</p>
                          </td>
                          <td>
                            <p className={styles.mutedText}>{recruiter.hiring_intent}</p>
                          </td>
                          <td>
                            <span className={getStatusClassName(recruiter.verification_status)}>
                              {formatHunterGoValue(recruiter.verification_status)}
                            </span>
                          </td>
                          <td>
                            <form action={reviewHunterRecruiter} className={styles.stack}>
                              <input name="recruiterId" type="hidden" value={recruiter.id} />
                              <select className={styles.select} defaultValue={recruiter.verification_status} name="verificationStatus">
                                {HUNTER_VERIFICATION_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {formatHunterGoValue(status)}
                                  </option>
                                ))}
                              </select>
                              <input className={styles.input} defaultValue={recruiter.monthly_invite_quota} min={0} name="monthlyInviteQuota" type="number" />
                              <textarea className={styles.textarea} defaultValue={recruiter.admin_notes ?? ""} name="adminNotes" placeholder="Access, abuse, or verification notes." />
                              <button className="button small" type="submit">
                                Save recruiter
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Opportunity moderation</h2>
              <p className={styles.sectionSubtitle}>Opportunities should publish only when the recruiter/company trust state is acceptable.</p>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Recruiter</th>
                    <th>Skills</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <p className={styles.mutedText}>No HunterGO opportunities yet.</p>
                      </td>
                    </tr>
                  ) : (
                    opportunities.map((opportunity) => {
                      const recruiter = recruitersById.get(opportunity.recruiter_profile_id);
                      const company = opportunity.company_id ? companiesById.get(opportunity.company_id) : null;

                      return (
                        <tr key={opportunity.id}>
                          <td>
                            <p className={styles.primaryText}>{opportunity.title}</p>
                            <p className={styles.mutedText}>{opportunity.opportunity_type} / {opportunity.location_mode}</p>
                            <p className={styles.mutedText}>{company?.name ?? "No company"}</p>
                          </td>
                          <td>
                            <p className={styles.primaryText}>{recruiter?.display_name ?? "Recruiter"}</p>
                            <p className={styles.mutedText}>{recruiter?.work_email ?? "No recruiter email"}</p>
                          </td>
                          <td>
                            <div className={styles.pillRow}>
                              {opportunity.required_skills.slice(0, 5).map((skill) => (
                                <span className={styles.pill} key={`${opportunity.id}-${skill}`}>
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={getStatusClassName(opportunity.status)}>
                              {formatHunterGoValue(opportunity.status)}
                            </span>
                          </td>
                          <td>
                            <form action={reviewHunterOpportunity} className={styles.stack}>
                              <input name="opportunityId" type="hidden" value={opportunity.id} />
                              <select className={styles.select} defaultValue={opportunity.status} name="status">
                                {HUNTER_OPPORTUNITY_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {formatHunterGoValue(status)}
                                  </option>
                                ))}
                              </select>
                              <textarea className={styles.textarea} defaultValue={opportunity.admin_notes ?? ""} name="adminNotes" placeholder="Moderation notes." />
                              <button className="button small" type="submit">
                                Save opportunity
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
