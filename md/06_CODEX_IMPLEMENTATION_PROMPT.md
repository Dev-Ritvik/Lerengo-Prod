# Codex Implementation Prompt for MentorGO and HunterGO

Paste this into Codex before implementation.

```text
You are working inside the LerenGO codebase.

Your task is to add two new modules: MentorGO and HunterGO.

Before writing code, read these files completely:

- docs/LERENGO_DESIGN_CONTEXT.md, if it exists.
- 00_MODULE_EXPANSION_BRIEF.md
- 01_MENTORGO_PRD.md
- 02_MENTORGO_SRS.md
- 03_HUNTERGO_PRD.md
- 04_HUNTERGO_SRS.md
- 05_SHARED_DATA_MODEL.md
- 07_OPEN_QUESTIONS_AND_ASSUMPTIONS.md

If docs/LERENGO_DESIGN_CONTEXT.md does not exist, first audit the repository and create it. It must document the existing LerenGO design language, component patterns, routes, layout conventions, colors, typography, spacing, cards, forms, buttons, empty states, and responsive behavior.

Do not start implementation until you understand the existing design language.

Product direction:

LerenGO currently has SkillGO, ForgeGO, and CampusGO. These modules help students learn practical skills, build ideas/projects, and get university/campus support. MentorGO and HunterGO must extend that journey.

Expanded journey:

SkillGO → ForgeGO → CampusGO → MentorGO → HunterGO

MentorGO:
- mentor discovery marketplace;
- mentor cards with display picture, headline, expertise, rating, price, and availability;
- full mentor profile page;
- mentor-editable profile;
- session types and pricing;
- availability/free slot management;
- paid booking flow;
- student and mentor dashboards;
- admin verification/moderation.

HunterGO:
- verified talent discovery/headhunting platform;
- not a generic job board;
- student talent profiles with privacy controls;
- proof signals from SkillGO, ForgeGO, CampusGO, and eventually MentorGO;
- recruiter/company onboarding and verification;
- talent search;
- candidate profile view;
- shortlist;
- opportunities;
- candidate invites;
- basic pipeline tracking;
- admin moderation.

Design constraints:

- Keep the UI calm, structured, credible, and trust-first.
- Reuse existing components and styles before creating new ones.
- Match existing typography, spacing, radius, colors, shadows, cards, buttons, forms, and responsive behavior.
- Do not introduce a new visual style.
- Do not add decorative clutter, random gradients, loud animations, or unrelated UI patterns.
- Do not create fake credibility claims, fake partners, fake mentors, or fake recruiter claims.
- Keep the diff minimal and clean.
- Add no dependency unless there is a strong technical reason.

Implementation sequence:

1. Inspect current repo architecture and design system.
2. Identify existing patterns closest to module landing pages, profile cards, detail pages, dashboards, forms, admin review pages, and settings pages.
3. Create/update docs/LERENGO_DESIGN_CONTEXT.md if needed.
4. Add shared module metadata/navigation for MentorGO and HunterGO.
5. Implement route shells with native LerenGO layout.
6. Implement database models/migrations using the existing backend conventions.
7. Implement MentorGO MVP first:
   - directory;
   - mentor profile detail;
   - mentor profile editor;
   - session types/pricing;
   - availability/free slot management;
   - booking flow;
   - payment abstraction or existing payment integration;
   - student/mentor dashboards;
   - admin mentor verification.
8. Implement HunterGO MVP second:
   - talent profile activation/editing;
   - privacy/discoverability controls;
   - recruiter/company onboarding;
   - admin verification;
   - talent search;
   - candidate profile;
   - shortlists;
   - opportunities;
   - invites;
   - basic pipeline.
9. Add empty/loading/error states for every major screen.
10. Enforce server-side permissions and privacy rules.
11. Run tests/build/lint according to repo conventions.
12. Summarize the implementation and explain which existing design patterns were followed.

Hard rules:

- MentorGO booking must prevent double-booking at database/service level, not only in UI.
- HunterGO must be opt-in for students. Candidate profiles must be private or conservative by default.
- Recruiters must be verified before broad search/outreach.
- Payment logic must be abstracted and not hardcoded into UI components.
- Existing SkillGO, ForgeGO, and CampusGO behavior must not break.
- If any requested behavior conflicts with the existing LerenGO design system, choose consistency with LerenGO over novelty.
```

## Short prompt for future incremental tasks

```text
Before implementing this, read docs/LERENGO_DESIGN_CONTEXT.md and the MentorGO/HunterGO spec files.

Feature request:
[PASTE FEATURE HERE]

Build it in the native LerenGO design language.

Rules:
- Decide whether this belongs to MentorGO, HunterGO, or shared LerenGO.
- Reuse existing components and layout patterns.
- Match existing typography, spacing, colors, radius, cards, buttons, forms, shadows, and responsive behavior.
- Keep the UI calm, structured, credible, and trust-first.
- Enforce server-side authorization and privacy rules.
- Do not introduce off-brand UI.
- Do not make fake claims.
- Keep the diff minimal.
- After implementation, explain which existing patterns you followed.
```
