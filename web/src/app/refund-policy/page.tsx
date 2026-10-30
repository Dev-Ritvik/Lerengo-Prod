import { InfoPageShell } from "@/components/info-page-shell";

export default function RefundPolicyPage() {
  return (
    <InfoPageShell
      activePage="refund-policy"
      eyebrow="Payments"
      title="Refund Policy"
      subtitle="Refunds are evaluated using transaction status, gateway logs, and access records to keep the process fair for users and creators."
      updatedAt="February 26, 2026"
      sections={[
        {
          title: "Refund Eligibility",
          items: [
            "Duplicate payment for the same note",
            "Successful charge with failed access provisioning",
            "Failed payment marked incorrectly as completed",
            "Verified technical errors in order processing",
          ],
        },
        {
          title: "Processing Timeline",
          paragraphs: [
            "After eligibility checks, approved refunds are initiated to the original payment source.",
            "Final credit timeline depends on your bank, card issuer, or UPI provider after refund initiation.",
          ],
        },
      ]}
    />
  );
}
