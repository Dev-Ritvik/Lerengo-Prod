"use client";

import { useRef, type ComponentProps, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const LEAVE_CLASS = "route-transition-leave";
const ENTER_CLASS = "route-transition-enter";

type TransitionLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href"
> & {
  href: string;
  transitionMs?: number;
};

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "catch" in value &&
    typeof (value as { catch: unknown }).catch === "function"
  );
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export function TransitionLink({
  href,
  transitionMs = 360,
  onClick,
  ...rest
}: TransitionLinkProps) {
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const unlockTimerRef = useRef<number | null>(null);
  const shouldUseClientNavigation = process.env.NODE_ENV === "production";

  function clearUnlockTimer() {
    if (unlockTimerRef.current === null) {
      return;
    }

    window.clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = null;
  }

  function resetTransitionState() {
    const root = document.documentElement;
    root.classList.remove(LEAVE_CLASS);
    root.classList.remove(ENTER_CLASS);
    isNavigatingRef.current = false;
    clearUnlockTimer();
  }

  function hardNavigate() {
    resetTransitionState();
    window.location.assign(href);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      isModifiedClick(event) ||
      rest.target === "_blank" ||
      isNavigatingRef.current
    ) {
      return;
    }

    event.preventDefault();
    isNavigatingRef.current = true;

    const root = document.documentElement;
    root.classList.remove(ENTER_CLASS);
    root.classList.add(LEAVE_CLASS);

    clearUnlockTimer();
    unlockTimerRef.current = window.setTimeout(() => {
      // Recover when client-side navigation fails in dev/server reconnect scenarios.
      resetTransitionState();
    }, transitionMs + 2500);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          if (!shouldUseClientNavigation) {
            hardNavigate();
            return;
          }

          try {
            const navigation = router.push(href);
            if (isPromiseLike(navigation)) {
              void navigation.catch(() => {
                hardNavigate();
              });
            }
          } catch {
            hardNavigate();
          }
        }, transitionMs);
      });
    });
  }

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (!shouldUseClientNavigation) {
          // In dev, Next client fetches can intermittently fail during HMR/rebuild.
          // Use a controlled full reload so transitions remain stable.
          handleClick(event);
          return;
        }

        try {
          handleClick(event);
        } catch {
          if (!event.defaultPrevented) {
            return;
          }
          hardNavigate();
        }
      }}
      {...rest}
    />
  );
}
