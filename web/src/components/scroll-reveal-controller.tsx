"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const REVEAL_SELECTOR = "[data-reveal]";

export function ScrollRevealController() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    if (!elements.length) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      elements.forEach((element) => {
        element.setAttribute("data-revealed", "true");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.setAttribute("data-revealed", "true");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    elements.forEach((element, index) => {
      // Only set delay and observe if not already revealed
      if (element.getAttribute("data-revealed") !== "true") {
        const delayMs = Math.min(index * 80, 320);
        element.style.setProperty("--reveal-delay", `${delayMs}ms`);
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [pathname, searchParams]);

  return null;
}
