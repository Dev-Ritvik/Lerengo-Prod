import { env } from "@/lib/env";

export function getFreeOfferSemester() {
  const semester = env.NOTES_FREE_OFFER_SEMESTER;
  if (!Number.isInteger(semester) || semester < 1 || semester > 12) {
    return 1;
  }

  return semester;
}

export function isNoteInOfferSemester(semester: number | null | undefined) {
  if (!semester || !Number.isInteger(semester)) {
    return false;
  }

  return semester === getFreeOfferSemester();
}

export function getOfferSemesterLabel() {
  return `Semester ${getFreeOfferSemester()}`;
}

export function canDownloadNote(
  note: { price_inr: number; semester: number | null | undefined },
  hasAccess: boolean,
) {
  if (note.price_inr <= 0) {
    return true;
  }

  if (isNoteInOfferSemester(note.semester)) {
    return true;
  }

  return hasAccess;
}
