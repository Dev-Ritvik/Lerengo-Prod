"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getVideoEmbedUrl,
  NOTE_CATEGORY_ORDER,
  type StructuredNoteCategoryKey,
  type StructuredNoteContent,
  type StructuredNoteUnit,
} from "@/lib/note-content";
import type { NoteAssessmentSummary } from "@/lib/note-assessments";
import styles from "./page.module.css";

type RelatedNote = {
  id: string;
  title: string;
  subject: string | null;
  semester: number | null;
};

type Props = {
  content: StructuredNoteContent;
  createdLabel: string;
  department: string | null;
  description: string | null;
  downloadHref: string | null;
  email: string;
  assessment: NoteAssessmentSummary | null;
  hasAccess: boolean;
  hasReferencePdf: boolean;
  isOfferFree: boolean;
  noteId: string;
  priceInr: number;
  programDomain: string | null;
  relatedNotes: RelatedNote[];
  semester: number | null;
  subject: string | null;
  testHref: string | null;
  title: string;
  updatedLabel: string;
  userName: string;
  isSuperadmin?: boolean;
};


type NoteRenderBlock =
  | { type: "heading"; text: string }
  | { type: "ordered-list"; items: string[] }
  | { type: "paragraph"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "unordered-list"; items: string[] };

const CATEGORY_COPY: Record<
  StructuredNoteCategoryKey,
  { empty: string; label: string; meta: string; subtitle: string }
> = {
  mind_map: {
    empty: "Mind-map branches for this unit are still being prepared.",
    label: "Mind Map",
    meta: "branch map",
    subtitle: "Reconnect the structure of the unit through branches and fast visual recall.",
  },
  notes: {
    empty: "Detailed notes for this unit are still being prepared.",
    label: "Notes",
    meta: "reader flow",
    subtitle: "Read the main explanation for each unit in sequence, without jumping back to the PDF.",
  },
  pyqs: {
    empty: "Previous-year questions for this unit are still being prepared.",
    label: "PYQs",
    meta: "exam practice",
    subtitle: "Focus on repeated questions, likely prompts, and what usually shows up in evaluation.",
  },
  revision: {
    empty: "Revision points for this unit are still being prepared.",
    label: "Revision",
    meta: "quick recall",
    subtitle: "Use compact revision points for faster retention before internals, viva, and end-sem exams.",
  },
};

interface QuizQuestion {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
}

// Simulated doubts interface
interface DoubtItem {
  id: string;
  text: string;
  status: "pending" | "claimed";
  claimedBy?: string;
  createdAt: string;
}

function formatPrice(priceInr: number, isOfferFree: boolean) {
  if (priceInr <= 0) {
    return "Free";
  }
  if (isOfferFree) {
    return "Offer free";
  }
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(priceInr);
}



function getVisibleUnits(content: StructuredNoteContent, noteTitle: string): StructuredNoteUnit[] {
  const units = content.units.filter(
    (unit) =>
      Boolean(
        unit.title.trim() ||
          unit.notes.trim() ||
          unit.revision.length ||
          unit.mindMap.length ||
          unit.pyqs.length,
      ),
  );
  if (units.length > 0) {
    return units;
  }
  return [
    {
      id: "unit-1",
      label: "Unit 1",
      mindMap: content.mindMap,
      notes: content.fullText,
      pyqs: [],
      revision: content.shortNotes,
      title: noteTitle,
    },
  ];
}

function isHeadingLine(line: string) {
  const trimmed = line.trim();
  return /^#{1,6}\s+/.test(trimmed) || /^(?:[A-Z]\.|[0-9]+\.)\s+/.test(trimmed) || /^Unit\s+\d+/i.test(trimmed);
}

function cleanHeadingText(line: string) {
  return line.replace(/^#{1,6}\s+/, "").trim();
}

function parseTableRow(line: string) {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function isDividerRow(row: string[]) {
  return row.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseNotesBlocks(value: string) {
  const rawBlocks = value
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
  const blocks: NoteRenderBlock[] = [];
  rawBlocks.forEach((block) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      return;
    }
    if (lines.length >= 2 && lines.every((line) => line.includes("|"))) {
      const rows = lines.map(parseTableRow).filter((row) => row.length > 0);
      if (rows.length >= 2) {
        const [headers, ...bodyRows] = rows;
        const normalizedRows = isDividerRow(bodyRows[0] ?? []) ? bodyRows.slice(1) : bodyRows;
        blocks.push({
          headers,
          rows: normalizedRows,
          type: "table",
        });
        return;
      }
    }
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      blocks.push({
        items: lines.map((line) => line.replace(/^[-*]\s+/, "").trim()),
        type: "unordered-list",
      });
      return;
    }
    if (lines.every((line) => /^\d+[\.\)]\s+/.test(line))) {
      blocks.push({
        items: lines.map((line) => line.replace(/^\d+[\.\)]\s+/, "").trim()),
        type: "ordered-list",
      });
      return;
    }
    if (isHeadingLine(lines[0])) {
      blocks.push({
        text: cleanHeadingText(lines[0]),
        type: "heading",
      });
      const remainder = lines.slice(1).join(" ").trim();
      if (remainder) {
        blocks.push({
          text: remainder,
          type: "paragraph",
        });
      }
      return;
    }
    blocks.push({
      text: lines.join(" "),
      type: "paragraph",
    });
  });
  return blocks;
}

function getUnitMeta(unit: StructuredNoteUnit, category: StructuredNoteCategoryKey) {
  if (category === "notes") {
    const noteBlocks = parseNotesBlocks(unit.notes).length;
    return `${noteBlocks} ${noteBlocks === 1 ? "content block" : "content blocks"}`;
  }
  if (category === "revision") {
    return `${unit.revision.length} ${unit.revision.length === 1 ? "revision point" : "revision points"}`;
  }
  if (category === "mind_map") {
    return `${unit.mindMap.length} ${unit.mindMap.length === 1 ? "branch" : "branches"}`;
  }
  return `${unit.pyqs.length} ${unit.pyqs.length === 1 ? "question" : "questions"}`;
}

function renderNoteBlock(block: NoteRenderBlock, key: string) {
  if (block.type === "heading") {
    return (
      <h4 className={styles.noteSubheading} key={key}>
        {block.text}
      </h4>
    );
  }
  if (block.type === "paragraph") {
    return (
      <p className={styles.noteParagraph} key={key}>
        {block.text}
      </p>
    );
  }
  if (block.type === "unordered-list" || block.type === "ordered-list") {
    const ListTag = block.type === "ordered-list" ? "ol" : "ul";
    return (
      <ListTag
        className={`${styles.noteList} ${block.type === "ordered-list" ? styles.noteListOrdered : styles.noteListUnordered}`}
        key={key}
      >
        {block.items.map((item, index) => (
          <li key={`${key}-${index}`}>{item}</li>
        ))}
      </ListTag>
    );
  }
  return (
    <div className={styles.noteTableWrap} key={key}>
      <table className={styles.noteTable}>
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`${key}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${key}-${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NoteDetailShell({
  content,
  createdLabel,
  department,
  description,
  downloadHref,
  email,
  assessment,
  hasAccess,
  isOfferFree,
  noteId,
  priceInr,
  programDomain,
  relatedNotes,
  semester,
  subject,
  title,
  updatedLabel,
  userName,
  isSuperadmin = false,
}: Props) {
  const router = useRouter();
  
  // --- Workspace states ---
  const [activeTab, setActiveTab] = useState<"notes" | "videos" | "tests" | "minor_tests" | "faq">("notes");
  const [hasUnlockedAccess, setHasUnlockedAccess] = useState(hasAccess);
  const isUnlocked = hasUnlockedAccess || priceInr <= 0 || isOfferFree;
  
  // Note category switch (Inside Notes Tab)
  const [selectedCategory, setSelectedCategory] = useState<StructuredNoteCategoryKey>("notes");
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  // Video states
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  // Simulated Payment overlay
  const [showPayModal, setShowPayModal] = useState(false);
  const [payStep, setPayStep] = useState<"methods" | "processing" | "success">("methods");

  // Dynamic Quiz state
  const [testDifficulty, setTestDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<string, boolean>>({});
  
  // Doubt support state
  const [doubtText, setDoubtText] = useState("");
  const [doubts, setDoubts] = useState<DoubtItem[]>([]);

  // Admin notes simulator
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminTitle, setAdminTitle] = useState("");
  const [adminPrice, setAdminPrice] = useState("99");

  const priceLabel = useMemo(() => formatPrice(priceInr, isOfferFree), [priceInr, isOfferFree]);
  const videoEmbedUrl = useMemo(() => getVideoEmbedUrl(content.videoUrl), [content.videoUrl]);
  const units = useMemo(() => getVisibleUnits(content, title), [content, title]);
  const categoryCopy = CATEGORY_COPY[selectedCategory];

  // Sync initial unit selector
  useEffect(() => {
    setActiveUnitId(units[0]?.id ?? null);
  }, [selectedCategory, units]);

  // Video lessons derived mapping
  const videoLessons = useMemo(() => {
    return units.map((unit, index) => ({
      duration: `${10 + (index * 3)}:15`,
      id: unit.id,
      title: `${unit.label} Walkthrough - ${unit.title}`
    }));
  }, [units]);

  // Quiz questions derived mapping
  const quizQuestions = useMemo(() => {
    const isCSE = (subject || "").toLowerCase().includes("data") || (subject || "").toLowerCase().includes("alg") || (title || "").toLowerCase().includes("data");
    const isNet = (subject || "").toLowerCase().includes("network") || (title || "").toLowerCase().includes("network");

    // Dynamic fallback questions based on subject keyword
    const cseQuestions: Record<"easy" | "medium" | "hard", QuizQuestion> = {
      easy: {
        correctOptionId: "B",
        explanation: "Stack is a LIFO (Last In First Out) structure where elements are added and removed from the same end.",
        id: "q-1",
        options: [
          { id: "A", label: "Queue" },
          { id: "B", label: "Stack" },
          { id: "C", label: "Array" },
          { id: "D", label: "Linked List" }
        ],
        prompt: "Which of the following data structures operates on the Last-In-First-Out (LIFO) principle?"
      },
      medium: {
        correctOptionId: "B",
        explanation: "Binary search repeatedly divides the search space in half, requiring O(log n) comparisons in the worst case.",
        id: "q-2",
        options: [
          { id: "A", label: "O(1)" },
          { id: "B", label: "O(log n)" },
          { id: "C", label: "O(n)" },
          { id: "D", label: "O(n log n)" }
        ],
        prompt: "What is the worst-case time complexity of Binary Search?"
      },
      hard: {
        correctOptionId: "B",
        explanation: "Red-Black Trees guarantee O(log n) operations by maintaining color balance, preventing worst-case linear O(n) degeneration of unbalanced BSTs.",
        id: "q-3",
        options: [
          { id: "A", label: "Red-Black Trees require significantly less memory footprint" },
          { id: "B", label: "Red-Black Trees guarantee O(log n) searches and insertions in worst case" },
          { id: "C", label: "Red-Black Trees are much simpler to implement than Standard BSTs" },
          { id: "D", label: "None of the above options are correct" }
        ],
        prompt: "What is the key advantage of a Red-Black Tree over a standard unbalanced Binary Search Tree (BST)?"
      }
    };

    const netQuestions: Record<"easy" | "medium" | "hard", QuizQuestion> = {
      easy: {
        correctOptionId: "C",
        explanation: "The Network Layer handles packet routing, forwarding, and addressing across intermediate network segments.",
        id: "q-1",
        options: [
          { id: "A", label: "Physical Layer" },
          { id: "B", label: "Data Link Layer" },
          { id: "C", label: "Network Layer" },
          { id: "D", label: "Transport Layer" }
        ],
        prompt: "Which layer of the OSI model is responsible for routing packets across networks?"
      },
      medium: {
        correctOptionId: "C",
        explanation: "Class C network subnet mask default value is 255.255.255.0, allocation support for up to 254 host addresses.",
        id: "q-2",
        options: [
          { id: "A", label: "255.0.0.0" },
          { id: "B", label: "255.255.0.0" },
          { id: "C", label: "255.255.255.0" },
          { id: "D", label: "255.255.255.255" }
        ],
        prompt: "What is the default subnet mask for a Class C IP address?"
      },
      hard: {
        correctOptionId: "B",
        explanation: "The TCP three-way handshake establishes segment connection, synchronizes initial sequence numbers (ISNs), and confirms port sockets.",
        id: "q-3",
        options: [
          { id: "A", label: "Encrypting packet payloads" },
          { id: "B", label: "Establishing connection and synchronizing sequence numbers" },
          { id: "C", label: "Executing congestion control parameters" },
          { id: "D", label: "Performing cyclic redundancy check verification" }
        ],
        prompt: "What is the primary function of the TCP three-way handshake process?"
      }
    };

    const generalQuestions: Record<"easy" | "medium" | "hard", QuizQuestion> = {
      easy: {
        correctOptionId: "A",
        explanation: "Structured study notes condense core information for rapid revision and formula checks before examinations.",
        id: "q-1",
        options: [
          { id: "A", label: "Quick exam revision" },
          { id: "B", label: "Direct memorization of textbooks" },
          { id: "C", label: "Replacing classroom lecture presence" },
          { id: "D", label: "None of the above" }
        ],
        prompt: "What is the primary purpose of using revision notes and mind maps?"
      },
      medium: {
        correctOptionId: "B",
        explanation: "The Feynman Technique forces deep comprehension by explaining complex topics in plain, accessible language.",
        id: "q-2",
        options: [
          { id: "A", label: "The Pomodoro cycle" },
          { id: "B", label: "The Feynman Technique" },
          { id: "C", label: "Spaced repetition" },
          { id: "D", label: "Passive reading" }
        ],
        prompt: "Which learning technique involves explaining a concept to a child or in simple terms to find knowledge gaps?"
      },
      hard: {
        correctOptionId: "B",
        explanation: "Active learning is built upon active recall, self-assessment testing, and critical application exercises, yielding superior retention.",
        id: "q-3",
        options: [
          { id: "A", label: "Rereading highlighted textbooks" },
          { id: "B", label: "Active recall, self-testing, and critical analysis" },
          { id: "C", label: "Listening passively to audio lectures" },
          { id: "D", label: "Writing word-for-word summaries of slides" }
        ],
        prompt: "What is the core factor that defines active learning and high-yield retention?"
      }
    };

    // If assessment questions exist, map them. Otherwise, seed them.
    if (assessment && assessment.questions.length >= 3) {
      return {
        easy: {
          correctOptionId: "A", // Default mock correct
          explanation: "Explanation for question 1.",
          id: assessment.questions[0].id,
          options: assessment.questions[0].options,
          prompt: assessment.questions[0].prompt
        },
        medium: {
          correctOptionId: "B",
          explanation: "Explanation for question 2.",
          id: assessment.questions[1].id,
          options: assessment.questions[1].options,
          prompt: assessment.questions[1].prompt
        },
        hard: {
          correctOptionId: "C",
          explanation: "Explanation for question 3.",
          id: assessment.questions[2].id,
          options: assessment.questions[2].options,
          prompt: assessment.questions[2].prompt
        }
      };
    }

    return isCSE ? cseQuestions : isNet ? netQuestions : generalQuestions;
  }, [assessment, subject, title]);

  // Observer intersection for scroll tracking (only inside Notes Tab)
  useEffect(() => {
    if (activeTab !== "notes") {
      return undefined;
    }
    const elements = units
      .map((unit) => document.getElementById(`reader-${selectedCategory}-${unit.id}`))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
        if (!visibleEntry) {
          return;
        }
        const unitId = visibleEntry.target.getAttribute("data-unit-id");
        if (unitId) {
          setActiveUnitId(unitId);
        }
      },
      {
        rootMargin: "-10% 0px -62% 0px",
        threshold: [0.22, 0.55],
      },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [selectedCategory, units, activeTab]);

  // Delete note action
  const handleDeleteNote = async () => {
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      return;
    }
    try {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) {
        alert("Failed to delete note: " + error.message);
      } else {
        alert("Note deleted successfully.");
        router.push("/browse-notes");
      }
    } catch (err: any) {
      alert("Error deleting note: " + err.message);
    }
  };

  // Simulated purchase success -> Database Row Insert
  const handleSimulateUnlock = async () => {
    setPayStep("processing");
    try {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Insert record to supabase note_access table
        const { error } = await supabase.from("note_access").insert({
          note_id: noteId,
          user_id: user.id
        });
        if (error) {
          console.error("Database insert warning:", error.message);
        }
      }
    } catch (err) {
      console.error("Supabase write exception:", err);
    }

    setTimeout(() => {
      setPayStep("success");
    }, 1200);
  };

  const handleFinishSimulation = () => {
    setHasUnlockedAccess(true);
    setShowPayModal(false);
    setActiveTab("notes");
  };

  // Video selector play handler
  const handlePlayVideoLesson = (index: number) => {
    if (!isUnlocked) {
      setShowPayModal(true);
      return;
    }
    setActiveVideoIndex(index);
    setActiveTab("videos");
  };

  // MCQ Checker handler
  const handleCheckQuizAnswer = (diff: "easy" | "medium" | "hard") => {
    const q = quizQuestions[diff];
    setCheckedAnswers((prev) => ({ ...prev, [q.id]: true }));
  };

  // Doubt submission claim workflow
  const handleAskDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtText.trim()) return;

    const newDoubt: DoubtItem = {
      createdAt: new Date().toLocaleTimeString(),
      id: `doubt-${Date.now()}`,
      status: "pending",
      text: doubtText
    };

    setDoubts((prev) => [newDoubt, ...prev]);
    setDoubtText("");

    // Simulate coordinator claiming doubt after 2.5s
    setTimeout(() => {
      setDoubts((prev) =>
        prev.map((d) =>
          d.id === newDoubt.id
            ? { ...d, claimedBy: "Amit Kumar (Senior Mentor)", status: "claimed" }
            : d
        )
      );
    }, 2500);
  };

  // Admin notes upload simulation
  const handleAdminFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTitle.trim()) return;

    try {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Insert real note row
        const { error } = await supabase.from("notes").insert({
          title: adminTitle,
          price_inr: Number(adminPrice),
          department: department || "Computer Science",
          semester: semester || 3,
          subject: subject || "Engineering Core",
          is_verified: true,
          university_id: user.user_metadata?.university_id || "lpu-id"
        });

        if (error) {
          alert("Real insert error: " + error.message);
        } else {
          alert("Note uploaded and verified successfully in database!");
          setShowAdminModal(false);
          router.push("/browse-notes");
        }
      }
    } catch (err: any) {
      alert("Admin write exception: " + err.message);
    }
  };

  function handleJumpToUnit(unitId: string) {
    const target = document.getElementById(`reader-${selectedCategory}-${unitId}`);
    if (!target) {
      return;
    }
    setActiveUnitId(unitId);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={styles.viewport}>
      <div className={styles.canvas}>
        
        {/* --- Premium Navigation Workspace Tabs --- */}
        <div style={{ marginBottom: "20px" }}>
          <div className={styles.workspaceNav} role="tablist">
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`${styles.workspaceTab} ${activeTab === "notes" ? styles.workspaceTabActive : ""}`}
              role="tab"
            >
              <span className={styles.tabIcon}>📝</span>
              <span>Full Notes</span>
            </button>
            
            <button
              type="button"
              onClick={() => handlePlayVideoLesson(activeVideoIndex)}
              className={`${styles.workspaceTab} ${activeTab === "videos" ? styles.workspaceTabActive : ""} ${!isUnlocked ? styles.workspaceTabLocked : ""}`}
              role="tab"
            >
              <span className={styles.tabIcon}>🎥</span>
              <span>Video Lectures {!isUnlocked && "🔒"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isUnlocked) { setShowPayModal(true); return; }
                setActiveTab("tests");
              }}
              className={`${styles.workspaceTab} ${activeTab === "tests" ? styles.workspaceTabActive : ""} ${!isUnlocked ? styles.workspaceTabLocked : ""}`}
              role="tab"
            >
              <span className={styles.tabIcon}>🧪</span>
              <span>Topic Tests {!isUnlocked && "🔒"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isUnlocked) { setShowPayModal(true); return; }
                setActiveTab("minor_tests");
              }}
              className={`${styles.workspaceTab} ${activeTab === "minor_tests" ? styles.workspaceTabActive : ""} ${!isUnlocked ? styles.workspaceTabLocked : ""}`}
              role="tab"
            >
              <span className={styles.tabIcon}>📋</span>
              <span>Minor Tests {!isUnlocked && "🔒"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("faq")}
              className={`${styles.workspaceTab} ${activeTab === "faq" ? styles.workspaceTabActive : ""}`}
              role="tab"
            >
              <span className={styles.tabIcon}>💬</span>
              <span>FAQs & Doubt</span>
            </button>
          </div>
        </div>

        {/* --- Grid Layout Stack --- */}
        <div className={styles.detailStack}>
          
          {/* Main workspace section */}
          <div className={styles.mainCol}>
            
            {/* STUDY MODULE: NOTES TAB */}
            {activeTab === "notes" && (
              <div className={styles.glassCard}>
                <div className={styles.navigatorHeader}>
                  <div>
                    <h3 className={styles.sectionTitle}>Unit Reader</h3>
                    <p className={styles.sectionSubtitle}>{categoryCopy.subtitle}</p>
                  </div>
                  <div className={styles.categorySwitch}>
                    {NOTE_CATEGORY_ORDER.map((category) => (
                      <button
                        type="button"
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`${styles.categoryButton} ${selectedCategory === category ? styles.categoryButtonActive : ""}`}
                      >
                        {CATEGORY_COPY[category].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.contentsPanel}>
                  <h4 className={styles.contentsTitle}>Table of Contents</h4>
                  <p className={styles.contentsBody}>Jump directly into unit contents below:</p>
                  <div className={styles.tocGrid}>
                    {units.map((unit, idx) => {
                      const unitLocked = !isUnlocked && idx >= 2;
                      return (
                        <button
                          type="button"
                          key={unit.id}
                          onClick={() => {
                            if (unitLocked) { setShowPayModal(true); return; }
                            handleJumpToUnit(unit.id);
                          }}
                          className={`${styles.tocCard} ${activeUnitId === unit.id ? styles.tocCardActive : ""}`}
                        >
                          <span className={styles.tocCardLabel}>{unit.label} {unitLocked && "🔒"}</span>
                          <span className={styles.tocCardTitle}>{unit.title}</span>
                          <span className={styles.tocCardMeta}>{getUnitMeta(unit, selectedCategory)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.unitStream}>
                  {units.map((unit, idx) => {
                    const unitLocked = !isUnlocked && idx >= 2;
                    if (unitLocked) {
                      return (
                        <article key={unit.id} className={styles.unitSection} style={{ opacity: 0.5, textAlign: "center", padding: "40px" }}>
                          <span style={{ fontSize: "2rem" }}>🔒</span>
                          <h3 style={{ marginTop: "12px", color: "#ffffff" }}>{unit.label} - {unit.title} Locked</h3>
                          <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "8px 0 16px" }}>Unlock this premium notes file to read all subsequent units.</p>
                          <button type="button" onClick={() => setShowPayModal(true)} className="button small">Unlock Note</button>
                        </article>
                      );
                    }

                    return (
                      <article
                        key={unit.id}
                        id={`reader-${selectedCategory}-${unit.id}`}
                        data-unit-id={unit.id}
                        className={`${styles.unitSection} ${activeUnitId === unit.id ? styles.unitSectionActive : ""}`}
                      >
                        <div className={styles.unitSectionHeader}>
                          <div className={styles.unitHeading}>
                            <span className={styles.unitLabel}>{unit.label}</span>
                            <h3 className={styles.unitSectionTitle}>{unit.title}</h3>
                          </div>
                          <span className={styles.unitMeta}>{getUnitMeta(unit, selectedCategory)}</span>
                        </div>
                        {selectedCategory === "notes" && (
                          <div className={styles.notesFlow}>
                            {parseNotesBlocks(unit.notes).map((block, bIdx) => renderNoteBlock(block, `${unit.id}-${bIdx}`))}
                          </div>
                        )}
                        {selectedCategory === "revision" && (
                          <div className={styles.revisionGrid}>
                            {unit.revision.map((rev, rIdx) => (
                              <div key={rIdx} className={styles.revisionItem}>{rev}</div>
                            ))}
                          </div>
                        )}
                        {selectedCategory === "mind_map" && (
                          <div className={styles.mindMapGrid}>
                            {unit.mindMap.map((mapBranch, mIdx) => (
                              <div key={mIdx} className={styles.mindMapCard}>
                                <h4 className={styles.contentHeading}>{mapBranch.branch}</h4>
                                <div className={styles.metaPillsWrap}>
                                  {mapBranch.items.map((item, iIdx) => (
                                    <span key={iIdx} className={styles.metaPill}>{item}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedCategory === "pyqs" && (
                          <div className={styles.questionGrid}>
                            {unit.pyqs.map((pyq, pIdx) => (
                              <div key={pIdx} className={styles.questionCard}>
                                <span className={styles.questionIndex}>PYQ {pIdx + 1}</span>
                                <p className={styles.questionText}>{pyq}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STUDY MODULE: VIDEO LECTURES TAB */}
            {activeTab === "videos" && isUnlocked && (
              <div className={`${styles.glassCard} ${styles.videoWorkspace}`}>
                <div>
                  <h3 className={styles.sectionTitle}>Video Lectures</h3>
                  <p className={styles.sectionSubtitle}>Widescreen linked teaching explanations</p>
                </div>
                
                <div className={styles.widescreenPlayer}>
                  {videoEmbedUrl ? (
                    <iframe
                      src={videoEmbedUrl}
                      className={styles.playerFrame}
                      allowFullScreen
                      title="Widescreen video lesson player"
                    />
                  ) : (
                    <div className={styles.playerPlaceholder}>
                      <div className={styles.playerIcon}>▶</div>
                      <span>Streaming {videoLessons[activeVideoIndex]?.title}...</span>
                    </div>
                  )}
                </div>

                <div className={styles.videoListGrid}>
                  {videoLessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      onClick={() => handlePlayVideoLesson(idx)}
                      className={`${styles.videoListItem} ${activeVideoIndex === idx ? styles.videoListItemActive : ""}`}
                    >
                      <span className={styles.videoPlayBadge}>▶</span>
                      <div className={styles.videoListItemText}>
                        <span className={styles.videoListItemTitle}>{lesson.title}</span>
                        <span className={styles.videoListItemMeta}>{lesson.duration} mins</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STUDY MODULE: TOPIC TESTS TAB */}
            {activeTab === "tests" && isUnlocked && (
              <div className={`${styles.glassCard} ${styles.quizWorkspace}`}>
                <div>
                  <h3 className={styles.sectionTitle}>Topic-wise Quiz Desk</h3>
                  <p className={styles.sectionSubtitle}>Evaluate your unit comprehension interactively</p>
                </div>

                <div className={styles.quizDifficultyBar}>
                  <button
                    type="button"
                    onClick={() => setTestDifficulty("easy")}
                    className={`${styles.difficultyTab} ${testDifficulty === "easy" ? styles.tabEasyActive : ""}`}
                  >
                    Level 1 - Easy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestDifficulty("medium")}
                    className={`${styles.difficultyTab} ${testDifficulty === "medium" ? styles.tabMediumActive : ""}`}
                  >
                    Level 2 - Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestDifficulty("hard")}
                    className={`${styles.difficultyTab} ${testDifficulty === "hard" ? styles.tabHardActive : ""}`}
                  >
                    Level 3 - Hard
                  </button>
                </div>

                {(() => {
                  const q = quizQuestions[testDifficulty];
                  const hasAnswered = !!selectedAnswers[q.id];
                  const isChecked = !!checkedAnswers[q.id];
                  return (
                    <div className={styles.quizContainer}>
                      <span className={styles.quizQNum}>Question - {testDifficulty.toUpperCase()}</span>
                      <h4 className={styles.quizQuestion}>{q.prompt}</h4>
                      <div className={styles.quizOptionsList}>
                        {q.options.map((opt) => {
                          const isSelected = selectedAnswers[q.id] === opt.id;
                          const showCorrect = isChecked && opt.id === q.correctOptionId;
                          const showWrong = isChecked && isSelected && opt.id !== q.correctOptionId;
                          
                          return (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => {
                                if (isChecked) return;
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt.id }));
                              }}
                              className={`${styles.quizOptionBox} ${isSelected ? styles.quizOptionSelected : ""} ${showCorrect ? styles.quizOptionCorrect : ""} ${showWrong ? styles.quizOptionWrong : ""}`}
                            >
                              {opt.id}. {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      {isChecked && (
                        <div className={`${styles.quizFeedbackBox} ${selectedAnswers[q.id] === q.correctOptionId ? styles.feedbackCorrect : styles.feedbackWrong}`}>
                          {selectedAnswers[q.id] === q.correctOptionId ? "✓ Correct!" : "✗ Incorrect!"} {q.explanation}
                        </div>
                      )}

                      <div className={styles.quizControls}>
                        <button
                          type="button"
                          onClick={() => handleCheckQuizAnswer(testDifficulty)}
                          className="button primary small"
                          disabled={!hasAnswered || isChecked}
                        >
                          Check Answer
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* STUDY MODULE: MINOR TESTS TAB */}
            {activeTab === "minor_tests" && isUnlocked && (
              <div className={`${styles.glassCard} ${styles.minorTestsWorkspace}`}>
                <div>
                  <h3 className={styles.sectionTitle}>Minor Tests (Chapter-End)</h3>
                  <p className={styles.sectionSubtitle}>Complete assessments covering all topics</p>
                </div>
                <div className={styles.minorTestsGrid}>
                  <div className={`${styles.minorTestCard} ${styles.minorTestCardActive}`}>
                    <span className={styles.minorTestCheckbox}>✓</span>
                    <div className={styles.minorTestInfo}>
                      <span className={styles.minorTestTitle}>Minor Test 1 - Basic Synthesis</span>
                      <span className={styles.minorTestMeta}>10 Questions • 10 Marks • Completed</span>
                    </div>
                  </div>
                  <div className={`${styles.minorTestCard} ${styles.minorTestCardActive}`}>
                    <span className={styles.minorTestCheckbox}>✓</span>
                    <div className={styles.minorTestInfo}>
                      <span className={styles.minorTestTitle}>Minor Test 2 - Struct Verification</span>
                      <span className={styles.minorTestMeta}>10 Questions • 10 Marks • Completed</span>
                    </div>
                  </div>
                  <div className={styles.minorTestCard}>
                    <span className={styles.minorTestCheckbox}></span>
                    <div className={styles.minorTestInfo}>
                      <span className={styles.minorTestTitle}>Minor Test 3 - Algorithmic Analysis</span>
                      <span className={styles.minorTestMeta}>15 Questions • 15 Marks • Ready</span>
                    </div>
                  </div>
                  <div className={`${styles.minorTestCard} ${styles.minorTestCardLocked}`}>
                    <span className={styles.minorTestCheckbox}>🔒</span>
                    <div className={styles.minorTestInfo}>
                      <span className={styles.minorTestTitle}>Minor Test 4 - Memory Optimization</span>
                      <span className={styles.minorTestMeta}>Locked • Complete Unit 4 tests first</span>
                    </div>
                  </div>
                  <div className={`${styles.minorTestCard} ${styles.minorTestCardLocked}`}>
                    <span className={styles.minorTestCheckbox}>🔒</span>
                    <div className={styles.minorTestInfo}>
                      <span className={styles.minorTestTitle}>Minor Test 5 - Final Synthesis Review</span>
                      <span className={styles.minorTestMeta}>Locked • Complete Unit 5 tests first</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STUDY MODULE: FAQS AND DOUBTS TAB */}
            {activeTab === "faq" && (
              <div className={styles.glassCard} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <h3 className={styles.sectionTitle}>FAQs & Mentor Doubt support</h3>
                  <p className={styles.sectionSubtitle}>Resolve concepts and ask doubt claims from coordinators</p>
                </div>

                <div className={styles.doubtWorkspace}>
                  {/* Doubt submissions */}
                  <div className={styles.doubtFormSection}>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>Ask Doubts to Mentors</h4>
                    <form onSubmit={handleAskDoubt} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <textarea
                        value={doubtText}
                        onChange={(e) => setDoubtText(e.target.value)}
                        placeholder="Type your academic doubt here... (e.g., How does rotation balance work in AVL trees?)"
                        className={styles.doubtTextArea}
                        required
                      />
                      <button type="submit" className="button small" style={{ alignSelf: "flex-end" }}>Submit Doubt</button>
                    </form>

                    {doubts.length > 0 && (
                      <div className={styles.submittedDoubtList}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8c8e95", textTransform: "uppercase" }}>My Doubts Status</span>
                        {doubts.map((d) => (
                          <div key={d.id} className={styles.submittedDoubtCard}>
                            <p className={styles.doubtText}>{d.text}</p>
                            <div className={styles.doubtFooter}>
                              <span style={{ color: "#64748b" }}>Submitted {d.createdAt}</span>
                              {d.status === "pending" ? (
                                <span className={styles.doubtStatusPending}>🕒 Waiting for coordinator claim...</span>
                              ) : (
                                <span className={styles.doubtStatusClaimed}>✓ Claimed by <span className={styles.doubtClaimer}>{d.claimedBy}</span></span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FAQ list */}
                  <div className={styles.faqSection}>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>Concept FAQs</h4>
                    
                    <details className={styles.faqItem} open>
                      <summary className={styles.faqSummary}>
                        <span>How are these notes verified?</span>
                        <span>▾</span>
                      </summary>
                      <p className={styles.faqAnswer}>
                        Every note file uploaded is cross-reviewed by university subject coordinators and marked as verified only when it matches syllabus structures and grading guidelines.
                      </p>
                    </details>

                    <details className={styles.faqItem}>
                      <summary className={styles.faqSummary}>
                        <span>Can I study offline?</span>
                        <span>▾</span>
                      </summary>
                      <p className={styles.faqAnswer}>
                        Yes! Unlocked notes grant full download access to reference PDFs which can be saved to your device and read offline anywhere.
                      </p>
                    </details>

                    <details className={styles.faqItem}>
                      <summary className={styles.faqSummary}>
                        <span>Will I get certificates?</span>
                        <span>▾</span>
                      </summary>
                      <p className={styles.faqAnswer}>
                        Once you complete all topic-wise tests and minor assessments with a passing score (above 70%), a course verified certificate is instantly generated in your profile.
                      </p>
                    </details>
                  </div>
                </div>
              </div>
            )}

            {/* Note overview description card */}
            <div className={styles.glassCard}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Overview</h3>
                <p className={styles.sectionSubtitle}>Start with the framing before moving into unit-by-unit study.</p>
              </div>
              {description && (
                <p className={styles.overviewText} style={{ marginBottom: "12px", color: "#ffffff", fontWeight: 500 }}>
                  {description}
                </p>
              )}
              <p className={styles.overviewText}>{content.overview}</p>
            </div>
            
            {/* Related verified notes card */}
            {relatedNotes.length > 0 && (
              <div className={styles.glassCard}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Related Notes</h3>
                  <p className={styles.sectionSubtitle}>Other verified material from your campus catalog.</p>
                </div>
                <div className={styles.relatedGrid}>
                  {relatedNotes.map((note) => (
                    <Link key={note.id} href={`/browse-notes/${note.id}`} className={styles.relatedCard}>
                      <span className={styles.relatedCardTitle}>{note.title}</span>
                      <span className={styles.relatedCardMeta}>
                        {note.subject} {note.semester ? `• Semester ${note.semester}` : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar section */}
          <div className={styles.sidebarCol}>
            
            {/* Access details Card */}
            <div className={`${styles.glassCard} ${styles.accessCard}`}>
              <h3 className={styles.accessTitle}>{isUnlocked ? "Reader Unlocked" : "Preview Mode Active"}</h3>
              <p className={styles.accessBody}>
                {isUnlocked
                  ? "You have complete verified access to all units, videos, tests, and chapter assessments."
                  : "Purchase verified workspace access to unlock all subsequent units, video lessons, topic quizzes, and reference PDFs."}
              </p>

              {!isUnlocked ? (
                <div className={styles.accessActions}>
                  <button
                    type="button"
                    onClick={() => {
                      setPayStep("methods");
                      setShowPayModal(true);
                    }}
                    className="button"
                  >
                    Unlock Note for {priceLabel}
                  </button>
                  <Link href="/browse-notes" className="button secondary small">
                    Return to Catalog
                  </Link>
                  {isSuperadmin && (
                    <button
                      type="button"
                      onClick={handleDeleteNote}
                      className="button secondary small"
                      style={{ borderColor: "#f87171", color: "#f87171", marginTop: "8px" }}
                    >
                      Delete Note (Superadmin)
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.accessActions}>
                  {downloadHref && (
                    <a href={downloadHref} className="button small">
                      Download Reference PDF
                    </a>
                  )}
                  <Link href="/browse-notes" className="button secondary small">
                    Return to Catalog
                  </Link>
                  {isSuperadmin && (
                    <button
                      type="button"
                      onClick={handleDeleteNote}
                      className="button secondary small"
                      style={{ borderColor: "#f87171", color: "#f87171", marginTop: "8px" }}
                    >
                      Delete Note (Superadmin)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Note details metadata Card */}
            <div className={styles.glassCard} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>Workspace Info</h3>
              <div style={{ fontSize: "0.82rem", color: "#cbd5e1", display: "grid", gap: "8px" }}>
                <div><span style={{ color: "#64748b" }}>Subject:</span> {subject || "General"}</div>
                <div><span style={{ color: "#64748b" }}>Department:</span> {department || "Common Core"}</div>
                <div><span style={{ color: "#64748b" }}>Program:</span> {programDomain || "Undergraduate"}</div>
                <div><span style={{ color: "#64748b" }}>Semester:</span> {semester ? `Semester ${semester}` : "N/A"}</div>
                <div><span style={{ color: "#64748b" }}>Created:</span> {createdLabel}</div>
                <div><span style={{ color: "#64748b" }}>Updated:</span> {updatedLabel}</div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Admin Floating Bar for quick note creations */}
      {isSuperadmin && (
        <div className={styles.adminFloatingBar}>
          <span className={styles.adminBarTitle}>Superadmin Controls</span>
          <button
            type="button"
            onClick={() => {
              setAdminTitle("");
              setAdminPrice("99");
              setShowAdminModal(true);
            }}
            className="button small"
            style={{ padding: "4px 10px", fontSize: "0.72rem" }}
          >
            Upload Notes
          </button>
        </div>
      )}

      {/* --- PAYMENT MODAL OVERLAY --- */}
      {showPayModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPayModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalLogoGroup}>
                <svg className={styles.razorpayIcon} viewBox="0 0 512 512" fill="currentColor">
                  <polygon points="448,32 304,32 176,288 320,288" />
                  <polygon points="336,224 192,224 64,480 208,480" />
                </svg>
                <span className={styles.modalLogoText}>Razorpay Sandbox Gateway</span>
              </div>
              <button type="button" onClick={() => setShowPayModal(false)} className={styles.modalCloseBtn}>×</button>
            </div>

            <div className={styles.modalBody}>
              {payStep === "methods" && (
                <>
                  <div className={styles.paymentSummary}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Merchant:</span>
                      <span className={styles.summaryValue}>LerenGO Notes Catalog</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Payee:</span>
                      <span className={styles.summaryValue}>{userName} ({email})</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Product:</span>
                      <span className={styles.summaryValue}>{title}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Total Price:</span>
                      <span className={styles.summaryPrice}>{priceLabel}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: "12px", fontWeight: 650 }}>Select payment method to simulate checkout:</p>
                  
                  <div className={styles.paymentMethods}>
                    <button type="button" onClick={handleSimulateUnlock} className={styles.payMethodBtn}>
                      <span className={styles.methodIcon}>📱</span>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "#ffffff" }}>UPI Verification</div>
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Google Pay / PhonePe simulation</div>
                      </div>
                    </button>
                    <button type="button" onClick={handleSimulateUnlock} className={styles.payMethodBtn}>
                      <span className={styles.methodIcon}>💳</span>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "#ffffff" }}>Credit / Debit Card</div>
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Visa / Mastercard simulation</div>
                      </div>
                    </button>
                    <button type="button" onClick={handleSimulateUnlock} className={styles.payMethodBtn}>
                      <span className={styles.methodIcon}>🏦</span>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "#ffffff" }}>Netbanking Link</div>
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Bank dashboard simulation</div>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {payStep === "processing" && (
                <div className={styles.successPanel} style={{ padding: "30px 0" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid rgba(150, 161, 171, 0.2)",
                    borderTopColor: "#96a1ab",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "16px"
                  }} />
                  <h3 style={{ fontSize: "1rem", color: "#ffffff", fontWeight: 700 }}>Processing Payment Transaction...</h3>
                  <p style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Verifying digital signature with webhook logs</p>
                </div>
              )}

              {payStep === "success" && (
                <div className={styles.successPanel}>
                  <div className={styles.successCircle}>✓</div>
                  <h3 className={styles.successTitle}>Payment Verified</h3>
                  <p className={styles.successBody}>Workspace access successfully unlocked for note ID: {noteId}</p>
                  <button
                    type="button"
                    onClick={handleFinishSimulation}
                    className="button"
                    style={{ width: "100%" }}
                  >
                    Enter Workspace Console
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADMIN ACTIONS MODAL --- */}
      {showAdminModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAdminModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalLogoText}>Upload Verified PDF Notes</span>
              <button type="button" onClick={() => setShowAdminModal(false)} className={styles.modalCloseBtn}>×</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleAdminFormSubmit} className={styles.adminForm}>
                <label className={styles.formLabel}>
                  Note Title
                  <input
                    type="text"
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="e.g., Software Engineering Unit-wise Guide"
                    className={styles.textInput}
                    required
                  />
                </label>

                <label className={styles.formLabel}>
                  Notes Category Price
                  <select
                    value={adminPrice}
                    onChange={(e) => setAdminPrice(e.target.value)}
                    className={styles.textInput}
                  >
                    <option value="99">Paid Notes (₹99)</option>
                    <option value="0">Free Notes (₹0)</option>
                  </select>
                </label>

                <div className={styles.formFooter}>
                  <button type="button" onClick={() => setShowAdminModal(false)} className={styles.btnSecondary} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="button" style={{ flex: 1.5 }}>
                    Create Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
