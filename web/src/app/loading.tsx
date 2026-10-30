"use client";

import { useEffect, useState } from "react";

const LOADING_MESSAGES = [
  "Sip your coffee...",
  "Cooking up your request...",
  "Aligning stars and pixels...",
  "Preparing your proof of work...",
  "Connecting to the campus network...",
  "Securing the vault...",
  "Brewing fresh insights...",
  "Polishing the workspace...",
  "Fetching course curriculum..."
];

export default function GlobalLoading() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
    const timer = setTimeout(() => {
      setMessage(LOADING_MESSAGES[randomIndex]);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loadingViewport" role="status" aria-live="polite" aria-label="Loading">
      <div className="loadingContainer">
        <div className="loadingSpinner" />
        <p className="loadingText">{message}</p>
      </div>
    </div>
  );
}
