"use client";

import { useEffect, useRef } from "react";

interface CalcomEmbedProps {
  calLink: string;
  theme?: "light" | "dark" | "auto";
}

export function CalcomEmbed({ calLink, theme = "dark" }: CalcomEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Strip any full URL prefix — we only need "username/event-type"
  const formattedLink = calLink.replace(/^(https?:\/\/)?(www\.)?cal\.com\//, "");

  useEffect(() => {
    if (loaded.current || !containerRef.current) return;
    loaded.current = true;

    // Official Cal.com embed loader (from their docs)
    (function (C: any, A: string, L: string) {
      const p = function (a: any, ar: any) {
        a.q.push(ar);
      };
      const d = C.document;
      C.Cal =
        C.Cal ||
        function (...args: any[]) {
          const cal = C.Cal;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            d.head.appendChild(d.createElement("script")).src = A;
            cal.loaded = true;
          }
          if (args[0] === L) {
            const api: any = function (...apiArgs: any[]) {
              p(api, apiArgs);
            };
            const namespace = args[1];
            api.q = api.q || [];
            if (typeof namespace === "string") {
              cal.ns[namespace] = cal.ns[namespace] || api;
              p(cal.ns[namespace], args);
              p(cal, ["initNamespace", namespace]);
            } else {
              p(cal, args);
            }
            return;
          }
          p(cal, args);
        };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    const Cal = (window as any).Cal;

    Cal("init", { origin: "https://cal.com" });

    Cal("inline", {
      elementOrSelector: containerRef.current,
      calLink: formattedLink,
      layout: "month_view",
      config: { theme },
    });

    Cal("ui", {
      theme,
      styles: { branding: { brandColor: "#96a1ab" } },
      hideEventTypeDetails: false,
      layout: "month_view",
    });
  }, [formattedLink, theme]);

  return (
    <div
      ref={containerRef}
      id="cal-embed-container"
      style={{
        width: "100%",
        minHeight: "550px",
        overflow: "auto",
        borderRadius: "12px",
      }}
    />
  );
}
