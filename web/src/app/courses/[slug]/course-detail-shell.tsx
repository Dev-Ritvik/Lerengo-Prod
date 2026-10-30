"use client";

import React from "react";
import Link from "next/link";
import { CourseEnrollmentPanel } from "./course-enrollment-panel";
import { CourseLearningConsole } from "./course-learning-console";
import { CourseAssessmentPanel } from "./course-assessment-panel";
import styles from "./page.module.css";

interface Props {
  data: {
    accessState: any;
    assessment: any;
    certificate: any;
    course: any;
    curriculum: any;
    enrollment: any;
    purchase: any;
    relatedCourses: any[];
    usesFallback: boolean;
  };
  session: any;
  fallbackAllowed: boolean;
}

export function CourseDetailShell({ data, session, fallbackAllowed }: Props) {
  const {
    accessState,
    assessment,
    certificate,
    course,
    curriculum,
    enrollment,
    purchase,
    relatedCourses,
    usesFallback,
  } = data;

  const totalLessons = curriculum.reduce((count: number, module: any) => count + module.lessons.length, 0);

  return (
    <div className={styles.editorialContainer}>
      {/* ── Header Navigation ── */}
      <div className={styles.editorialHeaderTop}>
        <Link href="/courses" className={styles.editorialBackLink}>
          &larr; Back to SkillGO
        </Link>
        <div className={styles.editorialMetaTags}>
          <span>{course.providerName}</span>
          <span>&middot;</span>
          <span>{course.skillLevel}</span>
          <span>&middot;</span>
          <span>{purchase.isPaid ? "Paid Path" : "Catalog Preview"}</span>
        </div>
      </div>

      {/* ── Hero Title Section ── */}
      <header className={styles.editorialHero}>
        <span className={styles.editorialCode}>{course.providerCode}</span>
        <h1 className={styles.editorialTitle}>{course.title}</h1>
        {course.subtitle && <p className={styles.editorialSubtitle}>{course.subtitle}</p>}
        <p className={styles.editorialSummary}>{course.summary}</p>
      </header>

      {/* ── Content Grid ── */}
      <div className={styles.editorialGrid}>
        {/* Main Content Area */}
        <div className={styles.editorialMain}>
          {/* Section 1: Curriculum */}
          <section className={styles.editorialSection}>
            <h2 className={styles.editorialSectionTitle}>Curriculum</h2>
            {usesFallback && !fallbackAllowed ? (
              <div className={styles.editorialNotice}>
                <strong>Curriculum Blocked</strong>
                <p>Private lesson delivery and course contents are temporarily unavailable. Backend configuration is pending.</p>
              </div>
            ) : (
              <CourseLearningConsole 
                courseTitle={course.title} 
                curriculum={curriculum} 
                hasAccess={purchase.hasAccess} 
              />
            )}
          </section>

          {/* Section 2: Assessment */}
          <section className={styles.editorialSection}>
            <h2 className={styles.editorialSectionTitle}>Final Assessment</h2>
            {usesFallback && !fallbackAllowed ? (
              <p className={styles.editorialBodyText}>Assessment pending setup in the live backend.</p>
            ) : (
              <CourseAssessmentPanel
                assessment={assessment}
                certificate={certificate}
                courseSlug={course.slug}
                hasAccess={purchase.hasAccess}
              />
            )}
          </section>

          {/* Section 3: Outcomes */}
          <section className={styles.editorialSection}>
            <h2 className={styles.editorialSectionTitle}>Description & Outcomes</h2>
            <p className={styles.editorialBodyText}>{course.description}</p>
            <ul className={styles.editorialList}>
              {course.outcomes.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sidebar */}
        <aside className={styles.editorialSidebar}>
          <div className={styles.editorialSticky}>
            
            {/* Enrollment / Pricing Widget */}
            <div className={styles.editorialWidgetCard}>
              <CourseEnrollmentPanel
                accessState={accessState}
                certificate={certificate}
                courseSlug={course.slug}
                courseTitle={course.title}
                enrollment={enrollment}
                isSignedIn={Boolean(session)}
                purchase={purchase}
              />
            </div>

            {/* Path details */}
            <div className={styles.editorialWidgetCard}>
              <h3 className={styles.widgetTitle}>Key Details</h3>
              <div className={styles.widgetStats}>
                <div className={styles.widgetStatRow}>
                  <span>Duration</span>
                  <strong>{course.duration}</strong>
                </div>
                <div className={styles.widgetStatRow}>
                  <span>Lessons</span>
                  <strong>{totalLessons} lessons</strong>
                </div>
                <div className={styles.widgetStatRow}>
                  <span>Credential</span>
                  <strong>{course.certificateTitle}</strong>
                </div>
              </div>
            </div>

            {/* Skills acquired */}
            <div className={styles.editorialWidgetCard}>
              <h3 className={styles.widgetTitle}>Skills Covered</h3>
              <div className={styles.editorialSkills}>
                {course.skills.map((skill: string) => (
                  <span key={skill} className={styles.editorialSkillChip}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Related Paths */}
            {relatedCourses.length > 0 && (
              <div className={styles.editorialWidgetCard}>
                <h3 className={styles.widgetTitle}>Related Paths</h3>
                <div className={styles.editorialRelated}>
                  {relatedCourses.slice(0, 2).map((item: any) => (
                    <Link key={item.slug} href={`/courses/${item.slug}`} className={styles.editorialRelatedLink}>
                      <span className={styles.relatedLinkProvider}>{item.provider}</span>
                      <strong className={styles.relatedLinkTitle}>{item.title}</strong>
                      <span className={styles.relatedLinkMeta}>{item.duration} &middot; {item.meta}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
