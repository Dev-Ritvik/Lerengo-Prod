import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAcademicMapping, toggleAcademicMapping, updateUniversitySettings } from "./actions";
import styles from "../workspace.module.css";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Invalid university settings input.",
  invalid_mapping: "Invalid academic mapping input.",
  invalid_university: "University scope mismatch.",
  mapping_save_failed: "Could not save academic mapping.",
  mapping_toggle_failed: "Could not update mapping state.",
  save_failed: "Could not save university settings.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  mapping_saved: "Academic mapping saved.",
  settings_saved: "University settings updated.",
};

export const dynamic = "force-dynamic";

export default async function AdminUniversitiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const [
    { data: university, error: universityError },
    { data: mappings, error: mappingsError },
    { data: users, error: usersError },
    { data: notes, error: notesError },
  ] = await Promise.all([
    admin
      .from("universities")
      .select("id, name, domain, min_score, name_variants, keywords")
      .eq("id", appUser.university_id)
      .maybeSingle(),
    admin
      .from("academic_subject_mappings")
      .select("id, department, program_domain, semester, subject, is_active")
      .eq("university_id", appUser.university_id)
      .order("department", { ascending: true })
      .order("program_domain", { ascending: true })
      .order("semester", { ascending: true })
      .order("subject", { ascending: true }),
    admin
      .from("users")
      .select("department, program_domain")
      .eq("university_id", appUser.university_id),
    admin
      .from("notes")
      .select("department, program_domain, semester, subject")
      .eq("university_id", appUser.university_id),
  ]);

  if (universityError || mappingsError || usersError || notesError) {
    throw new Error(
      universityError?.message ||
        mappingsError?.message ||
        usersError?.message ||
        notesError?.message ||
        "Failed to load campus operations.",
    );
  }

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "Campus operation failed." : null;
  const successMessage = params.success
    ? SUCCESS_MESSAGES[params.success] ?? "Campus operation updated."
    : null;

  const departments = Array.from(
    new Set(
      [...(mappings ?? []).map((item: any) => item.department), ...(users ?? []).map((item: any) => item.department), ...(notes ?? []).map((item: any) => item.department)]
        .filter(Boolean)
        .map((value) => value as string),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const programs = Array.from(
    new Set(
      [...(mappings ?? []).map((item: any) => item.program_domain), ...(users ?? []).map((item: any) => item.program_domain), ...(notes ?? []).map((item: any) => item.program_domain)]
        .filter(Boolean)
        .map((value) => value as string),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const semesters = Array.from(
    new Set(
      [...(mappings ?? []).map((item: any) => item.semester), ...(notes ?? []).map((item: any) => item.semester)]
        .filter((value) => typeof value === "number" && Number.isInteger(value))
        .map((value) => Number(value)),
    ),
  ).sort((left, right) => left - right);

  return (
    <main className={`shell ${styles.page}`}>
      <section className={styles.topbar}>
        <div className={styles.titleWrap}>
          <p className={styles.eyebrow}>Admin Workspace</p>
          <h1 className={styles.title}>Campus Operations</h1>
          <p className={styles.subtitle}>
            Manage university identity, academic structure, and the semester-subject catalog that
            powers notes and campus routing.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="button secondary small" href="/admin">
            Admin Dashboard
          </Link>
          <Link className="button secondary small" href="/onboarding/campus-profile">
            Campus Profile
          </Link>
          <Link className="button secondary small" href="/admin/analytics">
            Analytics
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{departments.length}</span>
          <span className={styles.statLabel}>Departments discovered</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{programs.length}</span>
          <span className={styles.statLabel}>Programs or domains</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{semesters.length}</span>
          <span className={styles.statLabel}>Semesters mapped</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{(mappings ?? []).filter((item: any) => item.is_active).length}</span>
          <span className={styles.statLabel}>Active subject mappings</span>
        </article>
      </section>

      <section className={styles.gridTwo}>
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>University Settings</h2>
            <p className={styles.sectionSubtitle}>
              Update the university record CampusGO is attached to.
            </p>
          </div>

          <form action={updateUniversitySettings}>
            <input name="universityId" type="hidden" value={university?.id ?? ""} />
            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span className={styles.formLabel}>University name</span>
                <input className={styles.input} defaultValue={university?.name ?? ""} name="name" type="text" />
              </label>
              <label className={styles.formField}>
                <span className={styles.formLabel}>University domain</span>
                <input className={styles.input} defaultValue={university?.domain ?? ""} name="domain" type="text" />
              </label>
              <label className={styles.formField}>
                <span className={styles.formLabel}>Minimum verification score</span>
                <input className={styles.input} defaultValue={university?.min_score ?? 80} max={100} min={0} name="minScore" type="number" />
              </label>
              <label className={styles.formFieldFull}>
                <span className={styles.formLabel}>Name variants</span>
                <input
                  className={styles.input}
                  defaultValue={(university?.name_variants ?? []).join(", ")}
                  name="nameVariants"
                  placeholder="LPU, Lovely Professional University"
                  type="text"
                />
              </label>
              <label className={styles.formFieldFull}>
                <span className={styles.formLabel}>Keywords</span>
                <input
                  className={styles.input}
                  defaultValue={(university?.keywords ?? []).join(", ")}
                  name="keywords"
                  placeholder="Punjab, Engineering, Hostels"
                  type="text"
                />
              </label>
            </div>
            <div className={styles.formFooter}>
              <p className={styles.notice}>These settings affect onboarding and university verification matching.</p>
              <button className="button" type="submit">
                Save University Settings
              </button>
            </div>
          </form>
        </section>

        <section className={styles.surfaceCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Current Academic Structure</h2>
            <p className={styles.sectionSubtitle}>
              Derived from user profiles, notes, and explicit subject mappings.
            </p>
          </div>

          <div className={styles.list}>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Departments</span>
                <span className={styles.pill}>{departments.length}</span>
              </div>
              <div className={styles.pillRow}>
                {departments.length ? departments.map((item) => <span className={styles.pill} key={item}>{item}</span>) : <span className={styles.mutedText}>No departments yet.</span>}
              </div>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Programs / Domains</span>
                <span className={styles.pill}>{programs.length}</span>
              </div>
              <div className={styles.pillRow}>
                {programs.length ? programs.map((item) => <span className={styles.pill} key={item}>{item}</span>) : <span className={styles.mutedText}>No programs yet.</span>}
              </div>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Semesters covered</span>
                <span className={styles.pill}>{semesters.length}</span>
              </div>
              <div className={styles.pillRow}>
                {semesters.length ? semesters.map((item) => <span className={styles.pill} key={item}>Semester {item}</span>) : <span className={styles.mutedText}>No semesters yet.</span>}
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Add Subject Mapping</h2>
          <p className={styles.sectionSubtitle}>
            Register department, program, semester, and subject combinations explicitly.
          </p>
        </div>

        <form action={createAcademicMapping}>
          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Department</span>
              <input className={styles.input} name="department" placeholder="Computer Science" type="text" />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Program / Domain</span>
              <input className={styles.input} name="programDomain" placeholder="B.Tech" type="text" />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Semester</span>
              <input className={styles.input} max={12} min={1} name="semester" placeholder="4" type="number" />
            </label>
            <label className={styles.formFieldFull}>
              <span className={styles.formLabel}>Subject</span>
              <input className={styles.input} name="subject" placeholder="Operating Systems" type="text" />
            </label>
          </div>
          <div className={styles.formFooter}>
            <p className={styles.notice}>Use this to keep browse-notes and future academic feeds structured.</p>
            <button className="button" type="submit">
              Add Mapping
            </button>
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Academic Subject Catalog</h2>
          <p className={styles.sectionSubtitle}>
            Toggle mappings active or inactive without deleting historical structure.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Department</th>
                <th>Program</th>
                <th>Semester</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(mappings ?? []).map((mapping: any) => (
                <tr key={mapping.id}>
                  <td><p className={styles.primaryText}>{mapping.department}</p></td>
                  <td>{mapping.program_domain}</td>
                  <td>Semester {mapping.semester}</td>
                  <td>{mapping.subject}</td>
                  <td>
                    <span className={`${styles.statusPill} ${mapping.is_active ? styles.statusPositive : styles.statusNegative}`}>
                      {mapping.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <form action={toggleAcademicMapping}>
                      <input name="mappingId" type="hidden" value={mapping.id} />
                      <input name="nextState" type="hidden" value={mapping.is_active ? "false" : "true"} />
                      <button className="button secondary small" type="submit">
                        {mapping.is_active ? "Disable" : "Enable"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
