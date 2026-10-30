import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TransitionLink } from "@/components/transition-link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import authStyles from "../../(auth)/auth-flow.module.css";
import { saveCampusProfile } from "./actions";
import { CampusProfileForm } from "./campus-profile-form";
import styles from "./campus-profile.module.css";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error: string | undefined) {
  if (!error) {
    return null;
  }

  if (error === "invalid_university") {
    return "Campus name could not be matched to an active university. Use your official campus name.";
  }

  if (error === "invalid_input") {
    return "Please fill all campus details before continuing.";
  }

  if (error === "save_failed") {
    return "Could not save campus details. Please retry.";
  }

  if (error === "schema_incomplete") {
    return "Database schema is missing campus profile columns. Run web/supabase/schema.sql again.";
  }

  return "Could not continue. Please retry.";
}

export default async function CampusProfilePage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  let user: { id: string } | null = null;

  try {
    const response = await supabase.auth.getUser();
    user = response.data.user ? { id: response.data.user.id } : null;
  } catch {
    user = null;
  }

  if (!user) {
    redirect("/signin?next=%2Fonboarding%2Fcampus-profile");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as UserRow | null;

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.verified) {
    redirect("/campus-network");
  }

  const { data: universitiesData, error: universitiesError } = await supabase
    .from("universities")
    .select("id, name, domain")
    .eq("is_active", true)
    .order("name");

  if (universitiesError) {
    throw new Error(universitiesError.message);
  }

  const universities = universitiesData ?? [];
  const setupError =
    universities.length === 0 ? "No active campuses found. Add at least one university in Supabase." : null;

  let selectedUniversityName: string | null = null;
  let selectedUniversityDomain: string | null = null;
  if (profile?.university_id) {
    const selectedUniversity =
      universities.find((university: any) => university.id === profile.university_id) ?? null;
    selectedUniversityName = selectedUniversity?.name ?? null;
    selectedUniversityDomain = selectedUniversity?.domain ?? null;
  }

  const errorMessage = getErrorMessage(params.error);

  return (
    <div className={authStyles.page}>
      <main className={authStyles.shell}>
        <header className={authStyles.topBar}>
          <Link href="/" aria-label="LerenGO home" className={authStyles.brand}>
            <Image src="/logo.lerengo.embedded.svg" alt="LerenGO" width={562} height={303} priority />
          </Link>
          <div className={authStyles.topActions}>
            <TransitionLink className={authStyles.signin} href="/onboarding/university">
              Back
            </TransitionLink>
          </div>
        </header>

        <section className={authStyles.outerCard}>
          <div className={authStyles.chipRow}>
            <p className={authStyles.chip}>
              <span className={authStyles.chipDot} />
              Step 2 of 3
            </p>
          </div>

          <h1 className={authStyles.title}>Campus profile</h1>
          <p className={authStyles.subtext}>
            Add the academic details that define your campus access. Verification is the final step.
          </p>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
          {setupError ? <p className={styles.error}>{setupError}</p> : null}

          <section className={styles.formPanel}>
            <CampusProfileForm
              action={setupError ? undefined : saveCampusProfile}
              disabled={Boolean(setupError)}
              initialValues={{
                campusName: profile?.campus_name ?? "",
                completionDate: profile?.batch ?? "",
                department: profile?.department ?? "",
                programDomain: profile?.program_domain ?? "",
                universityId: profile?.university_id ?? "",
              }}
              universities={universities.map((university: any) => ({
                domain: university.domain,
                id: university.id,
                name: university.name,
              }))}
            />
          </section>

          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              University: {selectedUniversityName ?? "Select from campus search"}
            </span>
            <span className={styles.metaItem}>
              Email domain: {selectedUniversityDomain ?? "Appears after campus selection"}
            </span>
          </div>
        </section>

      </main>
    </div>
  );
}
