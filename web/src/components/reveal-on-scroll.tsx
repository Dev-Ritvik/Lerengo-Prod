"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
};

export function RevealOnScroll({
  children,
  className,
  once = true,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.18,
}: RevealOnScrollProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) {
          return;
        }

        if (entry.isIntersecting) {
          setIsRevealed(true);
          if (once) {
            observer.unobserve(entry.target);
          }
          return;
        }

        if (!once) {
          setIsRevealed(false);
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [once, rootMargin, threshold]);

  return (
    <div
      ref={elementRef}
      className={className}
      data-revealed={isRevealed ? "true" : "false"}
    >
      {children}
    </div>
  );
}
