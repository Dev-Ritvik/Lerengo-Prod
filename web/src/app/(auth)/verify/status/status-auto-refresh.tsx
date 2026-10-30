"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { VerificationStatus } from "@/lib/supabase/types";
import styles from "./status.module.css";

type StatusPayload = {
  status?: VerificationStatus;
};

type Props = {
  enabled: boolean;
  requestId: string | null;
};

async function fetchStatus(requestId: string | null) {
  const query = requestId
    ? `?request_id=${encodeURIComponent(requestId)}`
    : "";

  const response = await fetch(`/api/verify/status${query}`, {
    cache: "no-store",
    method: "GET",
  });

  if (!response.ok) {
    return null;
  }

  try {
    return (await response.json()) as StatusPayload;
  } catch {
    return null;
  }
}

export function StatusAutoRefresh({ enabled, requestId }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let stopped = false;
    const intervalId = window.setInterval(async () => {
      if (stopped) {
        return;
      }

      const payload = await fetchStatus(requestId);
      if (!payload?.status || payload.status === "pending") {
        return;
      }

      stopped = true;
      window.clearInterval(intervalId);
      router.refresh();
    }, 2000);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, requestId, router]);

  if (!enabled) {
    return null;
  }

  return (
    <p className={styles.autoCheck}>
      Checking verification status automatically...
    </p>
  );
}
