import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TransitionLink } from "@/components/transition-link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { resolveUserJourneyPath } from "@/lib/tenant";
import { saveUniversitySelection } from "./actions";
import { UniversitySearchForm } from "./university-search-form";
import authStyles from "../../(auth)/auth-flow.module.css";
import styles from "./university.module.css";

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
    return "Please choose a valid campus to continue.";
  }

  if (error === "save_failed") {
    return "Could not save your campus. Please retry.";
  }

  return "Could not continue. Please retry.";
}

export default async function UniversityOnboardingPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  let user: { id: string } | null = null;

  try {
    const response = await supabase.auth.getUser();
    user = response.data.user ? { id: response.data.user.id } : null;
  } catch {
    user = null;
  }
  let setupError: string | null = null;
  let universities: Array<{ id: string; name: string }> = [];

  if (!user) {
    redirect("/signin?next=%2Fonboarding%2Funiversity");
  }

  const { data: appUserData, error: appUserError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const appUser = appUserData as UserRow | null;

  if (appUserError) {
    const isSchemaMissing =
      appUserError.code === "PGRST205" || appUserError.code === "42P01";
    setupError = isSchemaMissing
      ? "Database setup is incomplete. Run web/supabase/schema.sql and web/supabase/verification_schema.sql."
      : "Could not load account details. Please retry.";
  } else {
    if (appUser) {
      const nextPath = resolveUserJourneyPath(appUser);
      if (nextPath !== "/onboarding/university") {
        redirect(nextPath);
      }
    }
  }

  if (!setupError) {
    const { data, error } = await supabase
      .from("universities")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      const isSchemaMissing = error.code === "PGRST205" || error.code === "42P01";
      setupError = isSchemaMissing
        ? "Database setup is incomplete. Run web/supabase/schema.sql and web/supabase/verification_schema.sql."
        : "Could not load campus list. Please retry.";
    } else {
      universities = data ?? [];
      if (universities.length === 0) {
        setupError = "No active campuses found. Add at least one university in Supabase.";
      }
    }
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
            <TransitionLink className={authStyles.signin} href="/">
              Back
            </TransitionLink>
          </div>
        </header>

        <section className={`${authStyles.outerCard} ${styles.outerCard}`}>
          <div className={authStyles.chipRow}>
            <p className={authStyles.chip}>
              <span className={authStyles.chipDot} />
              Step 1 of 3
            </p>
          </div>

          <h1 className={authStyles.title}>Select your campus</h1>
          <p className={authStyles.subtext}>
            Pick your university first. Next you will add your campus details, then complete verification.
          </p>

          {errorMessage ? <p className={authStyles.error}>{errorMessage}</p> : null}
          {setupError ? <p className={styles.setupError}>{setupError}</p> : null}

          <section className={styles.formPanel}>
            <UniversitySearchForm
              action={setupError ? undefined : saveUniversitySelection}
              disabled={Boolean(setupError)}
              universities={universities ?? []}
            />
          </section>

          <p className={styles.helperText}>
            Next step: complete your campus profile.
          </p>
        </section>

      </main>
    </div>
  );
}
