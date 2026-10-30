import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import { resolveSafeAppPath } from "@/lib/tenant";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { VerifyUploadClient } from "./verify-upload-client";
import styles from "../auth-flow.module.css";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    demo?: string;
    next?: string;
  }>;
};

function isVerifyDemoEnabled(searchParam: string | undefined) {
  return (
    searchParam === "1" &&
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_SAMPLE_LOGIN === "true"
  );
}

export default async function VerifyPage({ searchParams }: Props) {
  const params = await searchParams;
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const isDemoMode = isVerifyDemoEnabled(params.demo);
  const postVerifyPath = resolveSafeAppPath(params.next, "/campus-network");

  let universityDomain: string | null = null;
  let currentEmail = "";
  let isPreviewMode = !hasSupabaseEnv || isDemoMode;

  if (hasSupabaseEnv && !isDemoMode) {
    const supabase = await createServerSupabaseClient();
    let user: { id: string; email?: string | null } | null = null;
    let authError: { message: string } | null = null;

    try {
      const response = await supabase.auth.getUser();
      user = response.data.user
        ? {
            id: response.data.user.id,
            email: response.data.user.email,
          }
        : null;
      authError = response.error ? { message: response.error.message } : null;
    } catch {
      authError = { message: "Auth fetch failed." };
    }

    if (authError || !user) {
      redirect("/signin?next=%2Fverify");
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

    if (!profile?.university_id) {
      redirect("/onboarding/university");
    }

    const hasCampusProfile =
      Boolean(profile.campus_name) &&
      Boolean(profile.batch) &&
      Boolean(profile.department) &&
      Boolean(profile.program_domain);

    if (!hasCampusProfile) {
      redirect("/onboarding/campus-profile");
    }

    if (profile.verified) {
      redirect(postVerifyPath);
    }

    const { data: university, error: universityError } = await supabase
      .from("universities")
      .select("domain")
      .eq("id", profile.university_id)
      .maybeSingle();

    if (universityError) {
      throw new Error(universityError.message);
    }

    universityDomain = university?.domain ?? null;
    currentEmail = profile.email ?? user.email ?? "";
    isPreviewMode = false;
  }

  return (
    <div className={styles.page}>
      <ScrollRevealController />
      <main className={styles.shell}>
        <header className={`${styles.topBar} ${styles.reveal}`} data-reveal>
          <Link href="/" aria-label="LerenGO home" className={styles.brand}>
            <Image src="/logo.lerengo.embedded.svg" alt="LerenGO" width={562} height={303} priority />
          </Link>
          <div className={styles.topActions}>
            <TransitionLink className={styles.signin} href="/onboarding/campus-profile">
              Campus profile
            </TransitionLink>
          </div>
        </header>

        <section className={`${styles.outerCard} ${styles.reveal}`} data-reveal>
          <div className={styles.chipRowRight}>
            <p className={styles.stepChip}>Step 3 of 3</p>
          </div>

          <h1 className={styles.title}>CampusGO verification</h1>
          <p className={styles.subtext}>
            Complete one verification method to unlock CampusGO. Email OTP is faster;
            ID upload is the fallback when you cannot use your student email.
          </p>

          <section className={`${styles.panel} ${styles.reveal}`} data-reveal>
            <VerifyUploadClient
              currentEmail={currentEmail}
              demoMode={isPreviewMode}
              nextPath={postVerifyPath}
              universityDomain={universityDomain}
            />
          </section>
        </section>
      </main>
    </div>
  );
}
