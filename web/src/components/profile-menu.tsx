"use client";

import { useEffect, useRef, useState } from "react";
import { TransitionLink } from "@/components/transition-link";
import { LogoutButton } from "@/components/logout-button";
import styles from "./profile-menu.module.css";

type ProfileMenuProps = {
  avatarUrl?: string | null;
  displayName: string;
  initials: string;
  showAdminLink?: boolean;
  adminUrl?: string;
  showMentorLink?: boolean;
};

function getMenuId(displayName: string, initials: string, showAdminLink: boolean, showMentorLink: boolean) {
  const base = `${displayName}-${initials}-${showAdminLink ? "admin" : "user"}-${showMentorLink ? "mentor" : "member"}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `profile-menu-${base || "user"}`;
}

export function ProfileMenu({
  avatarUrl = null,
  displayName,
  initials,
  showAdminLink = false,
  adminUrl = "/admin",
  showMentorLink = false,
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [brokenImageSrc, setBrokenImageSrc] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isSuperAdmin = adminUrl?.includes("control") || false;
  const resolvedShowMentorLink = showMentorLink || isSuperAdmin;
  const menuId = getMenuId(displayName, initials, showAdminLink, resolvedShowMentorLink);
  const resolvedAvatarUrl = avatarUrl && brokenImageSrc !== avatarUrl ? avatarUrl : null;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={styles.profileTrigger}
        onClick={() => setIsOpen((previous) => !previous)}
        ref={toggleRef}
        suppressHydrationWarning
        type="button"
      >
        <span className={styles.avatar}>
          {resolvedAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${displayName} profile`}
              className={styles.avatarImage}
              onError={() => setBrokenImageSrc(resolvedAvatarUrl)}
              src={resolvedAvatarUrl}
            />
          ) : (
            <span className={styles.avatarFallback}>{initials}</span>
          )}
        </span>
        <span className={styles.name}>{displayName}</span>
        <span aria-hidden="true" className={styles.caret} />
      </button>

      {isOpen && (
        <div
          aria-hidden={!isOpen}
          className={`${styles.menu} ${styles.menuOpen}`}
          id={menuId}
          role="menu"
        >
          <TransitionLink
            className={styles.menuItem}
            href="/profile"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            Your Profile
          </TransitionLink>
          {resolvedShowMentorLink ? (
            <TransitionLink
              className={styles.menuItem}
              href="/mentor-studio"
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              Mentor Studio
            </TransitionLink>
          ) : null}
          {showAdminLink ? (
            <TransitionLink
              className={styles.menuItem}
              href={adminUrl}
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              {adminUrl.includes("control") ? "Superadmin Control" : "Admin Workspace"}
            </TransitionLink>
          ) : null}
          <LogoutButton className={`${styles.menuItem} ${styles.logoutItem}`} />
        </div>
      )}
    </div>
  );
}
