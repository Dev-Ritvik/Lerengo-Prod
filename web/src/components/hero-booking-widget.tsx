"use client";

import React, { useState, useEffect } from "react";
import gsap from "gsap";
import styles from "./hero-booking-widget.module.css";

export function HeroBookingWidget() {
  const [role, setRole] = useState<"student" | "mentor">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("Computer Science");
  const [submitted, setSubmitted] = useState(false);
  const [activeSlot] = useState("4:00 PM - 5:00 PM (Tomorrow)");

  // Live count tick animation
  const [liveCount, setLiveCount] = useState(15340);
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    // GSAP success entry animation
    setSubmitted(true);
    setTimeout(() => {
      gsap.fromTo(
        `.${styles.successContent}`,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
    }, 50);
  };

  return (
    <div className={styles.widgetCard}>
      <div className={styles.pulseBar}>
        <span className={styles.pulseDot}></span>
        <span className={styles.pulseText}>{liveCount.toLocaleString()} Builders Active Now</span>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.widgetHeader}>
            <h3 className={styles.widgetTitle}>Schedule an Expert Consult</h3>
            <p className={styles.widgetSubtitle}>Get personalized project feedback from verified industry experts & academic researchers</p>
          </div>

          <div className={styles.roleToggle}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${role === "student" ? styles.activeToggle : ""}`}
              onClick={() => setRole("student")}
            >
              Join as Builder
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${role === "mentor" ? styles.activeToggle : ""}`}
              onClick={() => setRole("mentor")}
            >
              Join as Partner
            </button>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Your Name</label>
            <input
              type="text"
              required
              className={styles.input}
              placeholder="e.g. Siddharth Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              required
              className={styles.input}
              placeholder="e.g. builder@lerengo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Primary Field of Interest</label>
            <select
              className={styles.select}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            >
              <option value="Computer Science">Computer Science & Engineering</option>
              <option value="Data Science">Data Science & AI</option>
              <option value="Product Design">Product & UI/UX Design</option>
              <option value="Finance">Business & Quantitative Finance</option>
            </select>
          </div>

          <button type="submit" className={styles.submitBtn}>
            Book Free Session
          </button>

          <span className={styles.secureBadge}>✓ Verified Institutional Partner Network</span>
        </form>
      ) : (
        <div className={styles.successContent}>
          <div className={styles.successIconWrapper}>
            <svg className={styles.successIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className={styles.successTitle}>Session Booked!</h3>
          <p className={styles.successBody}>
            Hi <strong>{name}</strong>, we've reserved your slot for <strong>{domain}</strong> mentorship.
          </p>

          <div className={styles.ticketCard}>
            <div className={styles.ticketRow}>
              <span className={styles.ticketLabel}>Assigned Time</span>
              <span className={styles.ticketValue}>{activeSlot}</span>
            </div>
            <div className={styles.ticketRow}>
              <span className={styles.ticketLabel}>Status</span>
              <span className={`${styles.ticketValue} ${styles.greenText}`}>● Confirmed</span>
            </div>
            <div className={styles.ticketRow}>
              <span className={styles.ticketLabel}>Access Link</span>
              <span className={styles.ticketValue}>Sent to {email}</span>
            </div>
          </div>

          <button onClick={() => setSubmitted(false)} className={styles.resetBtn}>
            Book Another Slot
          </button>
        </div>
      )}
    </div>
  );
}
