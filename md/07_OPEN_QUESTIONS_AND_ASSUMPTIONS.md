# Open Questions and Assumptions

## 1. Assumptions made

Because some product details were not specified, these assumptions are used in the PRD/SRS files.

### MentorGO assumptions

1. MentorGO is a paid mentorship marketplace inside LerenGO.
2. Students are the primary buyers/bookers.
3. Mentors can be industry experts, faculty, alumni, founders, senior students, or operators.
4. Mentors should edit their own profiles.
5. Mentor display picture is required or strongly encouraged.
6. Mentor profiles require admin approval before public listing.
7. Students can book available/free time slots.
8. Bookings require payment or at least a payment integration boundary.
9. Video calling can initially be external-link based.
10. Admins need verification, moderation, refund/dispute visibility, and quality controls.

### HunterGO assumptions

1. HunterGO is a verified talent/headhunting platform, not a generic job board.
2. Students must opt in before being discoverable.
3. Recruiters/companies must be verified before searching or contacting students.
4. Talent profiles should use proof signals from SkillGO, ForgeGO, CampusGO, and eventually MentorGO.
5. Recruiters can post opportunities and invite candidates.
6. A simple pipeline is enough for MVP.
7. Candidate privacy and anti-spam controls are mandatory.

## 2. Product questions to answer before final production launch

### MentorGO questions

1. Who can become a mentor?
   - Only approved external experts?
   - Faculty?
   - Alumni?
   - Senior students?
   - Anyone after admin approval?

2. Is mentor approval manual, automatic, or hybrid?

3. What payment provider should be used?
   - Razorpay?
   - Stripe?
   - Manual payment?
   - Existing LerenGO payment provider?

4. What currency/countries are supported at launch?

5. What is the platform commission?

6. Do mentors receive payouts through the platform in MVP, or is payout tracked manually first?

7. Should mentors approve each booking manually, or should bookings auto-confirm after payment?

8. What cancellation/refund policy should apply?

9. Are sessions online only, or can campus/offline sessions exist?

10. Should students be able to message mentors before booking?

11. Should reviews be public immediately, admin-moderated, or mentor-reply enabled?

12. Should mentor profile pages be public on the web or accessible only after login?

### HunterGO questions

1. Who are the first recruiters?
   - Companies?
   - Startups?
   - University placement teams?
   - Internal LerenGO opportunity managers?

2. Is HunterGO paid for recruiters from day one, or free during MVP?

3. Should students apply to opportunities, or should HunterGO begin only with recruiter invitations?

4. Should candidate contact details remain hidden until candidate accepts invite?

5. What student data can recruiters see by default?

6. Which SkillGO/ForgeGO/CampusGO signals currently exist in the database?

7. Should resumes be required, optional, or avoided in favor of proof-of-work?

8. Should HunterGO support campus-restricted opportunities?

9. Should companies have multiple recruiter seats?

10. What anti-spam limit should be used for recruiter invites?

11. Should students be able to block/report recruiters?

12. Should HunterGO include salary/stipend fields at MVP?

## 3. Strategic recommendation

Do not launch HunterGO as a normal job board. That would make it weak and generic.

The sharper positioning is:

> HunterGO helps opportunity owners discover verified student builders using proof from the LerenGO ecosystem.

Do not launch MentorGO as a random mentor directory either. It should be tied to the student journey:

- learn better;
- build better;
- validate faster;
- prepare for opportunities.

## 4. MVP decision defaults if unanswered

If the founder does not answer the questions above, use these defaults:

### MentorGO default decisions

- Manual mentor approval by admin.
- Online sessions only.
- External meeting links for MVP.
- Auto-confirm bookings after successful payment.
- 30/45/60-minute session durations.
- Public mentor profiles visible to logged-in users only.
- Student can review after completed session.
- Platform commission stored as configurable setting.
- Payment provider abstracted if not already chosen.

### HunterGO default decisions

- Student profiles private by default.
- Student must opt in to become discoverable.
- Recruiters must be verified manually.
- Candidate contact info hidden until student accepts invite.
- Recruiter invite quota enforced monthly.
- Opportunity posting allowed only for verified recruiters.
- Pipeline stages kept simple for MVP.
- Resume optional, proof-of-work preferred.

## 5. Brutal product warning

The risk is not that these modules are hard to code. The risk is that they become bloated, generic, and untrusted.

MentorGO fails if mentor quality is weak, availability is unreliable, or payment/refund rules are unclear.

HunterGO fails if it becomes another resume/job board without verified proof, privacy, and recruiter quality control.

Build the trust layer first. Marketplace liquidity comes later.
