import { InfoPageShell } from "@/components/info-page-shell";

export default function ShippingPolicyPage() {
  return (
    <InfoPageShell
      activePage="shipping-policy"
      eyebrow="Payments"
      title="Shipping &amp; Delivery Policy"
      subtitle="LerenGO is a digital learning platform. All products and services are delivered electronically — no physical goods are shipped."
      updatedAt="February 26, 2026"
      sections={[
        {
          title: "Digital Delivery",
          items: [
            "All notes, courses, labs, mentorship access, and certificates are digital products delivered through the LerenGO platform.",
            "No physical items are shipped or mailed to any address.",
            "Access is granted immediately upon successful payment confirmation on your account dashboard.",
          ],
        },
        {
          title: "Access Provisioning",
          paragraphs: [
            "After a successful Razorpay payment, the webhook handler confirms the transaction and unlocks access to the purchased note or course in your account.",
            "If payment is successful but access does not appear within a few minutes, contact support at support@lerengo.com with your order ID and transaction timestamp.",
          ],
        },
        {
          title: "Delivery Timeline",
          items: [
            "Digital access is provisioned in near real-time once Razorpay confirms payment.captured.",
            "Delays may occur during gateway outages or bank/UPI processing; these are resolved automatically when the webhook is delivered.",
          ],
        },
        {
          title: "Support Contact",
          paragraphs: [
            "For any delivery or access issues, email support@lerengo.com with your registered email, order ID, and a screenshot of the payment receipt if available.",
          ],
        },
      ]}
    />
  );
}
