"use client";

import { startTransition, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import shared from "../workspace.module.css";
import styles from "./surfaces.module.css";

type SurfaceLaneCardProps = {
  description: string;
  href: string;
  liveHref: string;
  metrics: readonly string[];
  status: string;
  title: string;
};

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export function SurfaceLaneCard({
  description,
  href,
  liveHref,
  metrics,
  status,
  title,
}: SurfaceLaneCardProps) {
  const router = useRouter();
  const [pendingLane, setPendingLane] = useState<"admin" | "live" | null>(null);

  function handleNavigate(
    event: MouseEvent<HTMLAnchorElement>,
    nextLane: "admin" | "live",
    destination: string,
    isExternal: boolean,
  ) {
    if (pendingLane || isModifiedClick(event) || event.currentTarget.target === "_blank") {
      return;
    }

    event.preventDefault();
    setPendingLane(nextLane);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (isExternal) {
          window.location.assign(destination);
          return;
        }

        startTransition(() => {
          try {
            router.push(destination);
          } catch {
            window.location.assign(destination);
          }
        });
      });
    });
  }

  const isPending = pendingLane !== null;

  return (
    <article aria-busy={isPending} className={`${styles.surfaceCard} ${isPending ? styles.surfaceCardPending : ""}`}>
      <div className={styles.surfaceCardTop}>
        <span className={styles.surfaceStatus}>{status}</span>
        <div className={shared.pillRow}>
          {metrics.map((metric) => (
            <span className={shared.pill} key={metric}>
              {metric}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.surfaceCardBody}>
        <h3 className={styles.surfaceCardTitle}>{title}</h3>
        <p className={styles.surfaceCardText}>{description}</p>
      </div>

      <div className={styles.surfaceCardActions}>
        <a
          className={`button ${styles.surfaceActionButton} ${isPending ? styles.surfaceActionButtonDisabled : ""}`}
          href={href}
          onClick={(event) => handleNavigate(event, "admin", href, false)}
        >
          Open admin workspace
        </a>
        <a
          className={`button secondary ${styles.surfaceActionButton} ${isPending ? styles.surfaceActionButtonDisabled : ""}`}
          href={liveHref}
          onClick={(event) => handleNavigate(event, "live", liveHref, true)}
        >
          Open live lane
        </a>
      </div>

      {isPending ? (
        <div className={styles.surfaceLoadingOverlay} role="status" aria-live="polite" aria-label={`Opening ${title}`}>
          <div className={styles.surfaceLoadingLineShort} />
          <div className={styles.surfaceLoadingPills}>
            <div className={styles.surfaceLoadingPill} />
            <div className={styles.surfaceLoadingPill} />
            <div className={styles.surfaceLoadingPill} />
          </div>
          <div className={styles.surfaceLoadingTitle} />
          <div className={styles.surfaceLoadingLineLong} />
          <div className={styles.surfaceLoadingLineMedium} />
          <div className={styles.surfaceLoadingActions}>
            <div className={styles.surfaceLoadingButtonPrimary} />
            <div className={styles.surfaceLoadingButtonSecondary} />
          </div>
        </div>
      ) : null}
    </article>
  );
}
