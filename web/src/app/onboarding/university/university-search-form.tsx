"use client";

import { useMemo, useState } from "react";
import authStyles from "../../(auth)/auth-flow.module.css";
import styles from "./university.module.css";

type UniversityOption = {
  id: string;
  name: string;
};

type Props = {
  action?: (formData: FormData) => void | Promise<void>;
  disabled: boolean;
  universities: UniversityOption[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function UniversitySearchForm({ action, disabled, universities }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UniversityOption | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const normalizedQuery = normalize(query);

  const filteredUniversities = useMemo(() => {
    if (!normalizedQuery) {
      return universities.slice(0, 8);
    }

    return universities
      .filter((university) =>
        normalize(university.name).includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [normalizedQuery, universities]);

  const showResults = !disabled && isFocused;
  const canSubmit = !disabled && Boolean(selected);

  function handleQueryChange(nextValue: string) {
    setQuery(nextValue);
    if (selected && normalize(nextValue) !== normalize(selected.name)) {
      setSelected(null);
    }
  }

  function handleSelect(university: UniversityOption) {
    setSelected(university);
    setQuery(university.name);
    setIsFocused(false);
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        if (!canSubmit) {
          event.preventDefault();
        }
      }}
      {...(!disabled && action ? { action } : {})}
    >
      <label className={styles.label} htmlFor="universitySearch">
        University
      </label>

      <div className={styles.searchWrap}>
        <input
          autoComplete="off"
          className={styles.searchInput}
          disabled={disabled}
          id="universitySearch"
          name="universitySearch"
          onBlur={() => {
            window.setTimeout(() => setIsFocused(false), 120);
          }}
          onChange={(event) => handleQueryChange(event.currentTarget.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search your campus"
          spellCheck={false}
          type="text"
          value={query}
        />
        <input name="universityId" type="hidden" value={selected?.id ?? ""} />
      </div>

      {showResults ? (
        <ul className={styles.resultsList} role="listbox" aria-label="Campus search results">
          {filteredUniversities.length ? (
            filteredUniversities.map((university) => {
              const isSelected = selected?.id === university.id;
              return (
                <li key={university.id}>
                  <button
                    className={`${styles.resultItem} ${isSelected ? styles.resultItemActive : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(university)}
                    type="button"
                  >
                    {university.name}
                  </button>
                </li>
              );
            })
          ) : (
            <li className={styles.emptyState}>No campus matched your search.</li>
          )}
        </ul>
      ) : null}

      {selected ? (
        <p className={styles.selectedPill}>Selected: {selected.name}</p>
      ) : (
        <p className={styles.searchHint}>Search and select one campus from the list below.</p>
      )}

      <button
        className={`${authStyles.primaryBtn} ${styles.cta}`}
        disabled={!canSubmit}
        type="submit"
      >
        Continue
      </button>
    </form>
  );
}
