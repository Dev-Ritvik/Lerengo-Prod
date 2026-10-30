# HunterGO Software Requirements Specification

## 1. Purpose

This document defines the software requirements for HunterGO, a LerenGO module for verified talent discovery, recruiter onboarding, opportunity posting, candidate search, invitations, and hiring pipeline tracking.

## 2. Scope

HunterGO includes:

- talent profile activation and editing;
- privacy/discoverability controls;
- recruiter/company onboarding;
- recruiter/company verification;
- talent search and candidate profile viewing;
- opportunity creation and publishing;
- shortlist management;
- candidate invitations;
- basic application/pipeline tracking;
- admin moderation and audit.

## 3. User roles

- `student`: candidate/talent user.
- `recruiter`: verified or pending opportunity owner.
- `company_admin`: manages company profile and recruiters, optional for later phases.
- `campus_placement`: university/campus placement actor, optional role if repo supports it.
- `admin`: LerenGO operator.

A student can be both candidate and mentor. A recruiter should not gain privileged candidate data until verified.

## 4. Suggested routes

Use existing routing conventions from the repo. Suggested logical routes:

### Student/candidate routes

- `/huntergo`
- `/huntergo/profile`
- `/huntergo/profile/edit`
- `/huntergo/opportunities`
- `/huntergo/opportunities/[opportunityId]`
- `/huntergo/invites`
- `/huntergo/applications`
- `/huntergo/settings/privacy`

### Recruiter routes

- `/huntergo/recruiter`
- `/huntergo/recruiter/onboarding`
- `/huntergo/recruiter/search`
- `/huntergo/recruiter/candidates/[candidateId]`
- `/huntergo/recruiter/shortlists`
- `/huntergo/recruiter/opportunities`
- `/huntergo/recruiter/opportunities/new`
- `/huntergo/recruiter/opportunities/[opportunityId]`
- `/huntergo/recruiter/opportunities/[opportunityId]/pipeline`

### Admin routes

- `/admin/huntergo/recruiters`
- `/admin/huntergo/companies`
- `/admin/huntergo/opportunities`
- `/admin/huntergo/reports`
- `/admin/huntergo/settings`

## 5. Data entities

### 5.1 TalentProfile

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `userId` | string/uuid | Yes | FK to user |
| `slug` | string | No | Public/share link slug if enabled |
| `displayName` | string | Yes | Can default from user |
| `profileImageUrl` | string/url | No | Candidate avatar |
| `headline` | string | Yes | Candidate headline |
| `summary` | text | No | Recruiter-facing intro |
| `targetRoles` | string[] | Yes | Desired roles |
| `openToTypes` | enum[] | Yes | internship/full-time/freelance/research/founding-team/etc. |
| `skillsVerified` | json/string[] | No | From SkillGO/proof sources |
| `skillsSelfDeclared` | string[] | No | Candidate-entered |
| `portfolioLinks` | json | No | GitHub, LinkedIn, website, resume, etc. |
| `location` | string | No | City/country or remote |
| `timezone` | string | No | IANA timezone |
| `availabilityStatus` | enum | Yes | `available_now`, `available_from_date`, `not_available`, `open_to_discuss` |
| `availableFrom` | date | No | Required for available_from_date |
| `graduationYear` | integer | No | Optional |
| `universityId` | string/uuid | No | If CampusGO has university model |
| `discoverability` | enum | Yes | `private`, `lerengo_only`, `verified_recruiters`, `public_link` |
| `isSearchable` | boolean | Yes | Derived or explicit |
| `profileCompletionScore` | integer | No | 0-100 |
| `lastActiveAt` | datetime | No | For sorting |
| `createdAt` | datetime | Yes |  |
| `updatedAt` | datetime | Yes |  |

### 5.2 TalentProofSignal

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `talentProfileId` | string/uuid | Yes | FK |
| `sourceModule` | enum | Yes | `skillgo`, `forgego`, `campusgo`, `mentorgo`, `manual` |
| `sourceEntityId` | string/uuid | No | Linked certificate/project/review/etc. |
| `title` | string | Yes | Human-readable proof |
| `description` | text | No |  |
| `signalType` | enum | Yes | certificate/project/prototype/validation/recommendation/assessment |
| `visibility` | enum | Yes | public/recruiter_only/private |
| `createdAt` | datetime | Yes |  |

### 5.3 CompanyProfile

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `name` | string | Yes | Company/org name |
| `logoUrl` | string/url | No |  |
| `website` | string/url | Yes | Verification signal |
| `description` | text | No |  |
| `industry` | string | No |  |
| `sizeRange` | string | No |  |
| `location` | string | No |  |
| `verificationStatus` | enum | Yes | `pending`, `verified`, `rejected`, `suspended` |
| `createdAt` | datetime | Yes |  |
| `updatedAt` | datetime | Yes |  |

### 5.4 RecruiterProfile

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `userId` | string/uuid | Yes | FK |
| `companyProfileId` | string/uuid | No | FK |
| `fullName` | string | Yes |  |
| `workEmail` | string | Yes | Prefer domain verification |
| `title` | string | No | Recruiter/founder/hiring manager/etc. |
| `verificationStatus` | enum | Yes | `pending`, `verified`, `rejected`, `suspended` |
| `inviteQuotaMonthly` | integer | Yes | Abuse control |
| `invitesUsedThisMonth` | integer | Yes | Abuse control |
| `createdAt` | datetime | Yes |  |
| `updatedAt` | datetime | Yes |  |

### 5.5 Opportunity

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `companyProfileId` | string/uuid | Yes | FK |
| `createdByRecruiterId` | string/uuid | Yes | FK |
| `title` | string | Yes | Opportunity title |
| `opportunityType` | enum | Yes | internship/full-time/freelance/research/founding_team/project/campus/other |
| `description` | text | Yes |  |
| `requiredSkills` | string[] | No |  |
| `preferredSkills` | string[] | No |  |
| `locationMode` | enum | Yes | remote/on_site/hybrid |
| `locationDetails` | string | No |  |
| `duration` | string | No |  |
| `compensationText` | string | No | Range or explanation |
| `eligibility` | text | No |  |
| `applicationQuestions` | json | No | Optional |
| `status` | enum | Yes | draft/pending_review/published/paused/closed/archived |
| `createdAt` | datetime | Yes |  |
| `updatedAt` | datetime | Yes |  |

### 5.6 CandidateShortlist

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `recruiterProfileId` | string/uuid | Yes | FK |
| `talentProfileId` | string/uuid | Yes | FK |
| `opportunityId` | string/uuid | No | Optional context |
| `notes` | text | No | Private recruiter notes |
| `createdAt` | datetime | Yes |  |

### 5.7 CandidateInvite

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `recruiterProfileId` | string/uuid | Yes | FK |
| `talentProfileId` | string/uuid | Yes | FK |
| `opportunityId` | string/uuid | No | Optional direct invite if no opportunity |
| `message` | text | Yes | Recruiter note |
| `status` | enum | Yes | sent/viewed/accepted/declined/expired/withdrawn |
| `createdAt` | datetime | Yes |  |
| `updatedAt` | datetime | Yes |  |

### 5.8 CandidatePipelineItem

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `opportunityId` | string/uuid | Yes | FK |
| `talentProfileId` | string/uuid | Yes | FK |
| `recruiterProfileId` | string/uuid | Yes | FK |
| `source` | enum | Yes | invite/application/shortlist/admin |
| `stage` | enum | Yes | invited/interested/applied/screening/interview/offer/hired/rejected/withdrawn |
| `recruiterNotes` | text | No | Private to recruiter/company |
| `candidateVisibleNote` | text | No | Visible to candidate |
| `createdAt` | datetime | Yes |  |
| `updatedAt` | datetime | Yes |  |

## 6. Functional requirements

### FR-HG-001 HunterGO landing/dashboard

The system shall provide a HunterGO entry page that routes users based on role and state.

Acceptance criteria:

- Student sees talent profile activation or dashboard.
- Recruiter sees onboarding, pending verification, or recruiter dashboard.
- Admins can access admin views.
- Empty states are clear and native to LerenGO.

### FR-HG-002 Talent profile activation

The system shall allow students to activate a talent profile.

Acceptance criteria:

- Student must explicitly opt in.
- Profile starts as `private` or safe default until student publishes.
- Existing LerenGO proof signals are suggested/imported where available.
- Student can preview recruiter-facing profile before publishing.

### FR-HG-003 Talent profile editing

The system shall allow students to edit profile fields.

Acceptance criteria:

- Student can edit only their own profile unless admin.
- Profile completion indicator is shown.
- Required fields are validated.
- Privacy settings are visible and understandable.

### FR-HG-004 Discoverability/privacy controls

The system shall enforce profile visibility settings.

Acceptance criteria:

- Private profiles are not searchable.
- Recruiter access requires verified recruiter status unless profile is public link.
- Hidden contact details do not leak via API responses.
- Visibility rules are enforced server-side.

### FR-HG-005 Proof signal aggregation

The system shall display proof signals from LerenGO modules where available.

Acceptance criteria:

- SkillGO, ForgeGO, CampusGO, and MentorGO signals can be represented.
- Missing integrations should fail gracefully with manual proof support.
- Candidate can hide proof signals if privacy rules allow.

### FR-HG-006 Recruiter onboarding

The system shall allow recruiters to request access.

Acceptance criteria:

- Recruiter provides name, work email, company, role/title, website, and hiring intent.
- Recruiter remains limited until verified.
- Admin can approve/reject/suspend.

### FR-HG-007 Company profile

The system shall allow creation and verification of company profile.

Acceptance criteria:

- Company profile has required name and website.
- Company status controls opportunity publishing and candidate outreach limits.
- Suspended companies cannot create invites or opportunities.

### FR-HG-008 Talent search

The system shall allow verified recruiters to search talent.

Acceptance criteria:

- Only eligible/discoverable profiles appear.
- Search supports keyword and filters.
- Results show compact candidate cards with proof summary.
- Directory supports pagination/loading states.

### FR-HG-009 Candidate profile view

The system shall allow verified recruiters to view candidate profiles according to privacy rules.

Acceptance criteria:

- Candidate profile shows allowed fields only.
- Contact details are hidden unless student opted in or pipeline stage allows.
- Recruiter can shortlist or invite candidate.

### FR-HG-010 Shortlist management

The system shall allow recruiters to save candidates.

Acceptance criteria:

- Recruiter can add/remove candidates from shortlist.
- Recruiter private notes are not visible to candidates.
- Duplicate shortlist entries are prevented.

### FR-HG-011 Opportunity creation

The system shall allow verified recruiters to create opportunities.

Acceptance criteria:

- Required fields: title, type, description, company, location mode.
- Opportunity can be saved as draft.
- Publishing may require moderation based on config.
- Suspended/unverified recruiters cannot publish.

### FR-HG-012 Opportunity discovery for students

The system shall allow students to view relevant opportunities.

Acceptance criteria:

- Students can browse published opportunities.
- Students can filter by type, skills, location mode, and company.
- Students can open opportunity details.
- Application or interest flow is available if MVP includes it.

### FR-HG-013 Candidate invite

The system shall allow recruiters to invite candidates.

Acceptance criteria:

- Recruiter must be verified.
- Candidate must be discoverable to that recruiter.
- Recruiter invite quota is enforced.
- Candidate receives an invite record.
- Candidate can accept, decline, or ignore/expire.

### FR-HG-014 Pipeline tracking

The system shall allow recruiters to manage candidate status per opportunity.

Acceptance criteria:

- Pipeline item has a stage.
- Stage changes are persisted.
- Candidate-visible status is controlled and does not expose private recruiter notes.
- Basic audit trail exists for stage changes if repo patterns support it.

### FR-HG-015 Admin moderation

The system shall allow admins to moderate recruiters, companies, opportunities, reports, and abuse.

Acceptance criteria:

- Admin can approve/reject recruiters and companies.
- Admin can pause/remove opportunities.
- Admin can suspend abusive recruiters.
- Admin actions are logged.

## 7. Non-functional requirements

### NFR-HG-001 Security

- Enforce role-based access server-side.
- Do not expose private candidate fields in API responses.
- Recruiter notes must never be visible to candidates.
- Unverified recruiters must not access search results.

### NFR-HG-002 Privacy

- Student opt-in is mandatory for talent discovery.
- Default profile discoverability should be conservative.
- Contact details should remain private unless explicitly shared.
- Proof signals from other modules should respect their original visibility.

### NFR-HG-003 Abuse prevention

- Invite quotas required.
- Recruiter verification required before outreach.
- Report/block flow should be supported or planned.
- Suspended recruiters lose access immediately.

### NFR-HG-004 Performance

- Talent search should paginate.
- Candidate cards should not fetch heavy profile data.
- Use existing repo data-fetching/caching patterns.

### NFR-HG-005 Accessibility

- Search, filters, cards, forms, and pipeline controls must be keyboard accessible.
- Forms require proper labels, validation, and error messages.

### NFR-HG-006 Design consistency

- Reuse existing LerenGO layout/components/tokens.
- Do not introduce a job-board visual style unrelated to LerenGO.
- Keep UI calm, structured, and trust-first.

## 8. Validation rules

- Talent headline: required, max 120 characters.
- Talent summary: recommended, max 2000 characters.
- Target roles: at least 1 for published profile.
- Open-to types: at least 1 for published profile.
- Recruiter work email: required and valid.
- Company website: required for verification.
- Opportunity title: required, max 140 characters.
- Opportunity description: required.
- Invite message: required, max 2000 characters.

## 9. Edge cases

- Student disables discoverability after recruiter shortlisted them.
- Student deletes/hides project proof used in recruiter view.
- Recruiter is suspended after sending invites.
- Opportunity closes while candidate is in pipeline.
- Candidate accepts invite after opportunity is closed.
- Recruiter tries to access candidate through stale URL after losing verification.
- Multiple recruiters from same company invite same student.
- Candidate requests deletion/export of talent profile data.

## 10. MVP delivery checklist

- [ ] HunterGO routes added.
- [ ] Student talent profile activation implemented.
- [ ] Talent profile editor implemented.
- [ ] Privacy/discoverability enforcement implemented.
- [ ] Recruiter onboarding implemented.
- [ ] Company profile implemented.
- [ ] Admin recruiter/company verification implemented.
- [ ] Talent search implemented.
- [ ] Candidate profile view implemented.
- [ ] Shortlist implemented.
- [ ] Opportunity creation implemented.
- [ ] Invite flow implemented.
- [ ] Basic pipeline implemented.
- [ ] Empty/loading/error states complete.
- [ ] Authorization enforced server-side.
- [ ] Mobile layout checked.
