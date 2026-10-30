import Link from "next/link";
import { requireSuperAdminUser } from "@/lib/superadmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveCoursesAppUrl } from "@/lib/app-url";
import type { Database } from "@/lib/supabase/types";
import styles from "../../control.module.css";
import { createCourse, deleteCourse, setCoursePublished } from "./actions";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

type Props = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

const PROGRAM_TYPES = ["Course", "Specialization", "Professional Certificate", "Learning Path"];

const SUCCESS_MESSAGES: Record<string, string> = {
  course_created: "Course created and published.",
  course_published: "Course published.",
  course_unpublished: "Course unpublished.",
  course_deleted: "Course deleted.",
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Title and summary are required.",
  invalid_program_type: "Invalid program type.",
  slug_exists: "A course with that slug already exists.",
  create_failed: "The course could not be created.",
  invalid_target: "Invalid course.",
  update_failed: "The update could not be saved.",
  delete_failed: "The course could not be deleted.",
};

export const dynamic = "force-dynamic";

export default async function ControlCoursesPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireSuperAdminUser();
  const admin = createSupabaseAdminClient();
  const coursesUrl = resolveCoursesAppUrl();

  const { data: coursesData, error: coursesError } = await admin
    .from("courses")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (coursesError) {
    throw new Error(coursesError.message);
  }

  const courses = (coursesData ?? []) as CourseRow[];
  const successMessage = params.success ? SUCCESS_MESSAGES[params.success] : null;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>Surface 3 · Courses</p>
        <h1 className={styles.heroTitle}>Course management</h1>
        <p className={styles.heroSubtitle}>
          Create, publish, unpublish, or delete any SkillGO course. For deep editing (modules,
          lessons, assessments), use the full course editor.
        </p>
      </section>

      {successMessage ? (
        <p className={`${styles.notice} ${styles.noticeSuccess}`}>{successMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className={`${styles.notice} ${styles.noticeError}`}>{errorMessage}</p>
      ) : null}

      <div className={styles.panel}>
        <div className={styles.sectionHeading}>
          <h2>Quick create</h2>
          <Link className={styles.btn} href="/admin/courses">
            Open full course editor
          </Link>
        </div>
        <form action={createCourse}>
          <div className={styles.createGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-title">
                Title
              </label>
              <input className={styles.input} id="course-title" name="title" required />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-slug">
                Slug (optional)
              </label>
              <input className={styles.input} id="course-slug" name="slug" placeholder="auto from title" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-program">
                Program type
              </label>
              <select className={styles.select} id="course-program" name="programType" defaultValue="Course">
                {PROGRAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-category">
                Category
              </label>
              <input className={styles.input} id="course-category" name="category" placeholder="e.g. AI" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-focus">
                Focus area
              </label>
              <input className={styles.input} id="course-focus" name="focusArea" placeholder="e.g. Machine Learning" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-provider">
                Provider name
              </label>
              <input className={styles.input} id="course-provider" name="providerName" placeholder="LerenGO" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-provider-code">
                Provider code
              </label>
              <input className={styles.input} id="course-provider-code" name="providerCode" placeholder="lerengo" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-skill">
                Skill level
              </label>
              <input className={styles.input} id="course-skill" name="skillLevel" placeholder="Beginner" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-duration">
                Duration label
              </label>
              <input className={styles.input} id="course-duration" name="durationLabel" placeholder="6 weeks" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="course-price">
                Price (INR)
              </label>
              <input className={styles.input} id="course-price" name="priceInr" type="number" min="0" defaultValue="0" />
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label className={styles.fieldLabel} htmlFor="course-summary">
                Summary
              </label>
              <input className={styles.input} id="course-summary" name="summary" required />
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label className={styles.fieldLabel} htmlFor="course-description">
                Description (optional)
              </label>
              <textarea className={styles.textarea} id="course-description" name="description" />
            </div>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
            Create course
          </button>
        </form>
      </div>

      <div className={styles.panel} style={{ marginTop: "1rem" }}>
        {courses.length === 0 ? (
          <div className={styles.emptyState}>No courses yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div className={styles.primaryText}>{course.title}</div>
                      <div className={styles.mutedText}>{course.slug}</div>
                    </td>
                    <td>
                      <div>{course.category}</div>
                      <div className={styles.mutedText}>{course.program_type}</div>
                    </td>
                    <td>{course.price_inr > 0 ? `₹${course.price_inr}` : "Free"}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          course.is_published ? styles.badgeGood : styles.badgeWarn
                        }`}
                      >
                        {course.is_published ? "Published" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <a
                          className={styles.btn}
                          href={`${coursesUrl}/courses/${course.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                        <form className={styles.inlineForm} action={setCoursePublished}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input
                            type="hidden"
                            name="publish"
                            value={course.is_published ? "false" : "true"}
                          />
                          <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
                            {course.is_published ? "Unpublish" : "Publish"}
                          </button>
                        </form>
                        <form className={styles.inlineForm} action={deleteCourse}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <button className={`${styles.btn} ${styles.btnDanger}`} type="submit">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
