# Graph Report - E:\lerengo\lerengo  (2026-05-07)

## Corpus Check
- 163 files · ~122,704 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 701 nodes · 1350 edges · 73 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 242 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 92 edges
2. `POST()` - 79 edges
3. `getStringValue()` - 51 edges
4. `createSupabaseAdminClient()` - 36 edges
5. `requireAdminUser()` - 24 edges
6. `middleware()` - 21 edges
7. `getCourseDetailData()` - 20 edges
8. `normalizeString()` - 18 edges
9. `createServerSupabaseClient()` - 18 edges
10. `getFirstName()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `buildIdFrontPath()`  [INFERRED]
  E:\lerengo\lerengo\web\src\app\api\webhook\route.ts → E:\lerengo\lerengo\web\src\lib\verification.ts
- `POST()` --calls--> `sha256Hex()`  [INFERRED]
  E:\lerengo\lerengo\web\src\app\api\webhook\route.ts → E:\lerengo\lerengo\web\src\lib\verification.ts
- `POST()` --calls--> `regIdLast4()`  [INFERRED]
  E:\lerengo\lerengo\web\src\app\api\webhook\route.ts → E:\lerengo\lerengo\web\src\lib\verification.ts
- `GET()` --calls--> `getVideoEmbedUrl()`  [INFERRED]
  E:\lerengo\lerengo\web\src\app\auth\sample-login\route.ts → E:\lerengo\lerengo\web\src\lib\note-content.ts
- `CertificatePage()` --calls--> `createSupabaseAdminClient()`  [INFERRED]
  E:\lerengo\lerengo\web\src\app\certificates\[certificateNumber]\page.tsx → E:\lerengo\lerengo\web\src\lib\supabase\admin.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (56): archiveNote(), assignDoubtResponder(), createAcademicMapping(), deleteCampusWeeklyItem(), deleteNote(), getArrayValue(), getListValue(), getNullableNumberValue() (+48 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): buildAssessmentReport(), buildBestAttemptMap(), compareAttempts(), resolveAssessmentBadge(), resolveAssessmentRank(), scoreCourseAssessment(), createOtpCode(), hashOtpCode() (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (44): buildAdminLoginUrl(), buildAdminRequestAccessUrl(), buildCheckEmailUrl(), createSignupAccount(), getAdminLoginProfile(), getAdminProfileByEmail(), matchUniversityIdByCampusName(), normalizeCampusToken() (+36 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (49): allowCoursesFallback(), buildCategories(), buildGeneratedAssessment(), buildGeneratedAssessmentQuestions(), buildGeneratedModules(), buildPartnerSignals(), coursesBackendUsesFallback(), deriveCertificateSummary() (+41 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (14): buildNoteCard(), buildNoteTitle(), CertificatePage(), CommunityPage(), CommunityPostPage(), formatCount(), formatCurrency(), formatDate() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (23): handleDiscussionFormSubmit(), handleDiscussionPostSubmit(), handlePartnerFormSubmit(), handlePartnerRequestSubmit(), resolvePlayback(), getRequiredEnv(), buildLockReason(), buildSigninRedirect() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (34): copyCookies(), getConfiguredAdminOrigin(), getConfiguredCampusOrigin(), getConfiguredCoursesOrigin(), getConfiguredLabsOrigin(), getConfiguredMainOrigin(), getConfiguredOrigin(), getDerivedAdminOrigin() (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (27): asStringArray(), buildFallbackContent(), buildFullTextFromUnits(), buildLegacyUnitsFromBase(), buildPreviewStructuredNoteContent(), buildStructuredNoteContentFromInputs(), buildStructuredUnitsFromInputs(), buildSummaryFromNotes() (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (21): buildCampusAnalytics(), buildCampusUpdates(), buildDiscussionCard(), buildExamCard(), buildProjectCard(), buildThisWeekPayload(), buildTopSubjectCard(), deterministicTeamSize() (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (22): buildCampusRoleLabel(), buildLeaderboardEntries(), buildMentorActions(), buildMentorApprovalLabel(), buildMentorAvailabilityLabel(), buildMentorDescription(), buildMentorRoleLabel(), buildMentorshipData() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (14): parseBoolean(), resolveCoursesFallbackAvailability(), resolveSampleLoginAvailability(), checkLocalRateLimit(), getRateLimitStore(), resolveClientIp(), buildRateLimitResponse(), checkPersistentRateLimit() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (18): asciiSlice(), buildIdFrontPath(), evaluateVerification(), findRegIdCandidate(), firstToken(), hasDomainSignal(), hasImageExtension(), hasUniversityKeyword() (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (14): getAppUser(), requireSessionUser(), requireUniversityScopedUser(), CourseTestPage(), getAuthAvatarUrl(), getAuthAvatarUrlWithFallback(), getSessionProfileForApi(), getSessionUser() (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (6): getUnitMeta(), handlePurchase(), loadCheckoutScript(), parseNotesBlocks(), renderUnitCategory(), valueCount()

### Community 14 - "Community 14"
Cohesion: 0.27
Nodes (12): buildCommentTree(), buildCommunityData(), buildCommunityLeaderboardData(), buildCommunityPostDetail(), buildContributorEntries(), buildDiscussion(), buildMatchCards(), buildRoleLabel() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (5): formatRequestTypeLabel(), handleCreateRequest(), handleSendChat(), handleUpdateRequest(), loadMentorThread()

### Community 16 - "Community 16"
Cohesion: 0.27
Nodes (8): ensureAppUser(), ensureAuthUser(), ensureBucket(), ensureNote(), ensureNoteAccess(), ensureUniversity(), findAuthUserByEmail(), main()

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (4): handleDrop(), handleUploadSubmit(), setSelectedFile(), validateIdFile()

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (1): formatDateTime()

### Community 19 - "Community 19"
Cohesion: 0.52
Nodes (5): clearUnlockTimer(), handleClick(), hardNavigate(), isModifiedClick(), resetTransitionState()

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (0):

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (2): handlePurchase(), loadCheckoutScript()

### Community 22 - "Community 22"
Cohesion: 0.6
Nodes (3): getUniversityPreset(), handleQueryChange(), normalize()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (0):

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (0):

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (2): handleQueryChange(), normalize()

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (0):

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (2): handleNavigate(), isModifiedClick()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (0):

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0):

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0):

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0):

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0):

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0):

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0):

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0):

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0):

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0):

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0):

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0):

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0):

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0):

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0):

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0):

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0):

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0):

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0):

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0):

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0):

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0):

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0):

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0):

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0):

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0):

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0):

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0):

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0):

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0):

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0):

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0):

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0):

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0):

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0):

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0):

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0):

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0):

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0):

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0):

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0):

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0):

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0):

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (0):

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (0):

## Knowledge Gaps
- **Thin community `Community 29`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `loading.tsx`, `GlobalLoading()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `page.tsx`, `AboutPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `AdminAuthShell()`, `admin-auth-shell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `page.tsx`, `getModuleGroups()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `page.tsx`, `isMissingCoursesBackend()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `page.tsx`, `getStatusClassName()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `structured-note-unit-fields.tsx`, `getUnitBySlot()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `page.tsx`, `AdminOtpPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `weekly-discussion-card.tsx`, `WeeklyDiscussionCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `weekly-exam-card.tsx`, `WeeklyExamCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `weekly-project-card.tsx`, `WeeklyProjectCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `weekly-top-subject-card.tsx`, `WeeklyTopSubjectCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `project-board-shell.tsx`, `updatePartnerStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `page.tsx`, `ContactPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `page.tsx`, `formatPrice()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `page.tsx`, `DashboardRedirectPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `page.tsx`, `getStatusTone()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `page.tsx`, `PrivacyPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `page.tsx`, `RefundPolicyPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `page.tsx`, `TermsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `info-page-loading.tsx`, `InfoPageLoading()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `page-transition-controller.tsx`, `PageTransitionController()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `reveal-on-scroll.tsx`, `RevealOnScroll()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `scroll-reveal-controller.tsx`, `ScrollRevealController()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `site-footer.tsx`, `SiteFooter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `createBrowserSupabaseClient()`, `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `publish-action-area.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `post-detail-shell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `course-assessment-panel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `info-page-shell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `academics.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `courses-seed.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GET()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 14`?**
  _High betweenness centrality (0.304) - this node is a cross-community bridge._
- **Why does `POST()` connect `Community 1` to `Community 0`, `Community 3`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Why does `createSupabaseAdminClient()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 14`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Are the 64 inferred relationships involving `GET()` (e.g. with `getRequestHost()` and `getRequestProtocol()`) actually correct?**
  _`GET()` has 64 INFERRED edges - model-reasoned connections that need verification._
- **Are the 37 inferred relationships involving `POST()` (e.g. with `requireVerifiedProfileForApi()` and `getRouteAdminClient()`) actually correct?**
  _`POST()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 34 inferred relationships involving `createSupabaseAdminClient()` (e.g. with `reviewCommunityReport()` and `saveCommunityWeeklyHighlight()`) actually correct?**
  _`createSupabaseAdminClient()` has 34 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `requireAdminUser()` (e.g. with `reviewCommunityReport()` and `saveCommunityWeeklyHighlight()`) actually correct?**
  _`requireAdminUser()` has 21 INFERRED edges - model-reasoned connections that need verification._
