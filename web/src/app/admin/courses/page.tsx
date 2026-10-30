import Link from "next/link";
import { resolveCoursesAppUrl } from "@/lib/app-url";
import { resolveAssessmentBadge } from "@/lib/assessment-reporting";
import { COURSES_SCHEMA_HINT } from "@/lib/courses";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  saveCourseAssessmentEntry,
  saveCourseCatalogEntry,
  saveCourseLessonEntry,
  saveCourseModuleEntry,
} from "./actions";
import shared from "../workspace.module.css";
import styles from "./courses.module.css";

type Props = {
  searchParams: Promise<{
    course?: string;
    error?: string;
    success?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "One or more course fields are invalid.",
  invalid_questions: "Assessment questions must be valid JSON array data.",
  save_failed: "Could not save the course backend data.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  assessment_created: "Final assessment created.",
  assessment_saved: "Final assessment updated.",
  course_created: "Course created.",
  course_saved: "Course updated.",
  lesson_created: "Lesson created.",
  lesson_saved: "Lesson updated.",
  module_created: "Module created.",
  module_saved: "Module updated.",
};

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type CourseModuleRow = Database["public"]["Tables"]["course_modules"]["Row"];
type CourseLessonRow = Database["public"]["Tables"]["course_lessons"]["Row"];
type CourseAssessmentRow = Database["public"]["Tables"]["course_assessments"]["Row"];

function isMissingCoursesBackend(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();

  return (
    normalized.includes("courses") ||
    normalized.includes("course_modules") ||
    normalized.includes("course_lessons") ||
    normalized.includes("course_assessments")
  ) && (
    normalized.includes("schema cache") ||
    normalized.includes("not found") ||
    normalized.includes("relation") ||
    normalized.includes("does not exist")
  );
}

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdminUser();
  const admin = createSupabaseAdminClient();
  const coursesUrl = resolveCoursesAppUrl();

  const [coursesResult, enrollmentsResult, lessonsCountResult] = await Promise.all([
    admin.from("courses").select("*").order("sort_order", { ascending: true }),
    admin.from("course_enrollments").select("id", { count: "exact", head: true }),
    admin.from("course_lessons").select("id", { count: "exact", head: true }),
  ]);

  const schemaMissing =
    isMissingCoursesBackend(coursesResult.error) ||
    isMissingCoursesBackend(enrollmentsResult.error) ||
    isMissingCoursesBackend(lessonsCountResult.error);

  if (!schemaMissing && (coursesResult.error || enrollmentsResult.error || lessonsCountResult.error)) {
    throw new Error(
      coursesResult.error?.message ||
        enrollmentsResult.error?.message ||
        lessonsCountResult.error?.message ||
        "Failed to load course admin.",
    );
  }

  const courses: CourseRow[] = schemaMissing ? [] : ((coursesResult.data ?? []) as CourseRow[]);
  const selectedCourse =
    courses.find((item) => item.slug === params.course) ??
    courses[0] ??
    null;

  const [modulesResult, assessmentResult, courseAttemptsResult, certificateCountResult] = selectedCourse
    ? await Promise.all([
        admin
          .from("course_modules")
          .select("*")
          .eq("course_id", selectedCourse.id)
          .order("sort_order", { ascending: true }),
        admin
          .from("course_assessments")
          .select("*")
          .eq("course_id", selectedCourse.id)
          .eq("kind", "final")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("course_assessment_attempts")
          .select("*")
          .eq("course_id", selectedCourse.id)
          .order("submitted_at", { ascending: false }),
        admin
          .from("course_certificates")
          .select("id", { count: "exact", head: true })
          .eq("course_id", selectedCourse.id),
      ])
    : [{ data: [], error: null }, { data: null, error: null }, { data: [], error: null }, { count: 0, error: null }];

  if (!schemaMissing && (modulesResult.error || assessmentResult.error || courseAttemptsResult.error || certificateCountResult.error)) {
    throw new Error(
      modulesResult.error?.message ||
        assessmentResult.error?.message ||
        courseAttemptsResult.error?.message ||
        certificateCountResult.error?.message ||
        "Failed to load course detail.",
    );
  }

  const modules = (modulesResult.data ?? []) as CourseModuleRow[];
  const moduleIds = modules.map((item) => item.id);
  const lessonsResult =
    selectedCourse && moduleIds.length > 0
      ? await admin
          .from("course_lessons")
          .select("*")
          .in("module_id", moduleIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

  if (!schemaMissing && lessonsResult.error) {
    throw new Error(lessonsResult.error.message || "Failed to load course lessons.");
  }

  const lessons = (lessonsResult.data ?? []) as CourseLessonRow[];
  const assessment = (assessmentResult.data ?? null) as CourseAssessmentRow | null;
  const courseAttempts = (courseAttemptsResult.data ?? []) as Database["public"]["Tables"]["course_assessment_attempts"]["Row"][];
  const lessonsByModuleId = new Map<string, CourseLessonRow[]>();
  for (const lesson of lessons) {
    const current = lessonsByModuleId.get(lesson.module_id) ?? [];
    current.push(lesson);
    lessonsByModuleId.set(lesson.module_id, current);
  }

  const performerUserIds = Array.from(new Set(courseAttempts.map((attempt) => attempt.user_id)));
  const performersResult =
    selectedCourse && performerUserIds.length > 0
      ? await admin.from("users").select("id, full_name, email").in("id", performerUserIds)
      : { data: [], error: null };

  if (!schemaMissing && performersResult.error) {
    throw new Error(performersResult.error.message || "Failed to load course performers.");
  }

  const performersById = new Map(
    ((performersResult.data ?? []) as Array<{ id: string; full_name: string | null; email: string }>)
      .map((user) => [user.id, user.full_name?.trim() || user.email]),
  );
  const bestAttemptsByUser = new Map<string, typeof courseAttempts[number]>();
  for (const attempt of courseAttempts) {
    const current = bestAttemptsByUser.get(attempt.user_id);
    if (
      !current ||
      attempt.score_percent > current.score_percent ||
      (attempt.score_percent === current.score_percent &&
        new Date(attempt.submitted_at).getTime() < new Date(current.submitted_at).getTime())
    ) {
      bestAttemptsByUser.set(attempt.user_id, attempt);
    }
  }
  const topCoursePerformers = Array.from(bestAttemptsByUser.values())
    .sort((left, right) => {
      if (right.score_percent !== left.score_percent) {
        return right.score_percent - left.score_percent;
      }

      return new Date(left.submitted_at).getTime() - new Date(right.submitted_at).getTime();
    })
    .slice(0, 5);

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "Course action failed." : null;
  const successMessage = params.success ? SUCCESS_MESSAGES[params.success] ?? "Course data updated." : null;

  return (
    <main className={`shell ${shared.page}`}>
      <section className={shared.topbar}>
        <div className={shared.titleWrap}>
          <p className={shared.eyebrow}>Admin Workspace</p>
          <h1 className={shared.title}>SkillGO Management</h1>
          <p className={shared.subtitle}>
            Manage paid learning catalog entries, private lesson links, and final assessment flow for the SkillGO lane.
          </p>
        </div>
        <div className={shared.actions}>
          <Link className="button secondary small" href="/admin/surfaces">
            Switch lane
          </Link>
          <Link className="button secondary small" href="/admin">Admin Dashboard</Link>
          <a className="button secondary small" href={`${coursesUrl}/courses`}>SkillGO</a>
        </div>
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      {schemaMissing ? (
        <section className={shared.panel}>
          <div className={shared.emptyState}>
            <h3 className={shared.emptyStateTitle}>SkillGO schema not applied yet</h3>
            <p className={shared.emptyStateBody}>{COURSES_SCHEMA_HINT}</p>
          </div>
        </section>
      ) : (
        <>
          <section className={shared.statsGrid}>
            <article className={shared.statCard}><span className={shared.statValue}>{courses.length}</span><span className={shared.statLabel}>Catalog entries</span></article>
            <article className={shared.statCard}><span className={shared.statValue}>{courses.filter((item) => item.is_published).length}</span><span className={shared.statLabel}>Published courses</span></article>
            <article className={shared.statCard}><span className={shared.statValue}>{lessonsCountResult.count ?? 0}</span><span className={shared.statLabel}>Lessons</span></article>
            <article className={shared.statCard}><span className={shared.statValue}>{enrollmentsResult.count ?? 0}</span><span className={shared.statLabel}>Enrollments</span></article>
          </section>

          <section className={`${shared.panel} ${styles.catalogGrid}`}>
            <div className={styles.courseList}>
              <div className={shared.sectionHeader}>
                <h2 className={shared.sectionTitle}>Catalog</h2>
                <p className={shared.sectionSubtitle}>Choose a course to edit its paid program details and backend structure.</p>
              </div>

              {courses.map((course) => (
                <Link
                  className={`${styles.courseLink} ${selectedCourse?.id === course.id ? styles.courseLinkActive : ""}`}
                  href={`/admin/courses?course=${course.slug}`}
                  key={course.id}
                >
                  <div>
                    <p className={shared.primaryText}>{course.title}</p>
                    <p className={shared.mutedText}>{course.provider_name} / {course.program_type}</p>
                  </div>
                  <div className={styles.courseSignals}>
                    <span className={shared.pill}>{course.focus_area}</span>
                    <span className={shared.pill}>{course.price_inr} INR</span>
                    <span className={shared.pill}>{course.is_published ? "Published" : "Draft"}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className={styles.editorStack}>
              <article className={shared.surfaceCard}>
                <div className={shared.sectionHeader}>
                  <h2 className={shared.sectionTitle}>{selectedCourse ? "Edit course" : "Create course"}</h2>
                  <p className={shared.sectionSubtitle}>This powers the paid catalog card, detail page, and purchase flow.</p>
                </div>
                <form action={saveCourseCatalogEntry}>
                  <input name="courseId" type="hidden" value={selectedCourse?.id ?? ""} />
                  <div className={shared.formGrid}>
                    <label className={shared.formField}><span className={shared.formLabel}>Title</span><input className={shared.input} defaultValue={selectedCourse?.title ?? ""} name="title" required type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Slug</span><input className={shared.input} defaultValue={selectedCourse?.slug ?? ""} name="slug" required type="text" /></label>
                    <label className={shared.formFieldFull}><span className={shared.formLabel}>Subtitle</span><input className={shared.input} defaultValue={selectedCourse?.subtitle ?? ""} name="subtitle" type="text" /></label>
                    <label className={shared.formFieldFull}><span className={shared.formLabel}>Summary</span><input className={shared.input} defaultValue={selectedCourse?.summary ?? ""} name="summary" required type="text" /></label>
                    <label className={shared.formFieldFull}><span className={shared.formLabel}>Description</span><textarea className={shared.textarea} defaultValue={selectedCourse?.description ?? ""} name="description" required /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Provider</span><input className={shared.input} defaultValue={selectedCourse?.provider_name ?? ""} name="providerName" required type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Provider code</span><input className={shared.input} defaultValue={selectedCourse?.provider_code ?? ""} name="providerCode" required type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Category</span><input className={shared.input} defaultValue={selectedCourse?.category ?? ""} name="category" required type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Focus area</span><input className={shared.input} defaultValue={selectedCourse?.focus_area ?? ""} name="focusArea" required type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Program type</span><input className={shared.input} defaultValue={selectedCourse?.program_type ?? "Course"} name="programType" required type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Skill level</span><input className={shared.input} defaultValue={selectedCourse?.skill_level ?? "Beginner"} name="skillLevel" type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Duration</span><input className={shared.input} defaultValue={selectedCourse?.duration_label ?? ""} name="durationLabel" required type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Pace</span><input className={shared.input} defaultValue={selectedCourse?.pace_label ?? "4 hours / week"} name="paceLabel" type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Rating</span><input className={shared.input} defaultValue={selectedCourse?.rating ?? 4.8} name="rating" step="0.1" type="number" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Price INR</span><input className={shared.input} defaultValue={selectedCourse?.price_inr ?? 0} name="priceInr" type="number" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>List price INR</span><input className={shared.input} defaultValue={selectedCourse?.list_price_inr ?? ""} name="listPriceInr" type="number" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Spotlight bucket</span><input className={shared.input} defaultValue={selectedCourse?.spotlight_bucket ?? ""} name="spotlightBucket" type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Hero slot</span><input className={shared.input} defaultValue={selectedCourse?.hero_slot ?? ""} name="heroSlot" type="number" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Sort order</span><input className={shared.input} defaultValue={selectedCourse?.sort_order ?? 100} name="sortOrder" type="number" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Publish</span><select className={shared.select} defaultValue={selectedCourse?.is_published ? "true" : "false"} name="isPublished"><option value="true">Published</option><option value="false">Draft</option></select></label>
                    <label className={shared.formFieldFull}><span className={shared.formLabel}>Tags</span><textarea className={shared.textarea} defaultValue={selectedCourse?.tags?.join("\n") ?? ""} name="tags" /></label>
                    <label className={shared.formFieldFull}><span className={shared.formLabel}>Skills</span><textarea className={shared.textarea} defaultValue={selectedCourse?.skills?.join("\n") ?? ""} name="skills" /></label>
                    <label className={shared.formFieldFull}><span className={shared.formLabel}>Outcomes</span><textarea className={shared.textarea} defaultValue={selectedCourse?.outcomes?.join("\n") ?? ""} name="outcomes" /></label>
                    <label className={shared.formFieldFull}><span className={shared.formLabel}>Syllabus</span><textarea className={shared.textarea} defaultValue={selectedCourse?.syllabus?.join("\n") ?? ""} name="syllabus" /></label>
                  </div>
                  <div className={shared.formFooter}><button className="button" type="submit">{selectedCourse ? "Save course" : "Create course"}</button></div>
                </form>
              </article>
            </div>
          </section>

          {selectedCourse ? (
            <>
              <section className={`${shared.panel} ${styles.curriculumStack}`}>
                <div className={shared.sectionHeader}>
                  <h2 className={shared.sectionTitle}>Curriculum</h2>
                  <p className={shared.sectionSubtitle}>Create private modules and lesson rows for {selectedCourse.title}.</p>
                </div>

                <form action={saveCourseModuleEntry}>
                  <input name="courseId" type="hidden" value={selectedCourse.id} />
                  <input name="courseSlug" type="hidden" value={selectedCourse.slug} />
                  <div className={shared.formGrid}>
                    <label className={shared.formField}><span className={shared.formLabel}>Module title</span><input className={shared.input} name="title" required type="text" /></label>
                    <label className={shared.formField}><span className={shared.formLabel}>Sort order</span><input className={shared.input} defaultValue={100} name="sortOrder" type="number" /></label>
                    <label className={shared.formFieldFull}><span className={shared.formLabel}>Module summary</span><input className={shared.input} name="summary" type="text" /></label>
                  </div>
                  <div className={shared.formFooter}><button className="button" type="submit">Add module</button></div>
                </form>

                <div className={styles.moduleList}>
                  {modules.map((module) => (
                    <article className={styles.moduleBlock} key={module.id}>
                      <div className={styles.moduleHeader}>
                        <div>
                          <p className={styles.moduleTitle}>{module.title}</p>
                          <p className={shared.mutedText}>{module.summary ?? "No summary"}</p>
                        </div>
                        <span className={shared.pill}>Order {module.sort_order}</span>
                      </div>
                      <div className={styles.lessonList}>
                        {(lessonsByModuleId.get(module.id) ?? []).map((lesson) => (
                          <div className={shared.listItem} key={lesson.id}>
                            <div className={shared.itemTitleRow}>
                              <p className={shared.primaryText}>{lesson.title}</p>
                              <span className={shared.pill}>{lesson.lesson_type}</span>
                            </div>
                            <p className={shared.mutedText}>{lesson.summary ?? "No summary"}</p>
                            <div className={shared.pillRow}>
                              <span className={shared.pill}>{lesson.duration_minutes ?? 0} min</span>
                              <span className={shared.pill}>{lesson.is_preview ? "Preview" : "Private"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className={`${shared.panel} ${styles.catalogGrid}`}>
                <article className={shared.surfaceCard}>
                  <div className={shared.sectionHeader}>
                    <h2 className={shared.sectionTitle}>Add lesson</h2>
                    <p className={shared.sectionSubtitle}>Attach private video or reading rows to a selected module.</p>
                  </div>
                  <form action={saveCourseLessonEntry}>
                    <input name="courseSlug" type="hidden" value={selectedCourse.slug} />
                    <div className={shared.formGrid}>
                      <label className={shared.formFieldFull}><span className={shared.formLabel}>Module</span><select className={shared.select} defaultValue="" name="moduleId" required><option disabled value="">Select module</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
                      <label className={shared.formField}><span className={shared.formLabel}>Lesson title</span><input className={shared.input} name="title" required type="text" /></label>
                      <label className={shared.formField}><span className={shared.formLabel}>Lesson type</span><select className={shared.select} defaultValue="video" name="lessonType"><option value="video">Video</option><option value="reading">Reading</option><option value="lab">Lab</option></select></label>
                      <label className={shared.formField}><span className={shared.formLabel}>Duration minutes</span><input className={shared.input} name="durationMinutes" type="number" /></label>
                      <label className={shared.formField}><span className={shared.formLabel}>Sort order</span><input className={shared.input} defaultValue={100} name="sortOrder" type="number" /></label>
                      <label className={shared.formField}><span className={shared.formLabel}>Preview access</span><select className={shared.select} defaultValue="false" name="isPreview"><option value="false">Private</option><option value="true">Preview</option></select></label>
                      <label className={shared.formFieldFull}><span className={shared.formLabel}>Video URL</span><input className={shared.input} name="videoUrl" type="url" /></label>
                      <label className={shared.formFieldFull}><span className={shared.formLabel}>Lesson summary</span><textarea className={shared.textarea} name="summary" /></label>
                    </div>
                    <div className={shared.formFooter}><button className="button" type="submit">Add lesson</button></div>
                  </form>
                </article>

                <article className={shared.surfaceCard}>
                  <div className={shared.sectionHeader}>
                    <h2 className={shared.sectionTitle}>Final assessment</h2>
                    <p className={shared.sectionSubtitle}>This unlocks certificate readiness for the paid course flow.</p>
                  </div>
                  <form action={saveCourseAssessmentEntry}>
                    <input name="assessmentId" type="hidden" value={assessment?.id ?? ""} />
                    <input name="courseId" type="hidden" value={selectedCourse.id} />
                    <input name="courseSlug" type="hidden" value={selectedCourse.slug} />
                    <div className={shared.formGrid}>
                      <label className={shared.formFieldFull}><span className={shared.formLabel}>Assessment title</span><input className={shared.input} defaultValue={assessment?.title ?? `${selectedCourse.title} Final Assessment`} name="title" required type="text" /></label>
                      <label className={shared.formFieldFull}><span className={shared.formLabel}>Summary</span><input className={shared.input} defaultValue={assessment?.summary ?? ""} name="summary" type="text" /></label>
                      <label className={shared.formField}><span className={shared.formLabel}>Duration minutes</span><input className={shared.input} defaultValue={assessment?.duration_minutes ?? 20} name="durationMinutes" type="number" /></label>
                      <label className={shared.formField}><span className={shared.formLabel}>Pass percent</span><input className={shared.input} defaultValue={assessment?.pass_percent ?? 70} name="passPercent" type="number" /></label>
                      <label className={shared.formField}><span className={shared.formLabel}>Max attempts</span><input className={shared.input} defaultValue={assessment?.max_attempts ?? 3} name="maxAttempts" type="number" /></label>
                      <label className={shared.formFieldFull}><span className={shared.formLabel}>Questions JSON</span><textarea className={shared.textarea} defaultValue={JSON.stringify(assessment?.questions_json ?? [], null, 2)} name="questionsJson" required /></label>
                    </div>
                    <div className={shared.formFooter}><button className="button" type="submit">{assessment ? "Save assessment" : "Create assessment"}</button></div>
                  </form>
                  <div className={styles.assessmentCode}>{JSON.stringify(assessment?.questions_json ?? [], null, 2)}</div>
                </article>
              </section>

              <section className={shared.panel}>
                <div className={shared.sectionHeader}>
                  <h2 className={shared.sectionTitle}>Assessment Report</h2>
                  <p className={shared.sectionSubtitle}>
                    Live performance signal for {selectedCourse.title}: attempts, certificates, and strongest learners.
                  </p>
                </div>

                <section className={shared.statsGrid}>
                  <article className={shared.statCard}><span className={shared.statValue}>{courseAttempts.length}</span><span className={shared.statLabel}>Attempts</span></article>
                  <article className={shared.statCard}><span className={shared.statValue}>{courseAttempts.filter((attempt) => attempt.passed).length}</span><span className={shared.statLabel}>Passed attempts</span></article>
                  <article className={shared.statCard}><span className={shared.statValue}>{bestAttemptsByUser.size}</span><span className={shared.statLabel}>Learners tested</span></article>
                  <article className={shared.statCard}><span className={shared.statValue}>{certificateCountResult.count ?? 0}</span><span className={shared.statLabel}>Certificates issued</span></article>
                </section>

                {topCoursePerformers.length === 0 ? (
                  <div className={shared.emptyState}>
                    <h3 className={shared.emptyStateTitle}>No course attempts yet</h3>
                    <p className={shared.emptyStateBody}>
                      Once learners start taking the SkillGO test room, the top scorers will appear here.
                    </p>
                  </div>
                ) : (
                  <div className={shared.list}>
                    {topCoursePerformers.map((attempt) => {
                      const badge = resolveAssessmentBadge(attempt.score_percent, attempt.passed);

                      return (
                        <div className={shared.listItem} key={attempt.id}>
                          <div className={shared.itemTitleRow}>
                            <p className={shared.primaryText}>{performersById.get(attempt.user_id) ?? "SkillGO learner"}</p>
                            <span className={shared.pill}>{attempt.score_percent}%</span>
                          </div>
                          <p className={shared.mutedText}>{badge.label}</p>
                          <div className={shared.pillRow}>
                            <span className={shared.pill}>{attempt.passed ? "Passed" : "Practice needed"}</span>
                            <span className={shared.pill}>
                              {new Date(attempt.submitted_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </>
      )}
    </main>
  );
}
