export type StructuredNoteTopic = {
  title: string;
  summary: string;
  bullets: string[];
};

export type StructuredNoteMindMapBranch = {
  branch: string;
  items: string[];
};

export type StructuredNoteCategoryKey = "notes" | "revision" | "mind_map" | "pyqs";

export type StructuredNoteUnit = {
  id: string;
  label: string;
  title: string;
  notes: string;
  revision: string[];
  mindMap: StructuredNoteMindMapBranch[];
  pyqs: string[];
};

export type StructuredNoteUnitInput = {
  slot: number;
  title: string;
  notes: string;
  revisionInput: string;
  mindMapInput: string;
  pyqsInput: string;
};

export type StructuredNoteAssessmentQuestionOption = {
  id: string;
  label: string;
};

export type StructuredNoteAssessmentQuestion = {
  id: string;
  options: StructuredNoteAssessmentQuestionOption[];
  prompt: string;
};

export type StructuredNoteAssessmentSummary = {
  durationMinutes: number;
  maxAttempts: number;
  passPercent: number;
  questions: StructuredNoteAssessmentQuestion[];
  summary: string | null;
  title: string;
};

export type StructuredNoteAssessmentInput = {
  durationMinutes: number;
  maxAttempts: number;
  passPercent: number;
  questionsJson: string;
  summary: string;
  title: string;
};

export type StructuredNoteContent = {
  assessment: StructuredNoteAssessmentSummary | null;
  overview: string;
  fullText: string;
  videoUrl: string | null;
  topics: StructuredNoteTopic[];
  shortNotes: string[];
  mindMap: StructuredNoteMindMapBranch[];
  units: StructuredNoteUnit[];
};

type StructuredNoteFallback = {
  description?: string | null;
  subject?: string | null;
  title: string;
  semester?: number | null;
  videoUrl?: string | null;
};

type StructuredNoteBase = Omit<StructuredNoteContent, "units">;

export type StructuredNoteAssessmentBundle = {
  durationMinutes: number;
  maxAttempts: number;
  passPercent: number;
  questions: Array<
    StructuredNoteAssessmentQuestion & {
      correctOptionId: string;
    }
  >;
  summary: string | null;
  title: string;
};

export const NOTE_UNIT_SLOT_COUNT = 6;
export const NOTE_CATEGORY_ORDER = ["notes", "revision", "mind_map", "pyqs"] as const;

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => cleanLine(line))
    .filter(Boolean);
}

function splitParagraphs(value: string) {
  return value
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? cleanLine(item) : ""))
    .filter(Boolean);
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(parsed), min), max);
}

function truncateWords(value: string, limit: number) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= limit) {
    return value;
  }

  return `${words.slice(0, limit).join(" ")}...`;
}

function buildSummaryFromNotes(value: string) {
  const firstParagraph = splitParagraphs(value)[0];
  if (!firstParagraph) {
    return "";
  }

  return truncateWords(firstParagraph, 26);
}

function buildTopicsFromUnits(units: StructuredNoteUnit[]) {
  return units
    .map((unit) => ({
      bullets: unit.revision.slice(0, 3),
      summary: buildSummaryFromNotes(unit.notes) || `Key ideas and guided explanation for ${unit.title}.`,
      title: unit.title,
    }))
    .slice(0, NOTE_UNIT_SLOT_COUNT);
}

function flattenUnitRevision(units: StructuredNoteUnit[]) {
  return units.flatMap((unit) => unit.revision);
}

function flattenUnitMindMap(units: StructuredNoteUnit[]) {
  return units.flatMap((unit) => unit.mindMap);
}

function buildFullTextFromUnits(units: StructuredNoteUnit[]) {
  return units
    .map((unit) => {
      const notesBody = unit.notes.trim();
      if (!notesBody) {
        return `${unit.label}: ${unit.title}`;
      }

      return `${unit.label}: ${unit.title}\n\n${notesBody}`;
    })
    .join("\n\n");
}

function sanitizeStructuredNoteAssessment(
  bundle: StructuredNoteAssessmentBundle | null,
): StructuredNoteAssessmentSummary | null {
  if (!bundle) {
    return null;
  }

  return {
    durationMinutes: bundle.durationMinutes,
    maxAttempts: bundle.maxAttempts,
    passPercent: bundle.passPercent,
    questions: bundle.questions.map((question) => ({
      id: question.id,
      options: question.options,
      prompt: question.prompt,
    })),
    summary: bundle.summary,
    title: bundle.title,
  };
}

function parseStructuredNoteAssessmentQuestions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const prompt = typeof candidate.prompt === "string" ? cleanLine(candidate.prompt) : "";
      const correctOptionId =
        typeof candidate.correctOptionId === "string" ? cleanLine(candidate.correctOptionId) : "";
      const id =
        typeof candidate.id === "string" && cleanLine(candidate.id)
          ? cleanLine(candidate.id)
          : `question-${index + 1}`;

      const options = Array.isArray(candidate.options)
        ? candidate.options
            .map((option, optionIndex) => {
              if (!option || typeof option !== "object" || Array.isArray(option)) {
                return null;
              }

              const optionRecord = option as Record<string, unknown>;
              const label =
                typeof optionRecord.label === "string" ? cleanLine(optionRecord.label) : "";
              const optionId =
                typeof optionRecord.id === "string" && cleanLine(optionRecord.id)
                  ? cleanLine(optionRecord.id)
                  : String.fromCharCode(97 + optionIndex);

              if (!label) {
                return null;
              }

              return {
                id: optionId,
                label,
              };
            })
            .filter(
              (option): option is StructuredNoteAssessmentQuestionOption => Boolean(option),
            )
        : [];

      if (!prompt || options.length < 2 || !correctOptionId) {
        return null;
      }

      if (!options.some((option) => option.id === correctOptionId)) {
        return null;
      }

      return {
        correctOptionId,
        id,
        options,
        prompt,
      };
    })
    .filter(
      (
        question,
      ): question is StructuredNoteAssessmentBundle["questions"][number] => Boolean(question),
    );
}

function parseStructuredNoteAssessmentInput(
  value: StructuredNoteAssessmentInput | undefined,
  noteTitle: string,
) {
  if (!value) {
    return null;
  }

  const questionsJson = value.questionsJson.trim();
  if (!questionsJson) {
    return null;
  }

  let parsedQuestions: unknown;
  try {
    parsedQuestions = JSON.parse(questionsJson);
  } catch {
    return null;
  }

  const questions = parseStructuredNoteAssessmentQuestions(parsedQuestions);
  if (questions.length === 0) {
    return null;
  }

  return {
    durationMinutes: clampInteger(value.durationMinutes, 18, 5, 180),
    maxAttempts: clampInteger(value.maxAttempts, 3, 1, 12),
    passPercent: clampInteger(value.passPercent, 70, 1, 100),
    questions,
    summary: value.summary.trim() || null,
    title: value.title.trim() || `${noteTitle} Test`,
  } satisfies StructuredNoteAssessmentBundle;
}

function distributeItemsEvenly<T>(items: T[], bucketCount: number) {
  if (bucketCount <= 0) {
    return [];
  }

  if (items.length === 0) {
    return Array.from({ length: bucketCount }, () => [] as T[]);
  }

  return Array.from({ length: bucketCount }, (_, index) =>
    items.filter((_, itemIndex) => itemIndex % bucketCount === index),
  );
}

function buildLegacyUnitsFromBase(base: StructuredNoteBase, title: string) {
  const topicSeeds = base.topics.length
    ? base.topics
    : [
        {
          bullets: base.shortNotes.slice(0, 4),
          summary: base.overview,
          title,
        },
      ];

  const paragraphChunks = distributeItemsEvenly(splitParagraphs(base.fullText), topicSeeds.length);
  const revisionChunks = distributeItemsEvenly(base.shortNotes, topicSeeds.length);
  const mindMapChunks = distributeItemsEvenly(base.mindMap, topicSeeds.length);

  const units = topicSeeds
    .map((topic, index) => {
      const notesParts = [
        paragraphChunks[index]?.join("\n\n") ?? "",
        topic.summary,
        topic.bullets.length ? topic.bullets.map((bullet) => `- ${bullet}`).join("\n") : "",
      ].filter(Boolean);

      const revision = revisionChunks[index]?.length ? revisionChunks[index] : topic.bullets;
      const mindMap = mindMapChunks[index]?.length
        ? mindMapChunks[index]
        : revision.length
          ? [
              {
                branch: topic.title,
                items: revision.slice(0, 4),
              },
            ]
          : [];

      if (!topic.title && notesParts.length === 0 && revision.length === 0 && mindMap.length === 0) {
        return null;
      }

      return {
        id: `unit-${index + 1}`,
        label: `Unit ${index + 1}`,
        mindMap,
        notes: notesParts.join("\n\n"),
        pyqs: [] as string[],
        revision,
        title: topic.title || `Unit ${index + 1}`,
      };
    })
    .filter((unit): unit is StructuredNoteUnit => Boolean(unit));

  if (units.length > 0) {
    return units;
  }

  return [
    {
      id: "unit-1",
      label: "Unit 1",
      mindMap: base.mindMap,
      notes: base.fullText,
      pyqs: [] as string[],
      revision: base.shortNotes,
      title,
    },
  ];
}

function buildFallbackContent({
  description,
  subject,
  title,
  semester,
  videoUrl = null,
}: StructuredNoteFallback): StructuredNoteContent {
  const label = subject ?? title;
  const semesterLabel = semester ? `Semester ${semester}` : "your current semester";
  const summary =
    description?.trim() ||
    `${title} is organized into a structured reader with concept flow, unit sections, revision notes, and faster recall blocks for ${semesterLabel}.`;

  const fullText = description?.trim()
    ? `${description.trim()}\n\nThis reader restructures the note into guided explanation, unit-by-unit progression, quick revision points, and exam-facing recall blocks so you can study without opening a PDF first.`
    : `${title} has been converted into a structured reading flow for ${semesterLabel}. Start with the overview, move through each unit in sequence, and then finish with revision notes, mind-map recaps, and previous-year questions for faster retention.`;

  const base: StructuredNoteBase = {
    assessment: null,
    fullText,
    mindMap: [
      {
        branch: label,
        items: ["Core concepts", "Worked examples", "Revision checkpoints"],
      },
      {
        branch: "Exam focus",
        items: ["Repeated questions", "Fast recall prompts", "Topic connections"],
      },
    ],
    overview: summary,
    shortNotes: [
      `Focus on the central idea of ${label} before moving to unit-level detail.`,
      "Use revision notes for fast recall before class tests, viva, or internals.",
      "Map each topic to a practical example or classroom use case.",
      "Revise important terms, definitions, and common exam prompts together.",
    ],
    topics: [
      {
        title: `Foundation of ${label}`,
        summary: "Understand the scope, definitions, and conceptual framing before detailed problem solving.",
        bullets: ["Core definitions", "Typical classroom framing", "Where the topic is applied"],
      },
      {
        title: "Unit-wise explanation",
        summary: "Move through the note in a structured order so each concept builds on the previous one.",
        bullets: ["Unit sequence", "Linked subtopics", "High-yield explanation blocks"],
      },
      {
        title: "Revision and recall",
        summary: "Condense the note into quick prompts you can revisit before tests, vivas, or lab work.",
        bullets: ["Short answer cues", "Common mistakes", "Fast recap branches"],
      },
    ],
    videoUrl,
  };

  return {
    ...base,
    units: buildLegacyUnitsFromBase(base, title),
  };
}

function normalizeStructuredUnits(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((unit, index) => {
      if (!unit || typeof unit !== "object" || Array.isArray(unit)) {
        return null;
      }

      const candidate = unit as Record<string, unknown>;
      const title = typeof candidate.title === "string" ? cleanLine(candidate.title) : "";
      const notes = typeof candidate.notes === "string" ? candidate.notes.trim() : "";
      const revision = asStringArray(candidate.revision);
      const pyqs = asStringArray(candidate.pyqs);
      const label =
        typeof candidate.label === "string" && cleanLine(candidate.label)
          ? cleanLine(candidate.label)
          : `Unit ${index + 1}`;
      const id =
        typeof candidate.id === "string" && cleanLine(candidate.id)
          ? cleanLine(candidate.id)
          : `unit-${index + 1}`;

      const mindMap = Array.isArray(candidate.mindMap)
        ? candidate.mindMap
            .map((branch) => {
              if (!branch || typeof branch !== "object" || Array.isArray(branch)) {
                return null;
              }

              const branchRecord = branch as Record<string, unknown>;
              const branchTitle =
                typeof branchRecord.branch === "string" ? cleanLine(branchRecord.branch) : "";
              if (!branchTitle) {
                return null;
              }

              return {
                branch: branchTitle,
                items: asStringArray(branchRecord.items),
              };
            })
            .filter((branch): branch is StructuredNoteMindMapBranch => Boolean(branch))
        : [];

      if (!title && !notes && revision.length === 0 && mindMap.length === 0 && pyqs.length === 0) {
        return null;
      }

      return {
        id,
        label,
        mindMap,
        notes,
        pyqs,
        revision,
        title: title || label,
      };
    })
    .filter((unit): unit is StructuredNoteUnit => Boolean(unit));
}

export function resolveStructuredNoteAssessmentBundle(
  value: unknown,
  noteTitle: string,
): StructuredNoteAssessmentBundle | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const rawAssessment = candidate.assessment;
  if (!rawAssessment || typeof rawAssessment !== "object" || Array.isArray(rawAssessment)) {
    return null;
  }

  const assessment = rawAssessment as Record<string, unknown>;
  const questions = parseStructuredNoteAssessmentQuestions(
    Array.isArray(assessment.questions)
      ? assessment.questions
      : Array.isArray(assessment.questionsJson)
        ? assessment.questionsJson
        : [],
  );

  if (questions.length === 0) {
    return null;
  }

  return {
    durationMinutes: clampInteger(assessment.durationMinutes, 18, 5, 180),
    maxAttempts: clampInteger(assessment.maxAttempts, 3, 1, 12),
    passPercent: clampInteger(assessment.passPercent, 70, 1, 100),
    questions,
    summary:
      typeof assessment.summary === "string" && cleanLine(assessment.summary)
        ? assessment.summary.trim()
        : null,
    title:
      typeof assessment.title === "string" && cleanLine(assessment.title)
        ? assessment.title.trim()
        : `${noteTitle} Test`,
  };
}

export function formatStructuredNoteAssessmentQuestionsForTextarea(
  bundle: StructuredNoteAssessmentBundle | null,
) {
  return JSON.stringify(bundle?.questions ?? [], null, 2);
}

function buildStructuredUnitsFromInputs(unitInputs: StructuredNoteUnitInput[]) {
  return unitInputs
    .map((unitInput) => {
      const label = `Unit ${unitInput.slot}`;
      const title = cleanLine(unitInput.title);
      const notes = unitInput.notes.trim();
      const revision = parseShortNotesInput(unitInput.revisionInput);
      const mindMap = parseMindMapInput(unitInput.mindMapInput);
      const pyqs = parseShortNotesInput(unitInput.pyqsInput);

      if (!title && !notes && revision.length === 0 && mindMap.length === 0 && pyqs.length === 0) {
        return null;
      }

      return {
        id: `unit-${unitInput.slot}`,
        label,
        mindMap,
        notes,
        pyqs,
        revision,
        title: title || label,
      };
    })
    .filter((unit): unit is StructuredNoteUnit => Boolean(unit));
}

export function parseShortNotesInput(value: string) {
  return splitLines(value);
}

export function parseTopicsInput(value: string): StructuredNoteTopic[] {
  return splitLines(value)
    .map((line) => {
      const [title, summary = "", bulletsRaw = ""] = line
        .split("::")
        .map((part) => cleanLine(part));

      const bullets = bulletsRaw
        .split("|")
        .map((bullet) => cleanLine(bullet))
        .filter(Boolean);

      if (!title) {
        return null;
      }

      return {
        bullets,
        summary,
        title,
      };
    })
    .filter((topic): topic is StructuredNoteTopic => Boolean(topic));
}

export function parseMindMapInput(value: string): StructuredNoteMindMapBranch[] {
  return splitLines(value)
    .map((line) => {
      const [branch, itemsRaw = ""] = line.split("::").map((part) => cleanLine(part));
      const items = itemsRaw
        .split("|")
        .map((item) => cleanLine(item))
        .filter(Boolean);

      if (!branch) {
        return null;
      }

      return {
        branch,
        items,
      };
    })
    .filter((branch): branch is StructuredNoteMindMapBranch => Boolean(branch));
}

export function formatTopicsForTextarea(topics: StructuredNoteTopic[]) {
  return topics
    .map((topic) => `${topic.title} :: ${topic.summary} :: ${topic.bullets.join(" | ")}`.trim())
    .join("\n");
}

export function formatShortNotesForTextarea(shortNotes: string[]) {
  return shortNotes.join("\n");
}

export function formatMindMapForTextarea(mindMap: StructuredNoteMindMapBranch[]) {
  return mindMap.map((branch) => `${branch.branch} :: ${branch.items.join(" | ")}`.trim()).join("\n");
}

export function normalizeStructuredNoteContent(
  value: unknown,
  fallback: StructuredNoteFallback,
): StructuredNoteContent {
  const defaultContent = buildFallbackContent(fallback);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultContent;
  }

  const candidate = value as Record<string, unknown>;
  const topics = Array.isArray(candidate.topics)
    ? candidate.topics
        .map((topic) => {
          if (!topic || typeof topic !== "object" || Array.isArray(topic)) {
            return null;
          }

          const topicRecord = topic as Record<string, unknown>;
          const title = typeof topicRecord.title === "string" ? cleanLine(topicRecord.title) : "";
          if (!title) {
            return null;
          }

          return {
            bullets: asStringArray(topicRecord.bullets),
            summary: typeof topicRecord.summary === "string" ? cleanLine(topicRecord.summary) : "",
            title,
          };
        })
        .filter((topic): topic is StructuredNoteTopic => Boolean(topic))
    : [];

  const mindMap = Array.isArray(candidate.mindMap)
    ? candidate.mindMap
        .map((branch) => {
          if (!branch || typeof branch !== "object" || Array.isArray(branch)) {
            return null;
          }

          const branchRecord = branch as Record<string, unknown>;
          const branchTitle =
            typeof branchRecord.branch === "string" ? cleanLine(branchRecord.branch) : "";
          if (!branchTitle) {
            return null;
          }

          return {
            branch: branchTitle,
            items: asStringArray(branchRecord.items),
          };
        })
        .filter((branch): branch is StructuredNoteMindMapBranch => Boolean(branch))
    : [];

  const videoUrl =
    typeof candidate.videoUrl === "string" && cleanLine(candidate.videoUrl)
      ? candidate.videoUrl.trim()
      : defaultContent.videoUrl;
  const assessment = sanitizeStructuredNoteAssessment(
    resolveStructuredNoteAssessmentBundle(candidate, fallback.title),
  );

  const units = normalizeStructuredUnits(candidate.units);

  const resolvedUnits = units.length
    ? units
    : buildLegacyUnitsFromBase(
        {
          assessment,
          fullText:
            typeof candidate.fullText === "string" && cleanLine(candidate.fullText)
              ? candidate.fullText.trim()
              : defaultContent.fullText,
          mindMap: mindMap.length ? mindMap : defaultContent.mindMap,
          overview:
            typeof candidate.overview === "string" && cleanLine(candidate.overview)
              ? candidate.overview.trim()
              : defaultContent.overview,
          shortNotes: asStringArray(candidate.shortNotes).length
            ? asStringArray(candidate.shortNotes)
            : defaultContent.shortNotes,
          topics: topics.length ? topics : defaultContent.topics,
          videoUrl,
        },
        fallback.title,
      );

  return {
    assessment,
    fullText:
      typeof candidate.fullText === "string" && cleanLine(candidate.fullText)
        ? candidate.fullText.trim()
        : units.length
          ? buildFullTextFromUnits(resolvedUnits)
          : defaultContent.fullText,
    mindMap: mindMap.length ? mindMap : units.length ? flattenUnitMindMap(resolvedUnits) : defaultContent.mindMap,
    overview:
      typeof candidate.overview === "string" && cleanLine(candidate.overview)
        ? candidate.overview.trim()
        : defaultContent.overview,
    shortNotes: asStringArray(candidate.shortNotes).length
      ? asStringArray(candidate.shortNotes)
      : units.length
        ? flattenUnitRevision(resolvedUnits)
        : defaultContent.shortNotes,
    topics: topics.length ? topics : units.length ? buildTopicsFromUnits(resolvedUnits) : defaultContent.topics,
    units: resolvedUnits.length ? resolvedUnits : defaultContent.units,
    videoUrl,
  };
}

export function buildStructuredNoteContentFromInputs(
  {
    assessmentInput,
    overview,
    unitInputs,
    videoUrl,
  }: {
    assessmentInput?: StructuredNoteAssessmentInput;
    overview: string;
    unitInputs: StructuredNoteUnitInput[];
    videoUrl: string;
  },
  fallback: StructuredNoteFallback,
) {
  const units = buildStructuredUnitsFromInputs(unitInputs);
  const assessment = parseStructuredNoteAssessmentInput(assessmentInput, fallback.title);

  return {
    assessment: assessment
      ? {
          durationMinutes: assessment.durationMinutes,
          maxAttempts: assessment.maxAttempts,
          passPercent: assessment.passPercent,
          questions: assessment.questions,
          summary: assessment.summary,
          title: assessment.title,
        }
      : null,
    fullText: buildFullTextFromUnits(units),
    mindMap: flattenUnitMindMap(units),
    overview: overview.trim(),
    shortNotes: flattenUnitRevision(units),
    topics: buildTopicsFromUnits(units),
    units,
    videoUrl: cleanLine(videoUrl),
  };
}

export function buildPreviewStructuredNoteContent(content: StructuredNoteContent) {
  return {
    ...content,
    fullText: truncateWords(content.fullText, 120),
    mindMap: content.mindMap.slice(0, 2).map((branch) => ({
      ...branch,
      items: branch.items.slice(0, 4),
    })),
    shortNotes: content.shortNotes.slice(0, 4),
    topics: content.topics.slice(0, 2).map((topic) => ({
      ...topic,
      bullets: topic.bullets.slice(0, 3),
    })),
    units: content.units.slice(0, 2).map((unit) => ({
      ...unit,
      mindMap: unit.mindMap.slice(0, 2).map((branch) => ({
        ...branch,
        items: branch.items.slice(0, 4),
      })),
      notes: truncateWords(unit.notes, 120),
      pyqs: unit.pyqs.slice(0, 2),
      revision: unit.revision.slice(0, 4),
    })),
  };
}

export function getVideoEmbedUrl(value: string | null | undefined) {
  const urlValue = typeof value === "string" ? value.trim() : "";
  if (!urlValue) {
    return null;
  }

  try {
    const url = new URL(urlValue);

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.hostname.includes("loom.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const videoId = parts.at(-1);
      return videoId ? `https://www.loom.com/embed/${videoId}` : null;
    }

    if (url.hostname.includes("vimeo.com")) {
      const videoId = url.pathname.split("/").filter(Boolean).at(-1);
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}
