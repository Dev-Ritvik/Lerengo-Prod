import type { ReactNode } from "react";
import Link from "next/link";
import { requireSuperAdminUser } from "@/lib/superadmin";
import { signOutSuperAdmin } from "../login/actions";
import { ControlNav } from "../control-nav";
import styles from "../control.module.css";

export const dynamic = "force-dynamic";

export default async function ControlPanelLayout({ children }: { children: ReactNode }) {
  const { appUser } = await requireSuperAdminUser();

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brandBlock}>
            <span className={styles.brandEyebrow}>LerenGO · Platform control</span>
            <span className={styles.brandTitle}>Superadmin dashboard</span>
          </div>
          <div className={styles.topbarActions}>
            <span className={styles.identity}>{appUser.email}</span>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/">
              Browse Main Site
            </Link>
            <form action={signOutSuperAdmin} style={{ display: "inline" }}>
              <button className={styles.btn} type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <ControlNav />

        {children}
      </div>
    </div>
  );
}
