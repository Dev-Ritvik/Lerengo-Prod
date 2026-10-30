"use client";

import { useMemo, useState } from "react";
import authStyles from "../../(auth)/auth-flow.module.css";
import styles from "./campus-profile.module.css";

type UniversityOption = {
  id: string;
  name: string;
  domain: string | null;
};

type CampusProfileInitialValues = {
  campusName: string;
  completionDate: string;
  department: string;
  programDomain: string;
  universityId: string;
};

type Props = {
  action?: (formData: FormData) => void | Promise<void>;
  disabled: boolean;
  initialValues: CampusProfileInitialValues;
  universities: UniversityOption[];
};

const COMMON_DEPARTMENTS = [
  "Computer Science Engineering",
  "Information Technology",
  "Electronics and Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Management Studies",
  "Commerce",
];

const COMMON_DOMAINS = [
  "B.Tech",
  "BCA",
  "MCA",
  "BBA",
  "MBA",
  "B.Com",
  "M.Tech",
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getUniversityPreset(universityName: string | null) {
  const normalizedName = normalize(universityName ?? "");

  if (normalizedName.includes("lovely professional")) {
    return {
      departments: [
        "Computer Science Engineering",
        "Information Technology",
        "Electronics and Communication",
        "Mechanical Engineering",
        "Civil Engineering",
        "Business Administration",
        "Design",
      ],
      domains: ["B.Tech", "M.Tech", "BCA", "MCA", "BBA", "MBA", "B.Des"],
    };
  }

  if (normalizedName.includes("chandigarh")) {
    return {
      departments: [
        "Computer Science Engineering",
        "Artificial Intelligence & Data Science",
        "Information Technology",
        "Electronics and Communication",
        "Mechanical Engineering",
        "Management",
        "Law",
      ],
      domains: ["B.Tech", "M.Tech", "BCA", "MCA", "BBA", "MBA", "LLB"],
    };
  }

  return {
    departments: COMMON_DEPARTMENTS,
    domains: COMMON_DOMAINS,
  };
}

export function CampusProfileForm({
  action,
  disabled,
  initialValues,
  universities,
}: Props) {
  const [query, setQuery] = useState(initialValues.campusName);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedUniversityId, setSelectedUniversityId] = useState(initialValues.universityId);
  const [completionDate, setCompletionDate] = useState(initialValues.completionDate);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"months" | "years" | "decades">("months");
  const [navYear, setNavYear] = useState(() => {
    if (initialValues.completionDate) {
      return parseInt(initialValues.completionDate.split("-")[0], 10);
    }
    return new Date().getFullYear();
  });
  const [navDecade, setNavDecade] = useState(() => {
    const year = initialValues.completionDate
      ? parseInt(initialValues.completionDate.split("-")[0], 10)
      : new Date().getFullYear();
    return Math.floor(year / 10) * 10;
  });

  const displayValue = useMemo(() => {
    if (!completionDate) return "";
    const [yearStr, monthStr] = completionDate.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (isNaN(year) || isNaN(month)) return "";
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [completionDate]);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const headerTitle = useMemo(() => {
    if (viewMode === "months") return String(navYear);
    if (viewMode === "years") return `${navDecade} - ${navDecade + 11}`;
    const start = navDecade - 40;
    return `${start} - ${start + 110}`;
  }, [viewMode, navYear, navDecade]);

  const handlePrev = () => {
    if (viewMode === "months") {
      setNavYear((prev) => prev - 1);
    } else if (viewMode === "years") {
      setNavDecade((prev) => prev - 10);
    } else {
      setNavDecade((prev) => prev - 100);
    }
  };

  const handleNext = () => {
    if (viewMode === "months") {
      setNavYear((prev) => prev + 1);
    } else if (viewMode === "years") {
      setNavDecade((prev) => prev + 10);
    } else {
      setNavDecade((prev) => prev + 100);
    }
  };

  const handleTitleClick = () => {
    if (viewMode === "months") {
      setNavDecade(Math.floor(navYear / 10) * 10);
      setViewMode("years");
    } else if (viewMode === "years") {
      setViewMode("decades");
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    const formatted = `${navYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setCompletionDate(formatted);
    setIsOpen(false);
  };

  const handleYearSelect = (year: number) => {
    setNavYear(year);
    setViewMode("months");
  };

  const handleDecadeSelect = (decadeStart: number) => {
    setNavDecade(decadeStart);
    setViewMode("years");
  };

  const decades = useMemo(() => {
    const start = navDecade - 40;
    return Array.from({ length: 12 }, (_, idx) => start + idx * 10);
  }, [navDecade]);

  const years = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => navDecade + idx);
  }, [navDecade]);
  const [department, setDepartment] = useState(initialValues.department);
  const [programDomain, setProgramDomain] = useState(initialValues.programDomain);

  const selectedUniversity = useMemo(
    () => universities.find((university) => university.id === selectedUniversityId) ?? null,
    [selectedUniversityId, universities],
  );

  const filteredUniversities = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return universities.slice(0, 8);
    }

    return universities
      .filter((university) => normalize(university.name).includes(normalizedQuery))
      .slice(0, 8);
  }, [query, universities]);

  const universityPreset = useMemo(
    () => getUniversityPreset(selectedUniversity?.name ?? null),
    [selectedUniversity?.name],
  );

  const safeDepartment = universityPreset.departments.includes(department)
    ? department
    : "";
  const safeProgramDomain = universityPreset.domains.includes(programDomain)
    ? programDomain
    : "";

  const canSubmit =
    !disabled &&
    Boolean(selectedUniversityId) &&
    Boolean(completionDate) &&
    Boolean(safeDepartment) &&
    Boolean(safeProgramDomain);

  function handleQueryChange(nextValue: string) {
    setQuery(nextValue);

    const exactMatch = universities.find(
      (university) => normalize(university.name) === normalize(nextValue),
    );

    if (exactMatch) {
      setSelectedUniversityId(exactMatch.id);
      return;
    }

    if (selectedUniversity && normalize(selectedUniversity.name) !== normalize(nextValue)) {
      setSelectedUniversityId("");
    }
  }

  function handleUniversitySelect(university: UniversityOption) {
    setSelectedUniversityId(university.id);
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
      <label className={styles.label} htmlFor="campusNameSearch">
        Campus name
      </label>
      <div className={styles.searchWrap}>
        <input
          autoComplete="off"
          className={styles.searchInput}
          disabled={disabled}
          id="campusNameSearch"
          name="campusName"
          onBlur={() => {
            window.setTimeout(() => setIsFocused(false), 120);
          }}
          onChange={(event) => handleQueryChange(event.currentTarget.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search official campus name"
          spellCheck={false}
          type="text"
          value={query}
        />
        <input name="universityId" type="hidden" value={selectedUniversityId} />
      </div>

      {isFocused && !disabled ? (
        <ul className={styles.resultsList} role="listbox" aria-label="Campus search results">
          {filteredUniversities.length ? (
            filteredUniversities.map((university) => {
              const isSelected = selectedUniversityId === university.id;
              return (
                <li key={university.id}>
                  <button
                    className={`${styles.resultItem} ${isSelected ? styles.resultItemActive : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleUniversitySelect(university)}
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

      {selectedUniversity ? (
        <p className={styles.selectedPill}>
          Selected: {selectedUniversity.name}
          {selectedUniversity.domain ? ` (${selectedUniversity.domain})` : ""}
        </p>
      ) : (
        <p className={styles.hint}>Search and choose the exact campus from the results below.</p>
      )}

      <label className={styles.label} htmlFor="completionDate">
        When your degree will complete
      </label>
      <div className="datePickerContainer">
        <div 
          className={styles.input}
          style={{ 
            cursor: disabled ? "not-allowed" : "pointer", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            opacity: disabled ? 0.65 : 1
          }}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span>{displayValue || "Select month and year"}</span>
          <span style={{ opacity: 0.6 }}>📅</span>
        </div>
        <input name="completionDate" type="hidden" value={completionDate} />

        {isOpen && !disabled && (
          <>
            <div 
              style={{ position: "fixed", inset: 0, zIndex: 40, cursor: "default" }} 
              onClick={() => setIsOpen(false)} 
            />
            <div className="datePickerPopup" style={{ zIndex: 50 }}>
              <div className="datePickerHeader">
                <button 
                  className="datePickerNavBtn" 
                  onClick={handlePrev}
                  type="button"
                >
                  &larr;
                </button>
                <button 
                  className="datePickerTitle" 
                  onClick={handleTitleClick}
                  type="button"
                >
                  {headerTitle}
                </button>
                <button 
                  className="datePickerNavBtn" 
                  onClick={handleNext}
                  type="button"
                >
                  &rarr;
                </button>
              </div>

              {viewMode === "months" && (
                <div className="datePickerGrid">
                  {months.map((m, idx) => {
                    const currentMonthVal = `${navYear}-${String(idx + 1).padStart(2, "0")}`;
                    const isActive = completionDate === currentMonthVal;
                    return (
                      <button
                        key={m}
                        className={`datePickerCell ${isActive ? "datePickerCellActive" : ""}`}
                        onClick={() => handleMonthSelect(idx)}
                        type="button"
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              )}

              {viewMode === "years" && (
                <div className="datePickerGrid4">
                  {years.map((y) => {
                    const isActive = navYear === y;
                    return (
                      <button
                        key={y}
                        className={`datePickerCell ${isActive ? "datePickerCellActive" : ""}`}
                        onClick={() => handleYearSelect(y)}
                        type="button"
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              )}

              {viewMode === "decades" && (
                <div className="datePickerGrid">
                  {decades.map((d) => {
                    const isActive = navDecade === d;
                    return (
                      <button
                        key={d}
                        className={`datePickerCell ${isActive ? "datePickerCellActive" : ""}`}
                        onClick={() => handleDecadeSelect(d)}
                        type="button"
                        style={{ fontSize: "0.78rem" }}
                      >
                        {d}s
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="datePickerFooter">
                <button
                  className="datePickerFooterBtn"
                  onClick={() => {
                    setCompletionDate("");
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  Clear
                </button>
                <button
                  className="datePickerFooterBtn"
                  onClick={() => {
                    const today = new Date();
                    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
                    setCompletionDate(formatted);
                    setNavYear(today.getFullYear());
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  This month
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <p className={styles.hint}>Choose the month your current degree is expected to end.</p>

      <label className={styles.label} htmlFor="department">
        Department
      </label>
      <div className={styles.selectWrap}>
        <select
          className={styles.select}
          disabled={disabled || !selectedUniversityId}
          id="department"
          name="department"
          onChange={(event) => setDepartment(event.currentTarget.value)}
          value={safeDepartment}
        >
          <option value="">Select department</option>
          {universityPreset.departments.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <p className={styles.hint}>Departments are filtered by the campus you selected.</p>

      <label className={styles.label} htmlFor="programDomain">
        Domain
      </label>
      <div className={styles.selectWrap}>
        <select
          className={styles.select}
          disabled={disabled || !selectedUniversityId}
          id="programDomain"
          name="programDomain"
          onChange={(event) => setProgramDomain(event.currentTarget.value)}
          value={safeProgramDomain}
        >
          <option value="">Select domain</option>
          {universityPreset.domains.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <p className={styles.hint}>Choose the program you are enrolled in for this campus.</p>

      <button
        className={`${authStyles.primaryBtn} ${authStyles.centerButton}`}
        disabled={!canSubmit}
        type="submit"
      >
        Save and continue
      </button>
    </form>
  );
}
