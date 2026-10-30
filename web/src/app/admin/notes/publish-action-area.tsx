"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import styles from "./publish-action-area.module.css";

export function PublishActionArea() {
  const { pending } = useFormStatus();

  return (
    <div className={styles.actionWrap}>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Publishing note..." : "Upload and Publish"}
      </button>

      {pending ? (
        <div className={styles.overlay} role="status" aria-live="polite" aria-label="Publishing note">
          <div className={styles.panel}>
            <div className={styles.logoWrap}>
              <div className={styles.logoFrame}>
                <Image
                  alt="LerenGO logo"
                  className={styles.logo}
                  height={303}
                  priority
                  src="/logo.lerengo.embedded.svg"
                  width={562}
                />
              </div>
            </div>

            <span className={styles.eyebrow}>Publishing to LerenGO</span>
            <h3 className={styles.title}>Building the note reader and uploading the reference file.</h3>
            <p className={styles.body}>
              Keep this tab open while we publish the note. The upload is working in the
              background even if the file is large.
            </p>

            <div className={styles.progressTrack} aria-hidden="true">
              <div className={styles.progressBar} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
