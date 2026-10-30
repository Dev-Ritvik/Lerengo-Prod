"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const LEAVE_CLASS = "route-transition-leave";
const ENTER_CLASS = "route-transition-enter";
const ENTER_ANIMATION_MS = 420;

export function PageTransitionController() {
  const pathname = usePathname();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    function handleScroll() {
      const scrolled = window.scrollY > 12;
      const root = document.documentElement;
      if (scrolled) {
        root.classList.add("is-scrolled");
      } else {
        root.classList.remove("is-scrolled");
      }
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const root = document.documentElement;
    root.classList.remove(LEAVE_CLASS);
    root.classList.add(ENTER_CLASS);

    const timerId = window.setTimeout(() => {
      root.classList.remove(ENTER_CLASS);
    }, ENTER_ANIMATION_MS);

    return () => window.clearTimeout(timerId);
  }, [pathname]);

  return null;
}
