# MentorGO Software Requirements Specification

## 1. Purpose

This document defines the functional and non-functional software requirements for MentorGO, a LerenGO module for mentor discovery, profile management, availability management, paid booking, and session tracking.

## 2. Scope

MentorGO includes:

- mentor directory;
- full mentor profile page;
- mentor profile editor;
- mentor availability management;
- session type and pricing management;
- booking flow;
- payment integration boundary;
- booking/session dashboards;
- reviews;
- admin verification/moderation.

## 3. User roles

- `student`: can browse mentors, book sessions, manage own bookings, leave reviews.
- `mentor`: can manage own mentor profile, availability, session types, bookings, and payout details.
- `admin`: can manage mentors, bookings, disputes, categories, verification, and platform settings.

A user may have multiple roles. Example: a mentor can also be a student.

## 4. Suggested routes

Use the existing routing conventions from the repository. Suggested logical routes:

### Public / authenticated student routes

- `/mentorgo`
- `/mentorgo/mentors`
- `/mentorgo/mentors/[mentorId]`
- `/mentorgo/mentors/[mentorId]/book`
- `/mentorgo/bookings`
- `/mentorgo/bookings/[bookingId]`

### Mentor routes

- `/mentorgo/dashboard`
- `/mentorgo/dashboard/profile`
- `/mentorgo/dashboard/availability`
- `/mentorgo/dashboard/session-types`
- `/mentorgo/dashboard/bookings`
- `/mentorgo/dashboard/earnings`
- `/mentorgo/dashboard/reviews`

### Admin routes

- `/admin/mentorgo/mentors`
- `/admin/mentorgo/mentors/[mentorId]`
- `/admin/mentorgo/bookings`
- `/admin/mentorgo/disputes`
- `/admin/mentorgo/categories`
- `/admin/mentorgo/settings`

## 5. Data entities

### 5.1 MentorProfile

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `userId` | string/uuid | Yes | Links to user |
| `slug` | string | Yes | Public profile slug if supported |
| `displayName` | string | Yes | Can default from user |
| `profileImageUrl` | string/url | No | Mentor display picture |
| `headline` | string | Yes | Short title/value line |
| `affiliation` | string | No | Company, university, etc. |
| `mentorType` | enum | Yes | `industry_expert`, `faculty`, `alumni`, `senior_student`, `founder`, `operator`, `other` |
| `shortBio` | string | Yes | For cards |
| `longBio` | text | Yes | Full profile |
| `expertiseTags` | string[] | Yes | Search/filter |
| `skills` | string[] | No | More granular skill tags |
| `industries` | string[] | No | Optional |
| `languages` | string[] | No | Optional |
| `timezone` | string | Yes | IANA timezone |
| `country` | string | No | Optional |
| `city` | string | No | Optional |
| `socialLinks` | json | No | LinkedIn, GitHub, website, etc. |
| `credentials` | json/text | No | Education, experience, certifications |
| `verificationStatus` | enum | Yes | `draft`, `submitted`, `approved`, `rejected`, `suspended` |
| `isPublished` | boolean | Yes | Only approved/published mentors appear publicly |
| `averageRating` | decimal | No | Derived field |
| `reviewCount` | integer | No | Derived field |
| `startingPrice` | decimal | No | Derived from session types |
| `createdAt` | datetime | Yes |  |
| `updatedAt` | datetime | Yes |  |

### 5.2 MentorSessionType

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `mentorProfileId` | string/uuid | Yes | FK |
| `title` | string | Yes | Example: Project Review |
| `description` | text | Yes | What happens in session |
| `durationMinutes` | integer | Yes | e.g. 30, 45, 60 |
| `priceAmount` | decimal | Yes | Price before fees |
| `currency` | string | Yes | ISO currency code |
| `outcomes` | string[] | No | What student gets |
| `isActive` | boolean | Yes | Visible/bookable |
| `createdAt` | datetime | Yes |  |
| `updatedAt` | datetime | Yes |  |

### 5.3 MentorAvailabilityRule

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `mentorProfileId` | string/uuid | Yes | FK |
| `dayOfWeek` | integer | No | 0-6 for recurring weekly availability |
| `startTimeLocal` | time | Yes | Mentor timezone |
| `endTimeLocal` | time | Yes | Mentor timezone |
| `timezone` | string | Yes | IANA timezone |
| `isRecurring` | boolean | Yes | Weekly recurring or one-off |
| `specificDate` | date | No | Required for one-off slot |
| `isActive` | boolean | Yes |  |

### 5.4 MentorBlockedTime

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `mentorProfileId` | string/uuid | Yes | FK |
| `startAt` | datetime | Yes | UTC |
| `endAt` | datetime | Yes | UTC |
| `reason` | string | No | Internal note |

### 5.5 MentorBooking

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `studentUserId` | string/uuid | Yes | FK |
| `mentorProfileId` | string/uuid | Yes | FK |
| `sessionTypeId` | string/uuid | Yes | FK |
| `startAt` | datetime | Yes | UTC |
| `endAt` | datetime | Yes | UTC |
| `timezoneSnapshot` | string | Yes | Student selected timezone |
| `studentGoal` | text | Yes | Context for mentor |
| `status` | enum | Yes | Booking lifecycle |
| `priceAmountSnapshot` | decimal | Yes | Locked at booking time |
| `platformFeeSnapshot` | decimal | No | Locked at booking time |
| `currencySnapshot` | string | Yes | Locked at booking time |
| `paymentStatus` | enum | Yes | `not_required`, `pending`, `paid`, `failed`, `refunded`, `partial_refund` |
| `paymentProvider` | string | No | e.g. razorpay/stripe/manual |
| `paymentReferenceId` | string | No | Provider ref |
| `meetingUrl` | string/url | No | Generated or manual |
| `createdAt` | datetime | Yes |  |
| `updatedAt` | datetime | Yes |  |

### 5.6 MentorReview

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | string/uuid | Yes | Primary key |
| `bookingId` | string/uuid | Yes | FK |
| `studentUserId` | string/uuid | Yes | FK |
| `mentorProfileId` | string/uuid | Yes | FK |
| `rating` | integer | Yes | 1-5 |
| `reviewText` | text | No | Optional |
| `isPublic` | boolean | Yes | Default true, admin can hide |
| `createdAt` | datetime | Yes |  |

## 6. Functional requirements

### FR-MG-001 Mentor directory

The system shall display published mentors in a searchable directory.

Acceptance criteria:

- Only `approved` and `isPublished = true` mentors appear.
- Cards include display picture, name, headline, expertise tags, rating, starting price, and CTA.
- Directory supports loading, empty, and error states.
- Directory works on mobile and desktop.

### FR-MG-002 Directory filters

The system shall allow users to filter mentors.

Acceptance criteria:

- Filters include keyword, expertise/category, price range, availability, language, mentor type, and rating where data exists.
- Clearing filters returns the full result set.
- URL query params should reflect filters if that matches existing repo convention.

### FR-MG-003 Mentor profile detail

The system shall display a detailed mentor profile.

Acceptance criteria:

- Profile page includes all major public sections: header, about, expertise, credentials, session offerings, availability, reviews, policies, links.
- If a field is missing, the UI should gracefully hide that section or show a clean placeholder.
- Primary CTA remains visible near booking areas.

### FR-MG-004 Mentor profile edit

The system shall allow mentors to create and edit their profile.

Acceptance criteria:

- Mentor can edit only their own profile unless admin.
- Required fields are validated before publishing/submission.
- Changes to sensitive credibility fields may require admin re-approval.
- Profile completion indicator is shown.

### FR-MG-005 Profile image upload

The system shall allow mentors to upload/change display picture.

Acceptance criteria:

- Upload supports common image formats.
- Image is displayed in cards and profile page.
- System validates file size/type using existing upload conventions.
- If no image exists, show existing avatar fallback style.

### FR-MG-006 Session type management

The system shall allow mentors to create, edit, activate, and deactivate session types.

Acceptance criteria:

- Session type requires title, description, duration, price, and currency.
- Inactive session types cannot be booked.
- Existing bookings keep original price/duration snapshots.

### FR-MG-007 Availability management

The system shall allow mentors to define recurring and/or one-off availability.

Acceptance criteria:

- Mentor can add, edit, and delete availability rules.
- Mentor can block unavailable time.
- Booked time is not shown as available.
- Timezone handling is explicit.

### FR-MG-008 Slot generation

The system shall generate bookable slots from availability rules and session duration.

Acceptance criteria:

- Slots must not overlap existing bookings or blocked times.
- Slots must respect mentor timezone.
- Past slots are not bookable.
- Slot generation should be deterministic.

### FR-MG-009 Booking creation

The system shall allow students to book a mentor session.

Acceptance criteria:

- Student selects session type and slot.
- Student provides session goal/context.
- System creates booking only after payment success or pending payment state, based on payment integration.
- Double booking is prevented at transaction/database level.

### FR-MG-010 Payment integration boundary

The system shall integrate with the existing payment system if present, or expose a clean abstraction for future integration.

Acceptance criteria:

- Payment logic is not hardcoded directly into UI components.
- Booking stores payment status and provider reference.
- Failed payments do not confirm slots.
- Refund status can be represented even if automated refunds are not MVP.

### FR-MG-011 Booking dashboards

The system shall show bookings to students and mentors.

Acceptance criteria:

- Students see upcoming and past sessions.
- Mentors see upcoming, pending, completed, cancelled sessions.
- Users can open booking detail pages.
- Actions depend on booking status and role.

### FR-MG-012 Cancellation and reschedule

The system shall support cancellation and reschedule flows.

Acceptance criteria:

- Cancellation policy is visible before booking.
- Allowed cancellation actions depend on status and time window.
- Reschedule creates a clear state and avoids silent changes.
- Payment/refund impact is recorded.

### FR-MG-013 Reviews

The system shall allow students to review completed sessions.

Acceptance criteria:

- Only students with completed bookings can review.
- One review per booking.
- Rating is required; text optional.
- Admin can hide inappropriate reviews.

### FR-MG-014 Admin verification

The system shall allow admins to approve, reject, or suspend mentors.

Acceptance criteria:

- Only approved/published mentors appear publicly.
- Rejection includes optional reason.
- Suspended mentors cannot receive bookings.
- Sensitive admin actions are logged.

## 7. Non-functional requirements

### NFR-MG-001 Security

- Enforce server-side authorization for every mentor/admin action.
- Do not rely only on hidden UI controls.
- Prevent students from editing mentor data.
- Prevent mentors from viewing unrelated user payment details.

### NFR-MG-002 Privacy

- Public mentor profile should expose only mentor-approved public fields.
- Student booking context should be visible only to that student, the mentor, and admins.
- Payment data must not expose sensitive provider data beyond safe references.

### NFR-MG-003 Reliability

- Booking creation must prevent race-condition double booking.
- Payment status and booking status must not become inconsistent.
- Use database constraints/transactions where available.

### NFR-MG-004 Performance

- Directory should paginate or progressively load mentors.
- Avoid loading full mentor profiles in the directory.
- Use existing caching/data-fetching patterns from the repo.

### NFR-MG-005 Accessibility

- Cards, filters, forms, slot picker, and booking actions must be keyboard accessible.
- Images require alt text.
- Forms require labels and validation messages.

### NFR-MG-006 Design consistency

- Reuse existing LerenGO components and styles.
- Do not introduce a new visual system.
- Maintain mobile responsiveness.

## 8. Validation rules

- Mentor headline: required, max 120 characters.
- Short bio: required, max 240 characters.
- Long bio: required, recommended max 3000 characters.
- Expertise tags: required, at least 1, recommended max 8 public tags.
- Session price: required, greater than or equal to configured minimum.
- Session duration: allowed values should be configured, default `[30, 45, 60]`.
- Availability end time must be after start time.
- Booking start time must be in the future.

## 9. Edge cases

- Mentor removes a session type with future bookings.
- Mentor changes price after booking.
- Student payment succeeds but booking creation fails.
- Student tries to book same slot simultaneously with another student.
- Mentor is suspended after bookings exist.
- Student cancels after allowed refund window.
- Mentor timezone changes.
- Profile is rejected after being visible.

## 10. MVP delivery checklist

- [ ] MentorGO routes added using existing layout conventions.
- [ ] Mentor directory implemented.
- [ ] Mentor profile detail implemented.
- [ ] Mentor profile editor implemented.
- [ ] Availability model and UI implemented.
- [ ] Session type/pricing implemented.
- [ ] Booking flow implemented.
- [ ] Payment abstraction integrated or safely stubbed.
- [ ] Student bookings page implemented.
- [ ] Mentor dashboard implemented.
- [ ] Admin verification implemented.
- [ ] Reviews implemented or intentionally deferred with placeholder.
- [ ] Empty/loading/error states complete.
- [ ] Authorization enforced server-side.
- [ ] Mobile layout checked.
