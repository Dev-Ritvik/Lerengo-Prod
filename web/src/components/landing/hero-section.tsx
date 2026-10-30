"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { AnimatedSphere } from "./animated-sphere";
import { TransitionLink } from "@/components/transition-link";

const words = ["learn", "build", "validate", "ship"];

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => setWordIndex((p) => (p + 1) % words.length), 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[75vh] flex flex-col overflow-x-clip pb-12 lg:pb-16">
      {/* Background Animated Sphere */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] lg:w-[700px] lg:h-[700px] opacity-30 pointer-events-none z-0">
        <AnimatedSphere />
      </div>

      {/* Grid lines with horizontal lines only to keep background clean and prevent vertical intersections */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        {[...Array(8)].map((_, i) => (
          <div key={`h-${i}`} className="absolute h-px bg-foreground/10" style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }} />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full pt-8 pb-8 flex-grow flex flex-col justify-center">
        <div className="flex flex-col items-start text-left z-10 w-full">
          {/* Eyebrow */}
          <div className={`mb-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
              <span className="w-8 h-px bg-foreground/30" />
              Where ideas become working technology
            </span>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: "2rem" }}>
            <h1 className={`text-[clamp(2.5rem,7vw,5rem)] font-display leading-[1.18] tracking-tight transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <span className="block">The platform</span>
              <span className="block">
                to{" "}
                <span className="relative inline-block">
                  <span key={wordIndex} className="inline-flex flex-nowrap whitespace-nowrap">
                    {words[wordIndex].split("").map((char, i) => (
                      <span key={`${wordIndex}-${i}`} className="inline-block animate-char-in" style={{ animationDelay: `${i * 50}ms` }}>
                        {char}
                      </span>
                    ))}
                  </span>
                  <span className="absolute -bottom-1 left-0 right-0 h-2 bg-foreground/10" />
                </span>
              </span>
            </h1>
          </div>

          {/* Description */}
          <p 
            className={`text-base lg:text-lg text-muted-foreground leading-[1.8] max-w-4xl transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ marginBottom: "2.5rem" }}
          >
            LerenGO empowers learners to transform ideas into impactful careers through an integrated innovation ecosystem. Build a strong foundation with SkillGO, receive personalized guidance from industry leaders and academic mentors through MentorGO, collaborate to design, develop, and launch functional Minimum Viable Products (MVPs)—the first working versions of innovative products and solutions—with ForgeGO, validate your research, innovations, and academic work through CampusGO, and unlock internships, career opportunities, and industry connections with HunterGO.
          </p>

          {/* Action Buttons */}
          <div className={`flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <Button asChild size="lg" variant="outline" className="h-12 !px-12 text-sm rounded-full bg-[#23282f]/40 backdrop-blur-sm border-foreground/10 hover:border-foreground/25 hover:bg-[#23282f]/70 text-[#f5f0e8] w-full sm:w-auto font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
              <a href="#how">
                See how it works
              </a>
            </Button>
            <div className="relative group w-full sm:w-auto">
              {/* Mask to block the vertical grid line behind the button's white glow */}
              <div className="absolute -inset-4 bg-[#1f2933] rounded-full blur-md pointer-events-none z-0" />
              <Button asChild size="lg" className="relative z-10 bg-[#ffffff] hover:bg-[#ffffff]/90 !text-[#1f2933] !px-12 h-12 text-sm rounded-full w-full sm:w-auto font-bold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_20px_rgba(255,255,255,0.35)] hover:shadow-[0_0_35px_rgba(255,255,255,0.65)] border-none">
                <TransitionLink href="/signup" className="!text-[#1f2933]">
                  Get started — free
                  <ArrowRight className="w-4.5 h-4.5 ml-2 transition-transform group-hover:translate-x-1 inline-block align-middle" />
                </TransitionLink>
              </Button>
            </div>
          </div>
        </div>
      </div>


    </section>
  );
}

const stats = [
  { value: "85%",  label: "proof-of-work completion", company: "SKILLGO" },
  { value: "350+", label: "projects shipped",          company: "FORGEGO" },
  { value: "100%", label: "mentor & academic review",  company: "CAMPUSGO" },
  { value: "10x",  label: "faster talent validation",  company: "LERENGO" },
];

export function StatsRibbon() {
  return (
    <div
      className="relative z-10 border-t border-foreground/15 mt-12 lg:mt-20 pt-10 pb-10 overflow-x-clip"
      style={{
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
      }}
    >
      <div className="flex gap-16 marquee whitespace-nowrap">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex gap-16">
            {stats.map((stat) => (
              <div key={`${stat.company}-${i}`} className="flex items-baseline gap-4">
                <span className="text-3xl lg:text-4xl font-display">{stat.value}</span>
                <span className="text-xs text-muted-foreground">
                  {stat.label}
                  <span className="block font-mono text-[10px] mt-0.5">{stat.company}</span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
