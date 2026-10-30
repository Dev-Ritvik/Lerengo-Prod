"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./control.module.css";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/control", label: "Overview" },
  { href: "/admin/control/users", label: "Users" },
  { href: "/admin/control/mentors", label: "Mentors" },
  { href: "/admin/control/courses", label: "Courses" },
];

export function ControlNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin/control"
            ? pathname === "/admin/control"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
