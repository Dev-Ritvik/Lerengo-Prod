import { redirect } from "next/navigation";
import { CertificateLookupForm } from "./lookup-form";
import styles from "./[certificateNumber]/page.module.css";

type Props = {
  searchParams: Promise<{
    number?: string;
  }>;
};

export default async function CertificatesPage({ searchParams }: Props) {
  const { number } = await searchParams;
  const certificateNumber = number?.trim();
  if (certificateNumber) {
    redirect(`/certificates/${encodeURIComponent(certificateNumber)}`);
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>SkillGO Certificates</span>
        <h1 className={styles.title}>Verify a certificate</h1>
        <p className={styles.subtitle}>
          Enter the certificate number shared by the recipient to open the
          public verification record.
        </p>
        <CertificateLookupForm />
      </section>
    </main>
  );
}
