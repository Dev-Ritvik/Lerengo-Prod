import {
  formatMindMapForTextarea,
  formatShortNotesForTextarea,
  NOTE_UNIT_SLOT_COUNT,
  type StructuredNoteUnit,
} from "@/lib/note-content";
import shared from "../workspace.module.css";
import styles from "./structured-note-unit-fields.module.css";

type Props = {
  units: StructuredNoteUnit[];
};

function getUnitBySlot(units: StructuredNoteUnit[], slot: number) {
  return units[slot - 1] ?? null;
}

export function StructuredNoteUnitFields({ units }: Props) {
  return (
    <div className={styles.unitGrid}>
      {Array.from({ length: NOTE_UNIT_SLOT_COUNT }, (_, index) => {
        const slot = index + 1;
        const unit = getUnitBySlot(units, slot);

        return (
          <section className={styles.unitCard} key={slot}>
            <div className={styles.unitHeader}>
              <span className={styles.unitEyebrow}>Unit {slot}</span>
              <p className={styles.unitHint}>
                Add the detailed notes, quick revision points, mind-map branches, and previous-year
                questions for this unit.
              </p>
            </div>

            <div className={styles.fieldStack}>
              <label className={shared.formFieldFull}>
                <span className={shared.formLabel}>Unit title</span>
                <input
                  className={shared.input}
                  defaultValue={unit?.title ?? ""}
                  name={`unit${slot}Title`}
                  placeholder="Computer System"
                  type="text"
                />
              </label>

              <label className={shared.formFieldFull}>
                <span className={shared.formLabel}>Notes</span>
                <textarea
                  className={`${shared.textarea} ${styles.tallTextarea}`}
                  defaultValue={unit?.notes ?? ""}
                  name={`unit${slot}Notes`}
                  placeholder={"1. Basic structure of the topic\n\nA. Key explanation\n- Important point\n- Another point"}
                />
              </label>

              <label className={shared.formFieldFull}>
                <span className={shared.formLabel}>Revision points</span>
                <textarea
                  className={`${shared.textarea} ${styles.mediumTextarea}`}
                  defaultValue={formatShortNotesForTextarea(unit?.revision ?? [])}
                  name={`unit${slot}Revision`}
                  placeholder={"One revision point per line\nOne more high-yield point"}
                />
              </label>

              <label className={shared.formFieldFull}>
                <span className={shared.formLabel}>Mind map branches</span>
                <textarea
                  className={`${shared.textarea} ${styles.mediumTextarea}`}
                  defaultValue={formatMindMapForTextarea(unit?.mindMap ?? [])}
                  name={`unit${slot}MindMap`}
                  placeholder={"Hardware :: CPU | Memory | Input devices\nArchitecture :: Bus | Control unit | ALU"}
                />
              </label>

              <label className={shared.formFieldFull}>
                <span className={shared.formLabel}>PYQs</span>
                <textarea
                  className={`${shared.textarea} ${styles.mediumTextarea}`}
                  defaultValue={formatShortNotesForTextarea(unit?.pyqs ?? [])}
                  name={`unit${slot}Pyqs`}
                  placeholder={"Explain the Von Neumann architecture.\nDifferentiate SSD and HDD."}
                />
              </label>
            </div>
          </section>
        );
      })}
    </div>
  );
}
