# Shared Data Model, Permissions, and Integrations

## 1. Purpose

This document describes shared implementation concepts for MentorGO and HunterGO. Codex should use this as a bridge between the PRD/SRS files and the existing LerenGO codebase.

## 2. Module relationship

The expanded LerenGO module map:

| Module | Primary job | Key output |
|---|---|---|
| SkillGO | Learn practical skills | certificates, proof of work |
| ForgeGO | Build ideas/projects | prototypes, teams, research direction |
| CampusGO | Validate through university/campus support | mentor/reviewer/campus signals |
| MentorGO | Book expert guidance | sessions, mentor feedback, guidance outcomes |
| HunterGO | Get discovered by opportunity owners | talent profile, invites, opportunities, pipeline |

## 3. Shared role model

Preferred roles:

- `student`
- `mentor`
- `recruiter`
- `company_admin`
- `campus_admin` or existing campus role
- `admin`

Do not assume one user has only one role.

Examples:

- A student can also be a mentor later.
- A faculty user can be both campus mentor and MentorGO mentor.
- An admin can inspect all modules.
- A recruiter should not automatically become a mentor.

## 4. Shared identity rules

Use the existing LerenGO account layer. Do not create separate authentication for MentorGO or HunterGO unless the repo already uses separate subdomain auth patterns.

Each module should rely on:

- existing user ID;
- existing session/auth middleware;
- existing profile/avatar fallback conventions;
- existing role/permission checks;
- existing layout/navigation patterns.

## 5. Recommended permissions matrix

| Capability | Student | Mentor | Recruiter | Campus/Admin | Platform Admin |
|---|---:|---:|---:|---:|---:|
| Browse mentors | Yes | Yes | Optional | Yes | Yes |
| Book mentor session | Yes | Optional | Optional | Yes | Yes |
| Edit own mentor profile | No | Yes | No | Optional | Yes |
| Verify mentors | No | No | No | Optional | Yes |
| Activate talent profile | Yes | Yes if student profile exists | No | No | Yes |
| Search talent | No | No | Verified only | Optional | Yes |
| View private candidate data | Own only | Own only | Limited by consent | Limited | Yes |
| Post opportunity | No | Optional | Verified only | Optional | Yes |
| Manage pipeline | No | No | Own company/opportunity | Optional | Yes |
| Verify recruiters | No | No | No | No | Yes |

## 6. Shared entities

### User

Use existing user model. Add role/profile relationships rather than duplicating users.

### Profile image/avatar

MentorGO and HunterGO should reuse existing image upload/avatar components if available.

### Tags/categories

Where possible, use shared category/tag patterns:

- skills;
- domains;
- industries;
- technologies;
- opportunity types;
- mentor expertise.

Avoid creating unrelated category models unless necessary.

## 7. Integration signals

### SkillGO to HunterGO

Possible proof signals:

- completed tracks;
- certificates;
- assessed skills;
- portfolio outputs.

### ForgeGO to HunterGO

Possible proof signals:

- submitted ideas;
- active projects;
- prototype links;
- project role;
- team collaboration history;
- research/patent/publication status where available.

### CampusGO to HunterGO

Possible proof signals:

- university validation;
- mentor/reviewer approval;
- demo day participation;
- campus-backed project status.

### MentorGO to HunterGO

Possible proof signals:

- mentor recommendation;
- completed mentoring session outcome;
- project review notes, only if explicitly public/allowed.

Privacy must override all signal sharing.

## 8. UI component recommendations

Use existing components from the repository. If equivalents do not exist, build small reusable primitives using current design tokens.

Likely needed shared components:

- `ModuleHero`
- `ModuleCard`
- `ProfileCard`
- `ProfileHeader`
- `TagPill`
- `FilterBar`
- `SearchInput`
- `StatusBadge`
- `SlotPicker`
- `PriceDisplay`
- `ProfileCompletionMeter`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `DashboardShell`
- `SettingsSection`
- `AdminReviewPanel`

Do not introduce a large third-party UI system unless the repo already depends on it.

## 9. Status enums

### Mentor verification status

- `draft`
- `submitted`
- `approved`
- `rejected`
- `suspended`

### Booking status

- `draft`
- `pending_payment`
- `payment_failed`
- `pending_mentor_approval`
- `confirmed`
- `reschedule_requested`
- `cancelled_by_student`
- `cancelled_by_mentor`
- `completed`
- `no_show`
- `refunded`
- `disputed`

### Recruiter/company verification status

- `pending`
- `verified`
- `rejected`
- `suspended`

### Opportunity status

- `draft`
- `pending_review`
- `published`
- `paused`
- `closed`
- `archived`

### Candidate pipeline stage

- `invited`
- `interested`
- `applied`
- `screening`
- `interview`
- `offer`
- `hired`
- `rejected`
- `withdrawn`

## 10. Notifications

Use existing notification/email patterns if present.

Recommended notification events:

### MentorGO

- mentor profile submitted;
- mentor approved/rejected;
- booking created;
- payment failed;
- booking confirmed;
- booking cancelled;
- reschedule requested;
- session starting soon;
- session completed;
- review submitted.

### HunterGO

- talent profile published;
- recruiter approved/rejected;
- opportunity published/rejected;
- candidate invited;
- invite accepted/declined;
- application submitted;
- pipeline stage changed;
- recruiter/company suspended.

## 11. Payment/payout boundary

MentorGO requires payment handling. HunterGO may later require paid recruiter plans, but that is not MVP.

MentorGO payment architecture should have clear boundaries:

- booking service;
- payment provider adapter;
- payment status webhook handler if provider exists;
- payout/earnings ledger;
- refund/dispute representation.

Do not store raw card/payment credentials.

## 12. Privacy and compliance posture

This is important. Do not treat student career data casually.

Minimum requirements:

- consent-based talent visibility;
- private-by-default candidate profile until activated;
- role-based access checks;
- recruiter verification before search/outreach;
- audit logs for sensitive admin/recruiter actions;
- clear deletion/hide behavior for profiles;
- safe handling of uploaded resumes/profile images.

## 13. Design language rules

MentorGO and HunterGO screens must match LerenGO:

- same app shell/nav rhythm;
- same card density;
- same button hierarchy;
- same typography scale;
- same spacing system;
- same muted, serious copywriting;
- same border radius and elevation;
- same empty/loading/error state language.

Codex should inspect existing screens before building each new screen.

## 14. Recommended implementation order

1. Add shared module constants/navigation metadata.
2. Add route shells for MentorGO and HunterGO.
3. Add data models/migrations.
4. Implement MentorGO read-only directory/profile using seed/mock data if needed.
5. Implement Mentor profile editing and availability.
6. Implement Mentor booking flow/payment boundary.
7. Implement HunterGO talent profile activation/editing.
8. Implement recruiter onboarding/admin verification.
9. Implement talent search/profile view.
10. Implement opportunity/invite/pipeline flows.
11. Add final admin moderation and audit.

## 15. Hard constraints

- Do not break SkillGO/ForgeGO/CampusGO flows.
- Do not create fake mentors, fake recruiters, fake companies, or fake success claims as production content.
- Do not expose private user data.
- Do not let unverified recruiters message/search students at scale.
- Do not allow double booking in MentorGO.
- Do not make the UI look like a different product.
