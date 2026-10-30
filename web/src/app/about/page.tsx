import { InfoPageShell } from "@/components/info-page-shell";

export default function AboutPage() {
  return (
    <InfoPageShell
      activePage="about"
      eyebrow="LerenGO Platform"
      title="About LerenGO"
      subtitle="LerenGO helps students move from learning to building to university-backed project support. SkillGO, ForgeGO, and CampusGO are modules inside one guided platform."
      updatedAt="February 26, 2026"
      sections={[
        {
          title: "What LerenGO Does",
          paragraphs: [
            "LerenGO is built to solve a practical gap: students can learn, but they still struggle to turn ideas into serious projects with structure and support.",
            "The platform connects skill-building, idea development, and university collaboration so students can move toward prototypes, demos, research outcomes, and launch-ready work.",
          ],
        },
        {
          title: "Modules Inside The Platform",
          items: [
            "SkillGO for practical learning tracks, certificates, and proof of work",
            "ForgeGO for idea submission, team formation, prototype planning, and guided execution",
            "CampusGO for mentorship, campus validation, and university-backed collaboration",
            "One account layer and one product identity across the full journey",
          ],
        },
        {
          title: "What Students Can Do Here",
          items: [
            "Develop practical skills before starting a project",
            "Submit an idea and move it into a structured build workflow",
            "Collaborate with teammates around a visible next step",
            "Receive mentorship and university guidance for serious work",
            "Present stronger project outcomes at showcases or demo days",
          ],
        },
        {
          title: "Early Proof Signals",
          items: [
            "A founding build team is actively shipping SkillGO, ForgeGO, and CampusGO inside one platform",
            "Mentor and senior-support workflows already exist across the campus and project journeys",
            "University collaboration requests are already routed through partnerships@lerengo.com",
            "Verified campus users, student builders, and project spaces are already part of the platform model",
          ],
        },
      ]}
    />
  );
}
