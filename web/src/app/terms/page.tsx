import { InfoPageShell } from "@/components/info-page-shell";

export default function TermsPage() {
  return (
    <InfoPageShell
      activePage="terms"
      eyebrow="Legal"
      title="Terms and Conditions"
      subtitle="These terms define expected behavior, acceptable use, and account responsibilities while using LerenGO."
      updatedAt="February 26, 2026"
      sections={[
        {
          title: "Acceptable Use",
          items: [
            "Use the platform only for lawful educational and professional activity",
            "Do not upload copied, pirated, or misleading material",
            "Do not attempt to bypass campus boundaries or access controls",
            "Do not share account credentials with other users",
          ],
        },
        {
          title: "Account and Content Responsibility",
          paragraphs: [
            "You are responsible for the accuracy of content you submit, including notes, discussions, and profile information.",
            "LerenGO may suspend access for abuse, impersonation, fraud, or policy violations to protect campus communities.",
          ],
        },
      ]}
    />
  );
}
