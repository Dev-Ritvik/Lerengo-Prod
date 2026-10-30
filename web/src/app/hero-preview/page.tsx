import { Sora } from "next/font/google";
import { HeroSection } from "@/components/landing/hero-section";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata = {
  title: "Optimus - Hero Section Preview",
  description: "Preview the rotating 3D ASCII sphere and editorial layout.",
};

export default function HeroPreviewPage() {
  return (
    // data-page-viewport suppresses the global layout footer and resets background colors
    <div
      data-page-viewport
      className={`${sora.variable} optimus-theme font-sans min-h-screen w-full relative`}
    >
      <HeroSection />
    </div>
  );
}
