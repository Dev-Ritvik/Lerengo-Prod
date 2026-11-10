import { InfoPageShell } from "@/components/info-page-shell";

export default function PrivacyPage() {
  return (
    <InfoPageShell
      activePage="privacy"
      eyebrow="Trust and Privacy"
      title="Privacy Policy"
      subtitle="LerenGO is built around verified campus access. This policy explains what information we collect, why we collect it, and how we keep it scoped to the right campus, role, and workflow."
      updatedAt="March 29, 2026"
      sections={[
        {
          title: "Information We Collect",
          paragraphs: [
            "We collect account information such as your name, email address, login metadata, and profile details needed to operate the platform.",
            "If you join CampusGO, we may also collect university-specific profile data such as your campus, department, program, graduation timeline, and verification status.",
          ],
          items: [
            "Account identity and authentication data",
            "Campus profile and eligibility fields",
            "Verification artifacts such as student ID uploads or email-OTP records",
            "Notes, discussions, mentorship activity, moderation events, and related product usage logs",
          ],
        },
        {
          title: "Why We Use Your Data",
          paragraphs: [
            "We use your information to verify eligibility, secure access, personalize campus-scoped features, moderate trust-sensitive workflows, and improve the quality of the platform.",
            "LerenGO does not use personal data for unrelated advertising. Data is used to run the product, enforce campus boundaries, support moderation, and maintain platform integrity.",
          ],
        },
        {
          title: "Campus Isolation and Access Control",
          paragraphs: [
            "LerenGO is designed so users see data relevant to their own university network. Access decisions are enforced through authentication state, verification state, role, and campus mapping.",
            "Sensitive actions such as note moderation, verification review, and community reporting are restricted to the appropriate admins or system workflows.",
          ],
          items: [
            "Campus-scoped notes, mentorship, and community access",
            "Role-based controls for users, seniors, faculty, and admins",
            "Restricted handling of verification and moderation records",
          ],
        },
        {
          title: "Storage, Retention, and Security",
          paragraphs: [
            "We apply access controls, storage restrictions, and retention rules to reduce unnecessary exposure of personal information.",
            "Verification-related files and records may be retained only for as long as needed for approval, audit, abuse prevention, or legal and operational requirements.",
            "No online system is risk-free, but we aim to minimize data exposure through scoped access, limited sharing, and operational safeguards.",
          ],
        },
        {
          title: "Sharing and User Rights",
          paragraphs: [
            "We do not sell your personal data. Information may be shared only with service providers or infrastructure partners required to operate the product, or where law or safety requires it.",
            "You can contact us to request account support, corrections, or questions about how your information is handled. Some records may need to be retained for security, compliance, or platform abuse review.",
          ],
          items: [
            "No sale of personal information",
            "Operational sharing only where required to run the platform",
            "Support requests for account, data, and privacy questions",
          ],
        },
        {
          title: "Student Verification &amp; ID Card Data",
          paragraphs: [
            "University emails and ID card uploads are collected strictly for the purpose of verifying your student status under CampusGO. They are not used for any other purpose, including advertising or marketing.",
            "Your registration ID is stored as a SHA-256 hash (not plaintext), and only the last four digits are retained on your profile for reference.",
            "ID card images are stored in a private, access-restricted storage bucket. Once your verification request is approved or rejected by an administrator, the raw image is immediately deleted from storage. No ID card image is retained longer than necessary for the verification decision.",
            "You may request access to, correction of, or deletion of your verification data at any time by contacting our Grievance/Support team at support@lerengo.com. We will respond to such requests in accordance with applicable data protection law, including the Digital Personal Data Protection Act, 2023.",
          ],
        },
      ]}
    />
  );
}
