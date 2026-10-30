"use client";

import { CardStack, CardStackItem } from "@/components/ui/card-stack";
import Link from "next/link";

const modulesData: CardStackItem[] = [
  {
    id: "skillgo",
    title: "SkillGO",
    tag: "LEARN",
    description: "Learn practical skills that translate to real proof of work. Master systems engineering, AI pipelines, and cloud infra with hands-on tracks.",
    imageSrc: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80",
    href: "/courses",
    ctaLabel: "Browse Tracks"
  },
  {
    id: "forgego",
    title: "ForgeGO",
    tag: "BUILD",
    description: "Turn ideas into functional prototypes. Pitch concepts, match with cross-functional campus teams, and work through guided build sprints.",
    imageSrc: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
    href: "/labs",
    ctaLabel: "Open Runway"
  },
  {
    id: "campusgo",
    title: "CampusGO",
    tag: "VALIDATE",
    description: "Connect projects to university mentors, research opportunities, and official campus validation. Show your builds to people who matter.",
    imageSrc: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80",
    href: "/campus-network",
    ctaLabel: "Enter Network"
  },
  {
    id: "mentorgo",
    title: "MentorGO",
    tag: "GUIDE",
    description: "Book structured, 1-on-1 guidance from verified academic and industry mentors. Setup session times, review slot availability, and track progress.",
    imageSrc: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=80",
    href: "/mentorgo",
    ctaLabel: "Find Mentors"
  },
  {
    id: "huntergo",
    title: "HunterGO",
    tag: "DISCOVER",
    description: "Get discovered by opportunity owners through verified project signals, certificates, and privacy-controlled talent profiles.",
    imageSrc: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80",
    href: "/huntergo",
    ctaLabel: "Opt-in Talent"
  }
];

export default function CardStackDemoPage() {
  return (
    <div className="w-full min-h-screen bg-[#1f2933] text-[#F5F3F0] flex flex-col items-center justify-between py-12 px-6">
      <header className="max-w-4xl w-full text-center flex flex-col items-center justify-center mt-4">
        <span className="text-xs font-semibold tracking-widest text-[#96a1ab] uppercase">
          Isolated UI Playground
        </span>
        <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">
          LerenGO Card Stack Integration
        </h1>
        <p className="text-sm text-neutral-400 mt-2 max-w-lg mx-auto">
          Previewing the 5 core modules using the interactive Card Stack layout. Drag the active card or use the navigation dots to switch.
        </p>
      </header>

      <main className="flex-grow w-full flex flex-col items-center justify-center max-w-5xl my-8">
        <div className="w-full flex items-center justify-center">
          <CardStack
            items={modulesData}
            cardWidth={480}
            cardHeight={320}
            maxVisible={3} // Showing fewer cards visible to remove clutter
            overlap={0.4}  // Reduced overlap to give side cards more breathing room
            spreadDeg={30} // Reduced angle sweep for cleaner layout
            autoAdvance={false}
            showDots={true}
            renderCard={(item, { active }) => (
              <div className="relative w-full h-full bg-[#16181E] rounded-2xl overflow-hidden border border-white/5 flex flex-col justify-between p-6 shadow-2xl">
                {/* Background Image with Overlay */}
                {item.imageSrc && (
                  <div className="absolute inset-0 z-0">
                    <img
                      src={item.imageSrc}
                      alt={item.title}
                      className="w-full h-full object-cover opacity-20 filter grayscale"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16181E] via-[#16181E]/80 to-transparent" />
                  </div>
                )}

                {/* Top Row: Tag / Module ID */}
                <div className="relative z-10 flex justify-between items-center">
                  <span className="text-[10px] font-bold tracking-wider bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-neutral-300">
                    {item.tag}
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase">
                    {item.id}
                  </span>
                </div>

                {/* Bottom Content Area */}
                <div className="relative z-10 mt-auto">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-2 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* CTA Link */}
                  <div className="mt-4">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                          active
                            ? "bg-[#96a1ab] text-white hover:bg-[#8b96a0] shadow-lg shadow-[#96a1ab]/20"
                            : "bg-white/5 text-neutral-400 border border-white/5 cursor-default pointer-events-none"
                        }`}
                      >
                        {item.ctaLabel || "Learn More"} &rarr;
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      </main>

      <footer className="text-center text-[11px] text-neutral-600 mt-6 w-full">
        LerenGO Platform Modules &bull; Built with Tailwind CSS and Framer Motion
      </footer>
    </div>
  );
}
