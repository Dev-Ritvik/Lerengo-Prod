"use client";

import { useState, useTransition } from "react";
import { LAB_IDEA_STAGES, LAB_SUPPORT_TRACKS, formatLabValue } from "@/lib/labs";
import styles from "./page.module.css";

type Props = {
  submitAction: (formData: FormData) => Promise<void>;
};

export function LabsSubmitWizard({ submitAction }: Props) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Local state for validation
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("");
  const [summary, setSummary] = useState("");
  const [problem, setProblem] = useState("");

  // Track support needed checkboxes
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  const handleCheckboxChange = (track: string) => {
    setSelectedTracks((prev) =>
      prev.includes(track) ? prev.filter((t) => t !== track) : [...prev, track]
    );
  };

  const isStep1Valid = title.trim() && domain.trim() && summary.trim() && problem.trim();
  const isStep3Valid = selectedTracks.length > 0;

  const nextStep = () => {
    if (step === 1 && !isStep1Valid) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isStep1Valid || !isStep3Valid) return;

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await submitAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Step Indicators */}
      <div className={styles.wizardHeader}>
        <div className={styles.stepIndicatorList}>
          <div className={`${styles.stepIndicator} ${step >= 1 ? styles.stepIndicatorActive : ""}`}>
            <span className={styles.stepNum}>1</span>
            <span className={styles.stepName}>Core Idea</span>
          </div>
          <div className={styles.stepIndicatorLine} />
          <div className={`${styles.stepIndicator} ${step >= 2 ? styles.stepIndicatorActive : ""}`}>
            <span className={styles.stepNum}>2</span>
            <span className={styles.stepName}>Team & Context</span>
          </div>
          <div className={styles.stepIndicatorLine} />
          <div className={`${styles.stepIndicator} ${step >= 3 ? styles.stepIndicatorActive : ""}`}>
            <span className={styles.stepNum}>3</span>
            <span className={styles.stepName}>Support & Goals</span>
          </div>
        </div>
      </div>

      {/* Step 1: Core Idea */}
      <div style={{ display: step === 1 ? "contents" : "none" }}>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Idea title *</span>
            <input
              className={styles.input}
              name="title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AI-powered crop disease detection"
              required
              type="text"
              value={title}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Domain *</span>
            <input
              className={styles.input}
              name="domain"
              onChange={(e) => setDomain(e.target.value)}
              placeholder="AgriTech / Computer Vision"
              required
              type="text"
              value={domain}
            />
          </label>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>Short submission summary *</span>
            <input
              className={styles.input}
              name="submissionSummary"
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One clean paragraph on what the idea does and why it matters."
              required
              type="text"
              value={summary}
            />
          </label>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>Problem statement *</span>
            <textarea
              className={styles.textarea}
              name="problemStatement"
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Describe the problem, current thinking, target users, and why the team believes this is worth building or researching."
              required
              value={problem}
            />
          </label>
        </div>

        <div className={styles.wizardFooter}>
          <button
            className={styles.primaryAction}
            disabled={!isStep1Valid}
            onClick={nextStep}
            type="button"
          >
            Next: Team & Context
          </button>
        </div>
      </div>

      {/* Step 2: Team & Context */}
      <div style={{ display: step === 2 ? "contents" : "none" }}>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Current stage</span>
            <select className={styles.select} defaultValue="idea" name="ideaStage">
              {LAB_IDEA_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {formatLabValue(stage)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Current skills or stack</span>
            <input
              className={styles.input}
              name="skillsSnapshot"
              placeholder="React, ML basics, circuit design, research writing..."
              type="text"
            />
          </label>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>Team context</span>
            <textarea
              className={styles.textareaCompact}
              name="teamContext"
              placeholder="Who is working on it, what each person knows, and what gaps still exist."
            />
          </label>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>Links</span>
            <textarea
              className={styles.textareaCompact}
              name="links"
              placeholder="Prototype link, paper, Figma, GitHub, drive docs, or reference links. One per line."
            />
          </label>
        </div>

        <div className={styles.wizardFooter}>
          <button className={styles.ghostAction} onClick={prevStep} type="button">
            Back
          </button>
          <button className={styles.primaryAction} onClick={nextStep} type="button">
            Next: Support & Goals
          </button>
        </div>
      </div>

      {/* Step 3: Support & Goals */}
      <div style={{ display: step === 3 ? "contents" : "none" }}>
        <fieldset className={styles.trackGroup}>
          <legend className={styles.label}>Support needed (Choose at least one) *</legend>
          <div className={styles.trackGrid}>
            {LAB_SUPPORT_TRACKS.map((track) => (
              <label className={styles.trackOption} key={track}>
                <input
                  checked={selectedTracks.includes(track)}
                  className={styles.checkbox}
                  name="supportTracks"
                  onChange={() => handleCheckboxChange(track)}
                  type="checkbox"
                  value={track}
                />
                <span>{formatLabValue(track)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.preferenceRow}>
          <label className={styles.preference}>
            <input className={styles.checkbox} name="publicationInterest" type="checkbox" value="true" />
            <span>Publication support is part of the goal.</span>
          </label>
          <label className={styles.preference}>
            <input className={styles.checkbox} name="patentInterest" type="checkbox" value="true" />
            <span>Patent guidance is part of the goal.</span>
          </label>
        </div>

        <div className={styles.wizardFooter}>
          <button className={styles.ghostAction} onClick={prevStep} type="button">
            Back
          </button>
          <button
            className={styles.primaryAction}
            disabled={!isStep3Valid || isPending}
            type="submit"
          >
            {isPending ? "Submitting..." : "Submit to ForgeGO review"}
          </button>
        </div>
      </div>
    </form>
  );
}
