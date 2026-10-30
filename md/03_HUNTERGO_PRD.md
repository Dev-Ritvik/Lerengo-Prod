# HunterGO Product Requirements Document

## 1. Product summary

**HunterGO** is a LerenGO talent and headhunting module. It helps recruiters, founders, companies, campus placement teams, and opportunity owners discover verified student builders based on LerenGO proof signals: skills, certificates, projects, prototypes, campus validation, and portfolio evidence.

HunterGO should not become a generic job board. Its differentiation is verified talent intelligence from the rest of LerenGO.

## 2. Problem statement

Students struggle to get discovered because their ability is often trapped in scattered resumes, projects, certificates, and informal recommendations. Recruiters struggle to identify real builders because most profiles look similar and provide weak proof.

HunterGO connects opportunity owners with students whose learning, projects, and validation signals are already inside LerenGO.

## 3. Product thesis

The strongest headhunting product for LerenGO is not a resume database. It is a verified student talent graph.

HunterGO should answer:

- What can this student actually build?
- Which skills are proven, not just claimed?
- Which projects has the student worked on?
- Has any mentor, reviewer, or campus actor validated the work?
- Is the student open to internships, jobs, freelance work, founding teams, research roles, or project collaborations?

## 4. Goals

### Business goals

- Create a career/opportunity layer for LerenGO.
- Increase the value of SkillGO certificates and ForgeGO projects.
- Give universities and companies a reason to engage with LerenGO outcomes.
- Enable recruiter/company monetization in later phases.

### Student goals

Students should be able to:

- create or activate a talent profile;
- control visibility and privacy;
- showcase skills, proof of work, projects, and availability;
- receive relevant opportunity invites;
- apply to or express interest in opportunities;
- track pipeline status.

### Recruiter/company goals

Recruiters should be able to:

- create a verified recruiter/company profile;
- search/filter talent;
- inspect candidate proof, projects, and portfolio;
- save candidates to shortlists;
- invite candidates to opportunities;
- post opportunities;
- manage a simple hiring pipeline.

### Admin goals

Admins should be able to:

- verify recruiter/company accounts;
- moderate opportunities;
- manage reported users/content;
- audit invitations and pipeline activity;
- protect students from spam/abuse.

## 5. Target users

### Student/candidate

A LerenGO user who wants to be discovered for internships, jobs, freelance work, project collaborations, research roles, or founding teams.

### Recruiter/company/founder

An external or internal opportunity owner searching for verified student talent.

### University placement or campus team

A campus actor that may use HunterGO to surface students for campus-backed opportunities.

### Admin/talent operations

LerenGO operator responsible for verification, quality, and abuse prevention.

## 6. Core product principles

1. **Consent-first**: students must control whether they are discoverable.
2. **Proof-first**: skills and projects should matter more than inflated resume text.
3. **Trust-first**: recruiters should be verified before reaching students at scale.
4. **Low-noise**: avoid spammy job board behavior.
5. **Pipeline clarity**: both student and recruiter should know the current status.
6. **Native to LerenGO**: use SkillGO, ForgeGO, CampusGO, and MentorGO signals.

## 7. Core user journeys

### 7.1 Student activates talent profile

1. Student opens HunterGO.
2. Student sees explanation of visibility and opportunity matching.
3. Student activates talent profile.
4. System pulls existing LerenGO data where available.
5. Student edits headline, target roles, availability, skills, portfolio links, preferred opportunity types, and privacy settings.
6. Student chooses discoverability mode.
7. Student publishes profile.

### 7.2 Recruiter searches talent

1. Recruiter signs in or applies for access.
2. Admin or automated flow verifies recruiter/company.
3. Recruiter opens talent search.
4. Recruiter filters by role, skill, project type, availability, location, campus, graduation year, proof signals, and interest type.
5. Recruiter opens candidate profile.
6. Recruiter saves candidate or sends an invite.

### 7.3 Recruiter posts opportunity

1. Recruiter opens HunterGO dashboard.
2. Recruiter creates opportunity.
3. Opportunity includes role, type, skills, compensation range or stipend info where applicable, location/remote, timeline, eligibility, application questions.
4. Opportunity is published after validation/moderation if required.
5. Students can apply or be invited.

### 7.4 Recruiter invites candidate

1. Recruiter opens candidate profile.
2. Recruiter selects an opportunity or creates a direct invite.
3. Recruiter writes a message.
4. System checks invite limits and candidate visibility rules.
5. Candidate receives invite.
6. Candidate accepts, declines, or asks for more information.

### 7.5 Pipeline management

1. Recruiter views opportunity pipeline.
2. Candidate cards appear in stages.
3. Recruiter changes status: invited, interested, applied, screening, interview, offer, hired, rejected, withdrawn.
4. Candidate sees appropriate status updates.

## 8. Candidate profile requirements

Candidate profile should include:

1. Header
   - Name.
   - Profile image/avatar.
   - Headline.
   - Location/timezone.
   - Availability status.
   - Open-to types.
   - Primary CTA for recruiter: `Invite` or `Shortlist`.

2. Proof summary
   - SkillGO certificates/proof.
   - ForgeGO projects/prototypes.
   - CampusGO validation, if available.
   - MentorGO recommendations, only if explicitly public and allowed.

3. Skills
   - Verified skills.
   - Self-declared skills.
   - Skill confidence/source indicator.

4. Projects
   - Project title.
   - Role.
   - Outcome.
   - Tech stack/domain.
   - Links.
   - Validation signals.

5. Preferences
   - Target roles.
   - Opportunity types.
   - Remote/on-site/hybrid.
   - Location preference.
   - Start availability.
   - Compensation/stipend expectation, optional and privacy-controlled.

6. Portfolio links
   - GitHub.
   - LinkedIn.
   - Website.
   - Resume upload/link, optional.

7. Notes/privacy
   - Recruiter-visible summary.
   - Hidden internal/private fields should not leak.

## 9. Recruiter/company requirements

Recruiter profile should include:

- Recruiter name.
- Work email.
- Company/organization.
- Role/title.
- Company website.
- Verification status.
- Allowed invite quota.
- Opportunities posted.
- Team members, if supported later.

Company profile should include:

- Company name.
- Logo.
- Website.
- Description.
- Industry.
- Size/stage.
- Location.
- Verification status.

## 10. Opportunity requirements

Opportunity fields:

- Title.
- Company/organization.
- Opportunity type: internship, full-time, freelance, project collaboration, research role, founding team, campus role, other.
- Description.
- Required skills.
- Preferred skills.
- Location mode: remote, on-site, hybrid.
- Location details.
- Duration/timeline.
- Compensation/stipend/salary range, if available.
- Eligibility.
- Application questions.
- Status: draft, pending_review, published, paused, closed, archived.
- Created by recruiter.

## 11. Talent search/filter requirements

Filters:

- Keyword.
- Target role.
- Skill.
- Verified skill only toggle.
- Project domain.
- Project/prototype availability.
- Campus/university.
- Graduation year.
- Location/timezone.
- Remote availability.
- Open-to type.
- Availability/start date.
- Mentor/campus validation signals where allowed.

Sort options:

- Relevance.
- Recently active.
- Strongest proof signals.
- Newest profiles.
- Availability soonest.

## 12. Privacy requirements

Student privacy is central.

Discoverability modes:

- `private`: not visible to recruiters.
- `lerengo_only`: visible only inside LerenGO/campus-approved contexts.
- `verified_recruiters`: visible to verified recruiters.
- `public_link`: profile can be shared by link, if enabled.

Students should control:

- whether profile is searchable;
- whether contact details are hidden;
- whether resume is visible;
- which projects are visible;
- whether compensation expectations are visible;
- whether mentor/campus signals are visible.

Recruiters should not receive direct private contact details unless the student opts in or reaches the relevant pipeline stage.

## 13. Admin requirements

Admins should support:

- recruiter verification;
- company verification;
- opportunity moderation;
- spam/invite limits;
- report handling;
- candidate visibility override only for safety/legal reasons;
- audit logs;
- account suspension.

## 14. MVP scope

### Must-have

- HunterGO module page.
- Student talent profile activation/editing.
- Privacy/discoverability settings.
- Recruiter/company onboarding.
- Admin recruiter verification.
- Talent directory/search.
- Candidate profile view.
- Shortlist.
- Opportunity posting.
- Invite candidate to opportunity.
- Basic pipeline statuses.

### Should-have

- Resume upload/link.
- Recruiter saved searches.
- Candidate application flow.
- Student opportunity dashboard.
- Email/in-app notifications.

### Could-have

- AI-assisted matching.
- Skill-score ranking.
- Interview scheduling.
- Assessment tasks.
- Team hiring.
- Company subscription plans.

### Not MVP

- Full ATS replacement.
- Payroll/contract management.
- Automated background checks.
- Public job board SEO at scale.
- Scraping external resumes/profiles.

## 15. Success metrics

- Activated talent profiles.
- Talent profile completion rate.
- Verified recruiter count.
- Published opportunities.
- Searches performed.
- Candidate profile views.
- Shortlists created.
- Invites sent.
- Invite acceptance rate.
- Applications submitted.
- Pipeline conversion rates.
- Recruiter repeat usage.
- Student opt-out rate.
- Spam/report rate.

## 16. Risks

- If privacy is weak, students will not trust HunterGO.
- If recruiters are unverified, spam will damage the LerenGO brand.
- If candidate profiles are just resumes, HunterGO loses its differentiation.
- If filters are too broad, recruiters will see noise.
- If opportunity quality is low, students will ignore the module.
- If claims about placement are inflated, LerenGO will look unserious.

## 17. Product positioning

HunterGO should be described as:

> A verified talent discovery layer where recruiters find student builders through skills, projects, and proof of work.

Avoid positioning it as:

- a generic job portal;
- a resume dump;
- a placement guarantee;
- an unverified recruiter marketplace.
