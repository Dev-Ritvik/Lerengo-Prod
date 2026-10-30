"use client";

import { AuthComponent } from "@/components/ui/sign-up";

const CustomLogo = () => (
  <div style={{ background: "#3b82f6", color: "#fff", borderRadius: "6px", padding: "6px", display: "inline-flex" }}>
    <svg
      style={{ width: "16px", height: "16px" }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  </div>
);

export default function CustomAuthDemo() {
  return (
    <AuthComponent
      logo={<CustomLogo />}
      brandName="MyWebApp"
    />
  );
}
