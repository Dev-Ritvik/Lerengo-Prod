import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import styles from "./page.module.css";

type Props = {
  params: Promise<{
    certificateNumber: string;
  }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: Props) {
  const { certificateNumber } = await params;
  const admin = createSupabaseAdminClient();

  const { data: certificate, error } = await admin
    .from("course_certificates")
    .select("id, certificate_number, course_id, recipient_name, title, issued_at")
    .eq("certificate_number", certificateNumber)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!certificate) {
    notFound();
  }

  const { data: course } = await admin
    .from("courses")
    .select("slug, title, provider_name, program_type")
    .eq("id", certificate.course_id)
    .maybeSingle();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>SkillGO Certificate</span>
        <h1 className={styles.title}>{certificate.title}</h1>
        <p className={styles.subtitle}>
          Verified completion record for {certificate.recipient_name}.
        </p>

        <div className={styles.metaGrid}>
          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Certificate number</span>
            <strong className={styles.metaValue}>{certificate.certificate_number}</strong>
          </article>
          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Issued on</span>
            <strong className={styles.metaValue}>{formatDate(certificate.issued_at)}</strong>
          </article>
          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Recipient</span>
            <strong className={styles.metaValue}>{certificate.recipient_name}</strong>
          </article>
          <article className={styles.metaCard}>
            <span className={styles.metaLabel}>Learning path</span>
            <strong className={styles.metaValue}>{course?.title ?? "SkillGO Course"}</strong>
          </article>
        </div>

        <div className={styles.detailBlock}>
          <p>
            Provider: {course?.provider_name ?? "SkillGO"} / {course?.program_type ?? "Certificate"}
          </p>
          <p>
            This link acts as the public certificate record generated after passing the final SkillGO test.
          </p>
        </div>

        {course?.slug ? (
          <Link className={styles.action} href={`/courses/${course.slug}`}>
            Open course
          </Link>
        ) : null}
      </section>
    </main>
  );
}
