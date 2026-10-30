"use client";

import { useMemo, useState } from "react";
import type { CourseModuleSummary } from "@/lib/courses";
import styles from "./page.module.css";

type Props = {
  courseTitle: string;
  curriculum: CourseModuleSummary[];
  hasAccess: boolean;
};

function resolvePlayback(url: string | null) {
  if (!url) {
    return null;
  }

  const normalized = url.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("youtube.com/watch?v=") || normalized.includes("youtu.be/")) {
    const urlObject = new URL(normalized);
    const videoId =
      urlObject.searchParams.get("v") ??
      urlObject.pathname.split("/").filter(Boolean).pop() ??
      "";

    if (!videoId) {
      return null;
    }

    return {
      kind: "embed" as const,
      src: `https://www.youtube.com/embed/${videoId}`,
    };
  }

  if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(normalized)) {
    return {
      kind: "html5" as const,
      src: normalized,
    };
  }

  return {
    kind: "external" as const,
    src: normalized,
  };
}

export function CourseLearningConsole({ courseTitle, curriculum, hasAccess }: Props) {
  const lessons = useMemo(
    () => curriculum.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title, moduleId: module.id }))),
    [curriculum],
  );
  const [selectedLessonId, setSelectedLessonId] = useState(
    () => lessons.find((lesson) => !lesson.isLocked)?.id ?? lessons[0]?.id ?? "",
  );

  const activeLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ??
    lessons.find((lesson) => !lesson.isLocked) ??
    lessons[0] ??
    null;
  const playback = resolvePlayback(activeLesson?.videoUrl ?? null);

  const [openModuleIds, setOpenModuleIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (activeLesson?.moduleId) {
      initial[activeLesson.moduleId] = true;
    } else if (curriculum[0]?.id) {
      initial[curriculum[0].id] = true;
    }
    return initial;
  });

  const toggleModule = (moduleId: string) => {
    setOpenModuleIds((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  if (!activeLesson) {
    return (
      <section className={styles.panel}>
        <div className={styles.sectionHeaderCompact}>
          <span className={styles.sectionEyebrow}>Private curriculum</span>
          <h2 className={styles.panelTitle}>Course content will appear here.</h2>
        </div>
        <p className={styles.panelBody}>
          Add modules and lessons in the course backend to publish the private learning flow.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeaderCompact}>
        <span className={styles.sectionEyebrow}>Private curriculum</span>
        <h2 className={styles.panelTitle}>Video-first learning stays inside LerenGO.</h2>
      </div>

      <div className={styles.playerSurface}>
        <div className={styles.playerHeader}>
          <div>
            <span className={styles.playerMeta}>
              {activeLesson.moduleTitle} / {activeLesson.lessonType}
            </span>
            <h3 className={styles.playerTitle}>{activeLesson.title}</h3>
          </div>
          <div className={styles.playerPills}>
            {activeLesson.isPreview ? <span className={styles.signalPill}>Preview</span> : null}
            {activeLesson.isLocked ? <span className={styles.signalPill}>Locked</span> : null}
            {activeLesson.durationMinutes ? (
              <span className={styles.signalPill}>{activeLesson.durationMinutes} min</span>
            ) : null}
          </div>
        </div>

        {activeLesson.isLocked ? (
          <div className={styles.playerLocked}>
            <h4>Purchase required for the private lesson stream</h4>
            <p>
              This lesson is ready to render inside {courseTitle}, but access stays locked until payment
              is confirmed for your account.
            </p>
          </div>
        ) : playback?.kind === "embed" ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className={styles.playerFrame}
            referrerPolicy="strict-origin-when-cross-origin"
            src={playback.src}
            title={`${activeLesson.title} lesson player`}
          />
        ) : playback?.kind === "html5" ? (
          <video className={styles.playerVideo} controls preload="metadata" src={playback.src} />
        ) : playback?.kind === "external" ? (
          <div className={styles.playerLocked}>
            <h4>Private lesson source connected</h4>
            <p>
              This lesson is configured as an external signed stream. Open it in a new tab if your media
              provider does not support direct embedding.
            </p>
            <a className={styles.inlineAction} href={playback.src} rel="noreferrer" target="_blank">
              Open lesson stream
            </a>
          </div>
        ) : (
          <div className={styles.playerLocked}>
            <h4>Video player is ready for your private upload</h4>
            <p>
              Attach a signed video URL to this lesson and it will render here inside the course flow
              instead of sending learners away from the platform.
            </p>
          </div>
        )}

        <p className={styles.playerSummary}>
          {activeLesson.summary ??
            "This module is part of the paid learning path. Upload your private lesson stream to fully activate it."}
        </p>
      </div>

      <div className={styles.moduleGrid}>
        {curriculum.map((module) => {
          const isOpen = !!openModuleIds[module.id];
          return (
            <article className={`${styles.moduleCard} ${isOpen ? styles.moduleCardOpen : ""}`} key={module.id}>
              <button
                className={styles.moduleHeaderButton}
                onClick={() => toggleModule(module.id)}
                type="button"
                aria-expanded={isOpen}
              >
                <div className={styles.moduleHeaderContent}>
                  <h3 className={styles.moduleTitle}>{module.title}</h3>
                  {module.summary ? <p className={styles.moduleSummary}>{module.summary}</p> : null}
                </div>
                <div className={styles.moduleMetaRow}>
                  <span className={styles.moduleCount}>{module.lessons.length} lessons</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                    }}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className={styles.lessonList}>
                  {module.lessons.map((lesson) => (
                    <button
                      className={`${styles.lessonCard} ${lesson.id === activeLesson.id ? styles.lessonCardActive : ""}`}
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      type="button"
                    >
                      <div className={styles.lessonMetaRow}>
                        <span className={styles.lessonBadge}>{lesson.lessonType}</span>
                        {lesson.isPreview ? <span className={styles.lessonBadge}>Preview</span> : null}
                        {lesson.isLocked ? <span className={styles.lessonBadge}>Locked</span> : null}
                      </div>
                      <h4 className={styles.lessonTitle}>{lesson.title}</h4>
                      <p className={styles.lessonSummary}>
                        {lesson.summary ?? "Open this lesson to move through the private course flow."}
                      </p>
                      <span className={styles.lessonTime}>
                        {lesson.durationMinutes ? `${lesson.durationMinutes} min` : hasAccess ? "Ready to watch" : "Unlock with payment"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
