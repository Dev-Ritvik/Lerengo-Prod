# MentorGO Product Requirements Document

## 1. Product summary

**MentorGO** is a LerenGO module where students discover verified mentors, view detailed mentor profiles, book paid mentoring sessions, and receive structured guidance. Mentors can create and edit their own profiles, set available time slots, manage bookings, and receive payment for sessions.

MentorGO should operate as a trust-first mentorship marketplace, not as a casual social directory.

## 2. Problem statement

Students often need specific guidance at critical points:

- choosing what to learn next;
- validating an idea;
- preparing a prototype;
- improving a project;
- preparing for internships or jobs;
- understanding research/patent/publication direction;
- getting serious feedback from someone more experienced.

Today, this support is usually scattered across personal networks, informal chats, or unreliable advice. MentorGO creates a structured, bookable system inside LerenGO.

## 3. Goals

### Business goals

- Add a monetizable mentorship layer to LerenGO.
- Increase student retention after SkillGO/ForgeGO/CampusGO activity.
- Create a marketplace for domain experts, senior students, alumni, founders, faculty, and professionals.
- Build credibility through verified mentor profiles and structured outcomes.

### User goals

Students should be able to:

- browse mentors by expertise;
- understand mentor credibility quickly;
- inspect a full mentor profile;
- see available time slots;
- book a session by paying a fee;
- manage/reschedule/cancel sessions according to policy;
- leave feedback after completed sessions.

Mentors should be able to:

- create a professional profile;
- edit profile details and profile photo/display picture;
- set expertise areas, session types, prices, and availability;
- accept or auto-confirm bookings;
- view upcoming sessions;
- manage cancellations/reschedules;
- track earnings/payout status.

Admins should be able to:

- approve/reject mentors;
- verify mentor information;
- moderate profiles;
- review bookings/disputes;
- configure categories, fees, commission, and policies.

## 4. Non-goals for MVP

The first release should not attempt to build:

- full video conferencing infrastructure;
- complex live classroom tools;
- AI mentor matching as a dependency for launch;
- multi-mentor group sessions;
- subscription plans;
- advanced payout tax workflows;
- public social feeds.

Video sessions can initially use generated meeting links or external links. The system must still store booking/session metadata.

## 5. Target users

### Student / mentee

A LerenGO user seeking help with learning, projects, careers, research, prototypes, or execution.

### Mentor

A verified expert, senior student, alumni, faculty member, founder, industry professional, or domain specialist who can provide structured guidance.

### Admin / operations

A LerenGO operator who verifies mentors, manages quality, and resolves operational issues.

## 6. Core user journeys

### 6.1 Student discovers a mentor

1. Student opens MentorGO.
2. Student sees mentor cards with photo, name, title, expertise tags, rating, price, and next available slot.
3. Student filters/searches by topic, skill, price, availability, language, and mentor type.
4. Student clicks a mentor card.
5. Student lands on full mentor profile.
6. Student reviews details, session offerings, availability, reviews, and booking rules.

### 6.2 Student books a session

1. Student selects a session type.
2. Student selects an available slot.
3. Student enters session goal/context.
4. Student confirms price, cancellation policy, and duration.
5. Student pays.
6. Booking is created with status `confirmed` or `pending_mentor_approval`, based on mentor settings.
7. Student receives confirmation and session details.
8. Mentor sees the booking in dashboard.

### 6.3 Mentor creates/edits profile

1. Mentor signs in.
2. Mentor opens Mentor Dashboard.
3. Mentor completes required profile sections.
4. Mentor uploads display picture.
5. Mentor adds bio, expertise, credentials, experience, social/proof links, session types, pricing, and availability.
6. Mentor submits profile for verification if required.
7. Admin approves/rejects profile.
8. Published profile becomes visible in the directory.

### 6.4 Mentor manages availability

1. Mentor opens availability settings.
2. Mentor defines weekly recurring slots or one-off slots.
3. Mentor blocks unavailable dates.
4. System prevents double booking.
5. Students can only book available slots.

### 6.5 Session completion and feedback

1. Session time passes.
2. Mentor/student marks session completed, or system auto-completes after a delay.
3. Student leaves rating and review.
4. Mentor receives earnings status update.

## 7. Mentor directory requirements

Mentor cards should show:

- Display picture/avatar.
- Name.
- Current title/headline.
- Organization or affiliation, if available.
- Mentor type: industry expert, faculty, alumni, senior student, founder, etc.
- Expertise tags.
- Short one-line value proposition.
- Rating and review count, if available.
- Starting price/session.
- Next available time or availability indicator.
- CTA: `View profile` or `Book session`.

Directory filters:

- Search by name, skill, domain, keyword.
- Expertise/category.
- Session topic.
- Price range.
- Availability.
- Language.
- Mentor type.
- Rating.
- Campus/university affiliation, if relevant.
- Online/offline, if supported.

Empty state:

- Explain that no mentors match filters.
- Offer reset filters.
- Suggest broader categories.

## 8. Full mentor profile requirements

The full mentor profile should include as much useful information as possible without becoming noisy.

Recommended sections:

1. Header
   - Display picture.
   - Name.
   - Headline.
   - Affiliation.
   - Verified badge, if approved.
   - Expertise tags.
   - Starting price.
   - Primary CTA: `Book a session`.

2. About
   - Long-form mentor bio.
   - Mentoring philosophy.
   - Who this mentor can help.

3. Expertise
   - Domains.
   - Skills.
   - Tools/technologies.
   - Industries.

4. Experience and credentials
   - Work experience.
   - Education.
   - Certifications.
   - Projects.
   - Publications/patents, if relevant.

5. Session offerings
   - Session title.
   - Duration.
   - Price.
   - Description.
   - Best for / outcomes.

6. Availability
   - Calendar or slot picker.
   - Timezone handling.
   - Available dates/times.

7. Reviews
   - Rating average.
   - Review cards.
   - Review count.

8. Policies
   - Cancellation policy.
   - Reschedule policy.
   - Refund policy.
   - Response time expectations.

9. Links
   - LinkedIn.
   - Portfolio.
   - GitHub.
   - Website.
   - Other proof links.

## 9. Booking and payment requirements

Booking requires:

- Student account.
- Mentor ID.
- Session type ID.
- Slot ID or start/end time.
- Session context/message.
- Price snapshot.
- Payment status.
- Booking status.

Supported booking statuses:

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

Payment MVP options:

- If payment integration exists, use existing payment provider.
- If not, implement payment abstraction/interface and a safe placeholder state.
- Do not hardcode payment logic into UI components.

Pricing fields:

- Currency.
- Base price.
- Platform fee/commission.
- Tax/extra fee placeholder if needed.
- Final amount charged.
- Mentor payout amount.

## 10. Mentor dashboard requirements

Mentor dashboard sections:

- Profile completion status.
- Profile editor.
- Verification status.
- Availability manager.
- Session types/pricing.
- Upcoming bookings.
- Past bookings.
- Cancellation/reschedule requests.
- Earnings/payouts.
- Reviews.
- Settings.

Profile completion meter should encourage mentors to fill enough information to make the profile credible.

## 11. Admin requirements

Admin panel should support:

- View mentor applications.
- Approve/reject/suspend mentor.
- Edit or moderate inappropriate profile content.
- View booking list.
- Handle disputes/refunds.
- Configure categories.
- Configure platform commission.
- View reports/flags.
- Audit sensitive actions.

## 12. Permissions

| Action | Student | Mentor | Admin |
|---|---:|---:|---:|
| Browse mentors | Yes | Yes | Yes |
| View mentor profile | Yes | Yes | Yes |
| Book session | Yes | Optional | Yes |
| Edit own mentor profile | No | Yes | Yes |
| Edit any mentor profile | No | No | Yes |
| Set own availability | No | Yes | Yes |
| Approve mentor | No | No | Yes |
| View own bookings | Yes | Yes | Yes |
| View all bookings | No | No | Yes |
| Manage disputes | No | No | Yes |

## 13. Success metrics

MVP metrics:

- Number of published mentors.
- Mentor profile completion rate.
- Directory-to-profile click-through rate.
- Profile-to-booking conversion rate.
- Paid booking count.
- Completed session count.
- Cancellation/no-show rate.
- Average rating.
- Repeat booking rate.
- Gross mentorship revenue.
- Mentor response time.

## 14. Risks

- Low mentor quality damages trust.
- Fake or inflated mentor credentials create legal/brand risk.
- Payment/refund confusion creates support load.
- Poor availability handling causes double booking.
- Too many unverified mentors make the marketplace noisy.
- MentorGO can cannibalize CampusGO mentorship if the roles are not clear.

## 15. Product positioning

MentorGO should be described as:

> Book focused guidance from verified mentors who can help you learn, build, validate, and move faster.

Avoid positioning it as:

- a social network;
- a therapy platform;
- a generic tutoring marketplace;
- a random expert marketplace disconnected from LerenGO.
