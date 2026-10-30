"use client";

import { CoverflowCarousel } from "@/components/ui/coverflow-carousel";
import Link from "next/link";
import { ArrowLeft, Sparkles, MoveHorizontal } from "lucide-react";

const R2 = "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/stock-images";
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=640&h=640&fit=crop&q=70&auto=format`;

const SLIDES = [
  {
    src: `${R2}/767d99bb371a54d0d36751e8cecae43c.jpg`,
    alt: "Diver silhouetted inside a sunset seascape shaped like a profile",
    title: "Tidewater",
    subtitle: "Long Player",
    meta: [
      { label: "Year", value: "2019" },
      { label: "Producer", value: "Ada Ferrow" },
      { label: "Length", value: "3:42" },
    ],
  },
  {
    src: `${R2}/821d815affa6496c39cbdeeec7a84603.jpg`,
    alt: "Double-exposure portrait blended with a city skyline at dusk",
    title: "Nightshift",
    subtitle: "Long Player",
    meta: [
      { label: "Year", value: "2021" },
      { label: "Producer", value: "Kell Mora" },
      { label: "Length", value: "4:08" },
    ],
  },
  {
    src: `${R2}/937438c560ada1c83317f2c11b3454b0.jpg`,
    alt: "Motion-blurred side-profile portrait against a deep orange backdrop",
    title: "Overexposed",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2018" },
      { label: "Producer", value: "Juno Vale" },
      { label: "Length", value: "2:57" },
    ],
  },
  {
    src: `${R2}/98f89cb9994f5c382ab964062c4039db.jpg`,
    alt: "Figure holding a racket that dissolves into a swirling cloud at dusk",
    title: "Slow Bloom",
    subtitle: "EP",
    meta: [
      { label: "Year", value: "2022" },
      { label: "Producer", value: "Rue Alcott" },
      { label: "Length", value: "3:15" },
    ],
  },
  {
    src: `${R2}/ddcbee38be8b7274e19e132d7ab35b53.jpg`,
    alt: "Hand gesture with a cutout of a bird flying through the fingers",
    title: "Open Palm",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2020" },
      { label: "Producer", value: "Ada Ferrow" },
      { label: "Length", value: "3:01" },
    ],
  },
  {
    src: UNSPLASH("1470071459604-3b5ec3a7fe05"),
    alt: "Fog rolling through a forested valley at first light",
    title: "Low Country",
    subtitle: "Long Player",
    meta: [
      { label: "Year", value: "2017" },
      { label: "Producer", value: "Sim Oyo" },
      { label: "Length", value: "5:20" },
    ],
  },
  {
    src: UNSPLASH("1500534314209-a25ddb2bd429"),
    alt: "Sunlit dune ridge under a hard blue sky",
    title: "Dry Season",
    subtitle: "EP",
    meta: [
      { label: "Year", value: "2016" },
      { label: "Producer", value: "Juno Vale" },
      { label: "Length", value: "2:44" },
    ],
  },
  {
    src: UNSPLASH("1441974231531-c6227db76b6e"),
    alt: "Sunlight breaking through a dense stand of trees",
    title: "Understory",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2023" },
      { label: "Producer", value: "Kell Mora" },
      { label: "Length", value: "3:38" },
    ],
  },
  {
    src: UNSPLASH("1493246507139-91e8fad9978e"),
    alt: "Pastel abstract of coloured smoke against a pale ground",
    title: "Paper Lantern",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2021" },
      { label: "Producer", value: "Rue Alcott" },
      { label: "Length", value: "2:19" },
    ],
  },
  {
    src: UNSPLASH("1501785888041-af3ef285b470"),
    alt: "Mountain lake mirroring a ridgeline at dusk",
    title: "Still Water",
    subtitle: "Long Player",
    meta: [
      { label: "Year", value: "2015" },
      { label: "Producer", value: "Ada Ferrow" },
      { label: "Length", value: "4:51" },
    ],
  },
  {
    src: UNSPLASH("1465101162946-4377e57745c3"),
    alt: "Long exposure of light trails over a dark landscape",
    title: "Third Rail",
    subtitle: "EP",
    meta: [
      { label: "Year", value: "2024" },
      { label: "Producer", value: "Sim Oyo" },
      { label: "Length", value: "3:07" },
    ],
  },
  {
    src: UNSPLASH("1519681393784-d120267933ba"),
    alt: "Snow-covered peak lit by a cold morning sun",
    title: "Undertow",
    subtitle: "Single",
    meta: [
      { label: "Year", value: "2020" },
      { label: "Producer", value: "Juno Vale" },
      { label: "Length", value: "3:29" },
    ],
  },
];

export default function DemoPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#1f2933] text-[#F5F3F0] flex flex-col justify-between overflow-x-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-[#96a1ab]/10 via-[#bcc4cb]/5 to-[#7a8590]/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] via-transparent to-transparent pointer-events-none z-0" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full px-6 lg:px-12 py-6 flex items-center justify-between border-b border-white/[0.08] backdrop-blur-md bg-[#1f2933]/60">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to LerenGO</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.06] border border-white/[0.1] text-neutral-300">
            <Sparkles className="w-3.5 h-3.5 text-[#bcc4cb]" />
            3D Coverflow Preview
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-neutral-400 bg-white/[0.03] border border-white/[0.06]">
            <MoveHorizontal className="w-3.5 h-3.5" />
            Drag or use arrow keys
          </span>
        </div>
      </header>

      {/* Centerpiece Coverflow Area */}
      <main className="relative z-10 w-full flex-1 flex flex-col justify-center items-center py-6 px-2 sm:px-4">
        <div className="w-full text-center mb-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Discover What You Can Build
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xl mx-auto">
            Swipe through student MVPs, proof-of-work tracks, and verified projects.
          </p>
        </div>

        <div className="w-full max-w-[100vw]">
          <CoverflowCarousel
            slides={SLIDES}
            showCaption
            showNavigation
            showPagination
            cardWidth="clamp(220px, 24vw, 360px)"
            gap={0.08}
            depth={0.65}
            rotate={42}
            className="py-4"
          />
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full px-6 py-4 text-center text-xs text-neutral-500 border-t border-white/[0.05]">
        Interactive 3D Carousel Component for LerenGO • Use swipe, drag or arrow keys to navigate
      </footer>
    </div>
  );
}
