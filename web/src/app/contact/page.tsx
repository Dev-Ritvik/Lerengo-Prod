import { InfoPageShell } from "@/components/info-page-shell";

export default function ContactPage() {
  return (
    <InfoPageShell
      activePage="contact"
      eyebrow="Support"
      title="Contact LerenGO"
      subtitle="For platform support, onboarding help, verification issues, or collaboration requests, reach out through the channels below."
      updatedAt="February 26, 2026"
      sections={[
        {
          title: "Support Channels",
          items: [
            "General Support: support@lerengo.com",
            "Operations: ops@lerengo.com",
            "Partnerships: partnerships@lerengo.com",
            "Average Response Time: within 2 working days",
          ],
        },
        {
          title: "When You Contact Us",
          paragraphs: [
            "Include your registered email and campus name so we can trace your request quickly.",
            "For payment or verification issues, include screenshots and exact timestamps to reduce turnaround time.",
          ],
        },
      ]}
    />
  );
}
