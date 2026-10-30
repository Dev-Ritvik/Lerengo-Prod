import type { ReactNode } from "react";
import Link from "next/link";
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_DOMAINS,
  SEMESTER_OPTIONS,
} from "@/lib/academics";
import { normalizeStructuredNoteContent } from "@/lib/note-content";
import { requireVerifiedProfile } from "@/lib/tenant";
import type { Database } from "@/lib/supabase/types";
import { BrowseNotesShell } from "./browse-notes-shell";
import styles from "./page.module.css";

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];
type SubjectMappingRow = Database["public"]["Tables"]["academic_subject_mappings"]["Row"];

type Props = {
  searchParams: Promise<{
    department?: string;
    domain?: string;
    q?: string;
    semester?: string;
  }>;
};

type NoteCard = {
  credits: string;
  href: string;
  id: string;
  title: string;
  units: string;
  version: string;
};

type SubjectSection = {
  cards: NoteCard[];
  key: string;
  label: string;
  semester: number | null;
};

function getFirstName(value: string | null | undefined) {
  if (!value) {
    return "User";
  }

  const firstName = value.trim().split(/\s+/)[0];
  return firstName || "User";
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "U";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function normalizeSemester(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
    return null;
  }

  return parsed;
}

function buildNoteTitle(note: NoteRow) {
  return note.title.trim();
}

function buildNoteCard(note: NoteRow, index: number): NoteCard {
  const content = normalizeStructuredNoteContent(note.content_json, {
    description: note.description,
    semester: note.semester,
    subject: note.subject,
    title: note.title,
    videoUrl: note.video_url,
  });
  const units = `${content.units.length} ${content.units.length === 1 ? "unit" : "units"}`;
  const credits = note.program_domain?.toLowerCase().includes("pharmacy") ? "4 credits" : "3 credits";

  return {
    credits,
    href: `/browse-notes/${note.id}`,
    id: note.id,
    title: buildNoteTitle(note),
    units,
    version: `Version 1.${(index % 4) + 1}`,
  };
}

function buildSubjectKey(subject: string | null | undefined) {
  const normalized = subject?.trim();
  return normalized && normalized.length > 0 ? normalized : "General";
}

function buildOrderedSubjectSections(
  notes: NoteRow[],
  mappings: SubjectMappingRow[],
  selectedDepartment: string,
  selectedDomain: string,
  selectedSemester: number | null,
) {
  const grouped = new Map<string, { cards: NoteCard[]; semester: number | null }>();

  notes.forEach((note, index) => {
    const subjectKey = buildSubjectKey(note.subject);
    const existing = grouped.get(subjectKey) ?? { cards: [], semester: note.semester ?? null };
    existing.cards.push(buildNoteCard(note, index));
    if (existing.semester === null && note.semester) {
      existing.semester = note.semester;
    }
    grouped.set(subjectKey, existing);
  });

  const relevantMappings = mappings.filter((mapping) => {
    if (!mapping.is_active) {
      return false;
    }
    if (selectedDepartment && mapping.department !== selectedDepartment) {
      return false;
    }
    if (selectedDomain && mapping.program_domain !== selectedDomain) {
      return false;
    }
    if (selectedSemester && mapping.semester !== selectedSemester) {
      return false;
    }
    return true;
  });

  const orderedMappingSubjects = Array.from(
    new Set(relevantMappings.map((mapping) => buildSubjectKey(mapping.subject))),
  );

  const groupedEntries = Array.from(grouped.entries()).map(([key, value]) => ({
    cards: value.cards,
    key,
    label: key,
    semester: value.semester,
  }));

  groupedEntries.sort((left, right) => {
    const leftMappedIndex = orderedMappingSubjects.indexOf(left.key);
    const rightMappedIndex = orderedMappingSubjects.indexOf(right.key);

    if (leftMappedIndex !== -1 || rightMappedIndex !== -1) {
      if (leftMappedIndex === -1) {
        return 1;
      }
      if (rightMappedIndex === -1) {
        return -1;
      }
      return leftMappedIndex - rightMappedIndex;
    }

    if ((left.semester ?? 99) !== (right.semester ?? 99)) {
      return (left.semester ?? 99) - (right.semester ?? 99);
    }

    return left.label.localeCompare(right.label);
  });

  return groupedEntries satisfies SubjectSection[];
}

function renderCards(cards: NoteCard[]) {
  return (
    <div className={styles.cardsGrid}>
      {cards.map((card) => (
        <article className={styles.noteCard} key={card.id}>
          <div className={styles.noteCardBody}>
            <h3 className={styles.noteCardTitle}>{card.title}</h3>
            <div className={styles.noteMetaGroup}>
              <span className={styles.noteMetaPill}>{card.units}</span>
              <span className={styles.noteMetaPill}>{card.credits}</span>
            </div>
            <div className={styles.noteMetaGroup}>
              <span className={styles.noteMetaPill}>{card.version}</span>
            </div>
          </div>

          <div className={styles.noteCardFooter}>
            <Link className={styles.noteCardLink} href={card.href}>
              Open Subject
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function renderSection(section: SubjectSection): ReactNode {
  if (!section.cards.length) {
    return null;
  }

  return (
    <section className={styles.subjectSection} key={section.key}>
      <div className={styles.subjectHeading}>
        <span className={styles.subjectMarker} aria-hidden="true" />
        <div className={styles.subjectHeadingCopy}>
          <h2>{section.label}</h2>
          {section.semester ? <p>Semester {section.semester}</p> : null}
        </div>
      </div>
      {renderCards(section.cards)}
    </section>
  );
}

export const dynamic = "force-dynamic";

export default async function BrowseNotesPage({ searchParams }: Props) {
  const params = await searchParams;
  const { authUser, profile, supabase } = await requireVerifiedProfile();

  const selectedDepartment = (params.department ?? "").trim();
  const selectedDomain = (params.domain ?? "").trim();
  const selectedSemester = normalizeSemester(params.semester);
  const searchQuery = (params.q ?? "").trim();
  const normalizedQuery = searchQuery.toLowerCase();

  const [
    { data: university },
    { data: notesData, error: notesError },
    { data: mappingsData, error: mappingsError },
  ] = await Promise.all([
    supabase.from("universities").select("name").eq("id", profile.university_id).maybeSingle(),
    supabase
      .from("notes")
      .select(
        "id, title, subject, description, department, program_domain, semester, price_inr, created_at, university_id, file_path, uploaded_by, updated_at, is_verified, archived_at, content_json, video_url",
      )
      .eq("university_id", profile.university_id)
      .eq("is_verified", true)
      .is("archived_at", null),
    supabase
      .from("academic_subject_mappings")
      .select("id, department, program_domain, semester, subject, is_active, university_id, created_at, updated_at")
      .eq("university_id", profile.university_id)
      .eq("is_active", true),
  ]);

  if (notesError || mappingsError) {
    throw new Error(notesError?.message || mappingsError?.message || "Failed to load browse notes.");
  }

  const allNotes = (notesData ?? []) as NoteRow[];
  const mappings = (mappingsData ?? []) as SubjectMappingRow[];

  const departmentOptions = Array.from(
    new Set(
      [
        selectedDepartment,
        ...DEFAULT_DEPARTMENTS,
        ...mappings.map((mapping) => mapping.department),
        ...allNotes.map((note) => note.department).filter(Boolean),
      ].map((value) => value as string),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const domainOptions = Array.from(
    new Set(
      [
        selectedDomain,
        ...DEFAULT_DOMAINS,
        ...mappings.map((mapping) => mapping.program_domain),
        ...allNotes.map((note) => note.program_domain).filter(Boolean),
      ].map((value) => value as string),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const semesterOptions = Array.from(
    new Set(
      [
        ...SEMESTER_OPTIONS,
        ...mappings.map((mapping) => mapping.semester),
        ...allNotes.map((note) => note.semester).filter(Boolean),
      ].map((value) => Number(value)),
    ),
  )
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12)
    .sort((left, right) => left - right);

  const filteredNotes = allNotes.filter((note) => {
    if (selectedDepartment && note.department !== selectedDepartment) {
      return false;
    }

    if (selectedDomain && note.program_domain !== selectedDomain) {
      return false;
    }

    if (selectedSemester && note.semester !== selectedSemester) {
      return false;
    }

    if (normalizedQuery) {
      const haystack = `${note.title} ${note.subject ?? ""} ${note.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    }

    return true;
  });

  const subjectSections = buildOrderedSubjectSections(
    filteredNotes,
    mappings,
    selectedDepartment,
    selectedDomain,
    selectedSemester,
  );

  const userName = profile.full_name ?? profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "University Name";

  return (
    <div className={styles.viewport}>
      <BrowseNotesShell
        avatarUrl={authUser.avatarUrl ?? null}
        departmentOptions={departmentOptions}
        displayName={displayName}
        domainOptions={domainOptions}
        initialDepartment={selectedDepartment}
        initialDomain={selectedDomain}
        initialQuery={searchQuery}
        initialSemester={selectedSemester?.toString() ?? ""}
        initials={initials}
        key={`${selectedDepartment}|${selectedDomain}|${selectedSemester ?? ""}|${searchQuery}`}
        pageDescription="Filter by department, program, semester, and subject to move directly into verified notes from your campus."
        semesterOptions={semesterOptions}
        showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
        adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
        showMentorLink={profile.mentor_approved}
        universityName={universityName}
      >
        {subjectSections.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>No notes found</h2>
            <p>
              No verified notes match the current filters. Adjust department, program,
              semester, or search terms to widen the result set.
            </p>
            <Link className={styles.emptyStateLink} href="/browse-notes">
              Clear filters
            </Link>
          </section>
        ) : (
          subjectSections.map(renderSection)
        )}
      </BrowseNotesShell>
    </div>
  );
}
