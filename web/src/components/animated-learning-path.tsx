"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import styles from "./animated-learning-path.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(MotionPathPlugin);
}

const stages = [
  {
    id: "stage-1",
    title: "1. SkillGO",
    subtitle: "Master Advanced Engineering & Domain Skills",
    desc: "SkillGO provides a structured curriculum tailored for modern engineering and creative roles. Rather than relying on passive video consumption, builders participate in active learning paths—covering systems architecture, machine learning systems, cloud infrastructure, and advanced cryptography. Each module is designed around real-world projects, concluding with a comprehensive evaluation. Upon completion, builders earn cryptographically verified proof-of-work credentials that showcase their actual capabilities to global institutions and employers.",
    color: "#96a1ab",
    tag: "LEARN",
  },
  {
    id: "stage-2",
    title: "2. MentorGO",
    subtitle: "Get Direct Guidance from Industry & Academic Experts",
    desc: "MentorGO connects builders directly with verified mentors, industry professionals, and academic advisors. Once you need specific direction for learning paths, MVP architecture, research methodology, or career guidance, you can book focused 1-on-1 sessions. This ensures you get expert feedback right when it matters most, preventing wasted effort and keeping your project on the fastest track to success.",
    color: "#96a1ab",
    tag: "GUIDE",
  },
  {
    id: "stage-3",
    title: "3. ForgeGO",
    subtitle: "Architect and Launch Working MVP Prototypes",
    desc: "ForgeGO is where knowledge translates directly into engineering execution. It connects developers, designers, and researchers worldwide, allowing them to form cross-functional teams and collaborate on ambitious projects. The module provides a guided roadmap for proposal submission, peer reviews, milestone tracking, and prototype development. Whether you are building a decentralized protocol, a machine learning pipeline, or a hardware prototype, ForgeGO keeps your team aligned and focused on delivering a functional MVP.",
    color: "#96a1ab",
    tag: "BUILD",
  },
  {
    id: "stage-4",
    title: "4. CampusGO",
    subtitle: "Secure Academic Research & Institutional Validation",
    desc: "CampusGO serves as the institutional gateway within the LerenGO ecosystem. It allows universities, academic departments, research labs, and enterprise sponsors to engage directly with active builders. Through this module, institutions can provide expert mentorship, run structured validation processes, host virtual demo days, and scout top talent. By bridging the gap between open-source collaboration and official academic or corporate support, CampusGO elevates grassroots projects into recognized research publications, startups, or executive placements.",
    color: "#96a1ab",
    tag: "LAUNCH",
  },
  {
    id: "stage-5",
    title: "5. HunterGO",
    subtitle: "Match with Premier Roles, Funding, and Opportunities",
    desc: "HunterGO is the discovery layer where verified proof-of-work meets real opportunities. Instead of traditional resumes, opportunity owners, recruiters, and investors filter talent based on real proof signals—including completed courses, validated campus projects, and peer reviews. Builders control their privacy settings, deciding when and how to share their verified portfolio with potential employers or funders.",
    color: "#96a1ab",
    tag: "DISCOVER",
  },
];

export function AnimatedLearningPath() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [visited, setVisited] = useState<boolean[]>([true, false, false, false, false]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    setVisited((prev) => {
      if (prev[activeStage]) return prev;
      const next = [...prev];
      next[activeStage] = true;
      return next;
    });
  }, [activeStage]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Hover effect on cards
      gsap.fromTo(
        `.${styles.pathCard}`,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: "power2.out" }
      );

      // 2. Animate the dot along the path repeatedly
      const path = pathRef.current;
      const dot = dotRef.current;
      if (path && dot) {
        const pathLength = path.getTotalLength();
        
        // Setup initial stroke dash array/offset
        gsap.set(path, {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
        });

        // Create scroll/timeline trigger
        const tl = gsap.timeline({
          repeat: -1,
          defaults: { duration: 12, ease: "none" },
          onUpdate: function () {
            const progress = this.progress();
            let newStage = 0;
            if (progress < 0.16) {
              newStage = 0;
            } else if (progress < 0.38) {
              newStage = 1;
            } else if (progress < 0.61) {
              newStage = 2;
            } else if (progress < 0.83) {
              newStage = 3;
            } else {
              newStage = 4;
            }
            setActiveStage((prev) => (prev !== newStage ? newStage : prev));
          }
        });

        tl.to(path, {
          strokeDashoffset: 0,
          duration: 12,
          ease: "none",
        }).to(dot, {
          motionPath: {
            path: path,
            align: path,
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
          },
          duration: 12,
          ease: "none",
        }, 0);

        tlRef.current = tl;
      }
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, []);

  const handleStageClick = (idx: number) => {
    setActiveStage(idx);
    if (tlRef.current) {
      if (idx === 0) tlRef.current.progress(0.05);
      else if (idx === 1) tlRef.current.progress(0.275);
      else if (idx === 2) tlRef.current.progress(0.5);
      else if (idx === 3) tlRef.current.progress(0.725);
      else if (idx === 4) tlRef.current.progress(0.95);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.svgWrapper}>
        <svg viewBox="0 0 1000 200" className={styles.svgPath} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            ref={pathRef}
            d="M 50 100 Q 250 20 500 100 T 950 100"
            className={styles.bgPath}
            stroke="#e2e8f0"
            strokeWidth="4"
          />
          <path
            d="M 50 100 Q 250 20 500 100 T 950 100"
            className={styles.activePath}
            stroke="url(#pathGradient)"
            strokeWidth="4"
          />
          <circle ref={dotRef} r="8" fill="#96a1ab" className={styles.pulseDot} />
          
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#96a1ab" />
              <stop offset="50%" stopColor="#9C85FF" />
              <stop offset="100%" stopColor="#96a1ab" />
            </linearGradient>
          </defs>
        </svg>

        <div className={styles.nodeContainer}>
          {stages.map((stage, idx) => {
            const positions = [
              { left: "5%", top: "50%" },
              { left: "27.5%", top: "30%" },
              { left: "50%", top: "50%" },
              { left: "72.5%", top: "70%" },
              { left: "95%", top: "50%" },
            ];
            return (
              <div
                key={stage.id}
                className={`${styles.node} ${activeStage === idx ? styles.nodeActive : ""}`}
                style={positions[idx]}
                onClick={() => handleStageClick(idx)}
                title={stage.title}
              >
                <div className={styles.nodePing} style={{ backgroundColor: "#96a1ab" }}></div>
                <div className={styles.nodeTooltip}>{stage.title}</div>
                <div className={`${styles.nodeLabel} ${visited[idx] ? styles.nodeLabelVisible : ""} ${activeStage === idx ? styles.nodeLabelActive : ""}`}>
                  {stage.title.split(". ")[1]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.stageDetails}>
        <div className={styles.stageCardActive} style={{ borderColor: stages[activeStage].color }}>
          <div className={styles.tag} style={{ backgroundColor: stages[activeStage].color + "12", color: stages[activeStage].color }}>
            {stages[activeStage].tag}
          </div>
          <h3 className={styles.title}>{stages[activeStage].title}</h3>
          <h4 className={styles.subtitle}>{stages[activeStage].subtitle}</h4>
          <p className={styles.desc}>{stages[activeStage].desc}</p>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className={`${styles.pathCard} ${activeStage === idx ? styles.activeCard : ""}`}
            onClick={() => handleStageClick(idx)}
            style={{ "--accent-color": stage.color } as React.CSSProperties}
          >
            <span className={styles.cardTag}>{stage.tag}</span>
            <h3 className={styles.cardTitle}>{stage.title}</h3>
            <p className={styles.cardDesc}>{stage.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
