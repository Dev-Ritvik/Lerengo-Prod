# LerenGO Module Expansion Brief: MentorGO + HunterGO

## 1. Current platform model

LerenGO is one guided platform for practical skills, project building, and university collaboration. The existing modules are:

- **SkillGO**: practical learning tracks, certificates, proof of work, portfolio-ready outputs.
- **ForgeGO**: idea submission, team formation, prototype planning, guided execution.
- **CampusGO**: mentorship, campus validation, university-backed collaboration.

The new modules should extend this journey, not fragment it.

## 2. Expanded platform model

The expanded LerenGO system should become:

1. **SkillGO** — learn practical skills.
2. **ForgeGO** — turn ideas into structured projects/prototypes.
3. **CampusGO** — get university mentorship, validation, and campus support.
4. **MentorGO** — book expert mentors for focused guidance.
5. **HunterGO** — connect verified talent with recruiters, founders, companies, and opportunity owners.

## 3. Strategic role of MentorGO

MentorGO should solve a specific gap: students need access to the right mentor at the right time, not generic advice.

MentorGO is a structured mentor marketplace inside LerenGO where:

- Students browse mentor cards.
- Students open full mentor profiles.
- Mentors create and edit their own profiles.
- Mentors define available time slots.
- Students book appointments by paying a session fee.
- Admins verify mentors, moderate quality, and handle operational issues.

MentorGO must feel professional and trust-heavy. It should not look like a social network or casual chat app.

## 4. Strategic role of HunterGO

HunterGO should not be a generic job board. That would waste the strongest asset LerenGO has: verified student progress across SkillGO, ForgeGO, and CampusGO.

HunterGO should be a talent discovery and headhunting platform where recruiters and opportunity owners find students based on:

- Verified skills.
- Certificates/proof of work from SkillGO.
- Projects/prototypes from ForgeGO.
- University/campus validation from CampusGO.
- Mentor recommendations or session history from MentorGO, where privacy allows.

HunterGO should position LerenGO students as evaluated builders, not just resume uploaders.

## 5. Design direction

All new screens must follow the LerenGO design language:

- Calm.
- Structured.
- Credible.
- Academic/productive.
- Trust-first.
- Low-noise.
- Outcome-oriented.
- Modular.
- Not flashy.
- Not gimmicky.
- Not visually disconnected.

Avoid:

- Loud gradients unless already used in the repo.
- Random colors.
- Decorative clutter.
- Over-animated SaaS-style effects.
- Overly playful language.
- Unverified partner or success claims.

## 6. Navigation recommendation

If the existing product has a module switcher, MentorGO and HunterGO should appear as first-class modules. If not, add them carefully using the existing navigation pattern.

Recommended module labels:

- SkillGO — Learn
- ForgeGO — Build
- CampusGO — Validate
- MentorGO — Get guidance
- HunterGO — Get discovered

## 7. MVP sequencing

Build in this order:

### Phase 1: Foundation

- Module routes and navigation entries.
- Landing/dashboard pages for MentorGO and HunterGO.
- Shared permissions and role handling.
- Database models/migrations.

### Phase 2: MentorGO MVP

- Mentor directory.
- Mentor profile detail page.
- Mentor profile edit flow.
- Mentor availability management.
- Student booking flow.
- Payment placeholder/integration boundary.
- Booking confirmation and session management.

### Phase 3: HunterGO MVP

- Student talent profile visibility settings.
- Recruiter/company onboarding.
- Talent directory/search.
- Candidate profile view.
- Recruiter shortlist/invite flow.
- Opportunity posting.
- Basic pipeline tracking.

### Phase 4: Admin/Trust

- Mentor verification.
- Recruiter verification.
- Report/dispute handling.
- Payment/payout review.
- Audit logs.
- Abuse prevention.

## 8. Quality bar

A new screen is acceptable only if it satisfies all of these:

- It reuses existing LerenGO components where possible.
- It uses existing tokens/classes for colors, spacing, typography, radius, and elevation.
- It has clear role-specific behavior.
- It handles empty/loading/error states.
- It has mobile-safe layouts.
- It avoids fake claims.
- It does not visually break the product.
