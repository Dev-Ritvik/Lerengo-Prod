"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import styles from "./page.module.css";

interface SearchInputProps {
  defaultValue: string;
}

export function SearchInput({ defaultValue }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className={styles.searchContainer}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isPending ? "#96a1ab" : "rgba(245, 243, 240, 0.4)"} strokeWidth="2" className={styles.searchIcon}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        placeholder={isFocused ? "Search mentors, skills or domains..." : "Search mentors or skills..."}
        className={styles.searchInput}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => {
          setValue(e.target.value);
          handleSearch(e.target.value);
        }}
      />
    </div>
  );
}
