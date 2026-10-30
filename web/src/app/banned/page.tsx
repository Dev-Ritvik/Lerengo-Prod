import Link from "next/link";
import { resolveAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export default function BannedPage() {
  const appUrl = resolveAppUrl();

  return (
    <main className="shell" style={{ maxWidth: "640px", paddingTop: "8vh" }}>
      <section className="stack" style={{ gap: "1rem" }}>
        <p className="eyebrow">Account suspended</p>
        <h1 style={{ fontSize: "2rem", lineHeight: 1.15 }}>
          Your access to LerenGO has been suspended
        </h1>
        <p style={{ opacity: 0.8 }}>
          A platform administrator has restricted this account. You have been signed out and
          cannot access campus workspaces, mentorship, courses, or community features while the
          suspension is active.
        </p>
        <p style={{ opacity: 0.8 }}>
          If you believe this is a mistake, contact the LerenGO team so the decision can be
          reviewed.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link className="button secondary small" href={`${appUrl}/contact`}>
            Contact support
          </Link>
          <Link className="button secondary small" href={appUrl}>
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
