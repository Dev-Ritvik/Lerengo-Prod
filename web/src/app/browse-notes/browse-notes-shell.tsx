"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProfileMenu } from "@/components/profile-menu";
import styles from "./page.module.css";

type BrowseNotesShellProps = {
  avatarUrl?: string | null;
  universityName: string;
  displayName: string;
  initials: string;
  showAdminLink?: boolean;
  adminUrl?: string;
  showMentorLink?: boolean;
  pageEyebrow?: string;
  pageTitle?: string;
  pageDescription?: string;
  showFilters?: boolean;
  showGlobalSearch?: boolean;
  departmentOptions: string[];
  domainOptions: string[];
  semesterOptions: number[];
  initialDepartment: string;
  initialDomain: string;
  initialSemester: string;
  initialQuery: string;
  children: ReactNode;
};

type FilterState = {
  department: string;
  domain: string;
  semester: string;
  query: string;
};

const WORKSPACE_NAV_ITEMS = [
  { href: "/browse-notes", icon: "/notes.png", label: "Notes" },
  { href: "/mentorship", icon: "/mentorship.png", label: "Mentorship" },
  { href: "/community", icon: "/community.png", label: "Campus Community" },
] as const;

function buildHref(pathname: string, state: FilterState) {
  const params = new URLSearchParams();

  if (state.department) {
    params.set("department", state.department);
  }

  if (state.domain) {
    params.set("domain", state.domain);
  }

  if (state.semester) {
    params.set("semester", state.semester);
  }

  if (state.query.trim()) {
    params.set("q", state.query.trim());
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function SearchGlyph() {
  return (
    <svg
      aria-hidden="true"
      className={styles.searchGlyph}
      fill="none"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.2 12.2L16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function isActiveWorkspaceRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BrowseNotesShell({
  avatarUrl = null,
  universityName,
  displayName,
  initials,
  showAdminLink = false,
  adminUrl = "/admin",
  showMentorLink = false,
  pageEyebrow = "",
  pageTitle = "Browse Notes",
  pageDescription,
  showFilters = true,
  showGlobalSearch = true,
  departmentOptions,
  domainOptions,
  semesterOptions,
  initialDepartment,
  initialDomain,
  initialSemester,
  initialQuery,
  children,
}: BrowseNotesShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [department, setDepartment] = useState(initialDepartment);
  const [domain, setDomain] = useState(initialDomain);
  const [semester, setSemester] = useState(initialSemester);
  const [query, setQuery] = useState(initialQuery);
  const hasActiveFilters = Boolean(department || domain || semester || query.trim());
  const spotlightEyebrow = showFilters ? "Catalog View" : "Reader View";
  const spotlightTitle = showFilters ? "One search. Cleaner flow." : "Focused note access.";
  const spotlightBody = showFilters
    ? "Browse verified campus notes without a bulky sidebar competing with the actual catalog."
    : "Keep the university context, profile access, and note detail in one compact workspace shell.";

  useEffect(() => {
    if (!showFilters && !showGlobalSearch) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      const nextHref = buildHref(pathname, {
        department,
        domain,
        semester,
        query,
      });
      const currentQuery = searchParams.toString();
      const currentHref = currentQuery ? `${pathname}?${currentQuery}` : pathname;

      if (nextHref !== currentHref) {
        router.replace(nextHref, { scroll: false });
      }
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [department, domain, semester, query, pathname, router, searchParams, showFilters, showGlobalSearch]);

  function handleResetFilters() {
    setDepartment("");
    setDomain("");
    setSemester("");
    setQuery("");
  }

  return (
    <main className={styles.shell} data-workspace-shell="true">
      <section className={styles.mainPanel}>
        <header className={styles.topBar}>
          <div className={styles.topBarFrame}>
            <div className={styles.navBar}>
              <div className={styles.brandCluster}>
                <Link href="/" aria-label="LerenGO home" className={styles.brandLink}>
                  <Image
                    alt="LerenGO logo"
                    className={styles.brandLogo}
                    height={303}
                    priority
                    src="/logo.lerengo.embedded.svg"
                    width={562}
                  />
                </Link>

                <nav aria-label="Workspace navigation" className={styles.workspaceNav}>
                  {WORKSPACE_NAV_ITEMS.map((item) => {
                    const isActive = isActiveWorkspaceRoute(pathname, item.href);

                    return (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={`${styles.workspaceNavItem} ${isActive ? styles.workspaceNavItemActive : ""}`}
                        href={item.href}
                        key={item.href}
                      >
                        <Image alt="" className={styles.workspaceNavIcon} height={24} src={item.icon} width={24} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className={styles.utilityCluster}>
                <div className={styles.universityField}>
                  <Image
                    alt=""
                    aria-hidden="true"
                    className={styles.universityLogo}
                    height={30}
                    src="/lpu logo.png"
                    width={30}
                  />
                  <span className={styles.universityName}>{universityName}</span>
                </div>

                <div className={styles.profileDock}>
                  <ProfileMenu
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    initials={initials}
                    showAdminLink={showAdminLink}
                    adminUrl={adminUrl}
                    showMentorLink={showMentorLink}
                  />
                </div>
              </div>
            </div>

            <div className={styles.heroBand}>
              <div className={styles.pageHeading}>
                {pageEyebrow ? <p className={styles.pageEyebrow}>{pageEyebrow}</p> : null}
                <h1 className={styles.pageTitle}>{pageTitle}</h1>
                {pageDescription ? <p className={styles.pageDescription}>{pageDescription}</p> : null}
              </div>

              <aside className={styles.heroAccentCard}>
                <p className={styles.heroAccentEyebrow}>{spotlightEyebrow}</p>
                <h2 className={styles.heroAccentTitle}>{spotlightTitle}</h2>
                <p className={styles.heroAccentBody}>{spotlightBody}</p>

              </aside>
            </div>
          </div>
        </header>

        <div className={styles.contentPane}>
          {showFilters ? (
            <section className={styles.filtersPanel}>
              <div className={styles.filtersHeading}>
                <div>
                  <p className={styles.filtersKicker}>Refine catalog</p>
                  <h2 className={styles.filtersTitle}>One search bar. Tight filters. Faster subject discovery.</h2>
                </div>

                {hasActiveFilters ? (
                  <button className={styles.filtersReset} onClick={handleResetFilters} type="button">
                    Reset all
                  </button>
                ) : (
                  <p className={styles.filtersHint}>Campus-scoped results only</p>
                )}
              </div>

              <div className={`${styles.filtersStrip} ${!showGlobalSearch ? styles.filtersStripCompact : ""}`}>
                <select
                  aria-label="Department"
                  className={styles.filterControl}
                  onChange={(event) => setDepartment(event.target.value)}
                  value={department}
                >
                  <option value="">Department</option>
                  {departmentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Domain"
                  className={styles.filterControl}
                  onChange={(event) => setDomain(event.target.value)}
                  value={domain}
                >
                  <option value="">Program</option>
                  {domainOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Semester"
                  className={styles.filterControl}
                  onChange={(event) => setSemester(event.target.value)}
                  value={semester}
                >
                  <option value="">Semester</option>
                  {semesterOptions.map((option) => (
                    <option key={option} value={option}>
                      Semester {option}
                    </option>
                  ))}
                </select>

                {showGlobalSearch ? (
                  <label className={`${styles.searchField} ${styles.filterSearchField}`}>
                    <span aria-hidden="true" className={styles.searchIcon}>
                      <SearchGlyph />
                    </span>
                    <input
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search subjects or note titles"
                      type="search"
                      value={query}
                    />
                  </label>
                ) : null}
              </div>
            </section>
          ) : null}

          <div className={styles.notesContent}>{children}</div>
        </div>
      </section>
    </main>
  );
}
