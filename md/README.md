# LerenGO Module Expansion Spec Pack

This pack defines two new LerenGO modules:

1. **MentorGO** — a mentorship marketplace where students discover mentors, view detailed mentor profiles, book paid sessions, and mentors manage profiles, availability, sessions, and earnings.
2. **HunterGO** — a talent/headhunting platform that connects verified LerenGO student talent with recruiters, founders, companies, and university placement teams.

These documents are written for Codex or another implementation agent. They are intentionally specific enough to reduce ambiguity and prevent off-brand implementation.

## Files

| File | Purpose |
|---|---|
| `00_MODULE_EXPANSION_BRIEF.md` | Shared product direction and how MentorGO/HunterGO fit into LerenGO |
| `01_MENTORGO_PRD.md` | Product Requirements Document for MentorGO |
| `02_MENTORGO_SRS.md` | Software Requirements Specification for MentorGO |
| `03_HUNTERGO_PRD.md` | Product Requirements Document for HunterGO |
| `04_HUNTERGO_SRS.md` | Software Requirements Specification for HunterGO |
| `05_SHARED_DATA_MODEL.md` | Shared entities, permissions, data model, and integrations |
| `06_CODEX_IMPLEMENTATION_PROMPT.md` | Direct prompt to paste into Codex before implementation |
| `07_OPEN_QUESTIONS_AND_ASSUMPTIONS.md` | Assumptions made and unresolved product questions |

## Implementation posture

Do not build MentorGO and HunterGO as isolated products with their own unrelated visual identity. They must feel like native LerenGO modules, extending the same calm, structured, credible, low-noise product language already used across SkillGO, ForgeGO, and CampusGO.

The preferred product journey after this expansion is:

**SkillGO → ForgeGO → CampusGO → MentorGO → HunterGO**

A student should be able to learn, build, validate, receive mentorship, and then move toward career or opportunity matching without leaving the LerenGO ecosystem.
