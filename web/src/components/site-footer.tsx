"use client";

import Link from "next/link";

export function SiteFooter() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="site-footer" aria-label="Footer navigation">
      {/* Visual background elements */}
      <div className="site-footer-glow" />
      
      <div className="site-footer-container">
        {/* Main Content Grid */}
        <div className="site-footer-grid">
          {/* Brand Column */}
          <div className="site-footer-column brand-column">
            <Link href="/" className="site-footer-brand" style={{ display: "inline-block", padding: 0 }}>
              <img
                src="/logo.lerengo.embedded.svg"
                alt="LerenGO logo"
                style={{ height: "32px", width: "auto", display: "block" }}
              />
            </Link>
            <p className="site-footer-description">
              The unified workspace for students to master practical skills, build portfolios, and collaborate with peers and mentors.
            </p>
            <div className="site-footer-status">
              <span className="status-pulse-dot"></span>
              <span className="status-text">All systems operational</span>
            </div>
            <div className="site-footer-socials">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
              <a href="https://lerengo.com" target="_blank" rel="noopener noreferrer" aria-label="Website">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Learn */}
          <div className="site-footer-column">
            <h3 className="column-title">Learn</h3>
            <ul className="column-links">
              <li>
                <Link href="/courses">Courses</Link>
              </li>
              <li>
                <Link href="/dashboard">Modules</Link>
              </li>
              <li>
                <Link href="/certificates">Certificates</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform */}
          <div className="site-footer-column">
            <h3 className="column-title">Platform</h3>
            <ul className="column-links">
              <li>
                <Link href="/campus-network">Campus Network</Link>
              </li>
              <li>
                <Link href="/labs">Virtual Labs</Link>
              </li>
              <li>
                <Link href="/mentor-studio">Mentor Studio</Link>
              </li>
              <li>
                <Link href="/browse-notes">Browse Notes</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div className="site-footer-column">
            <h3 className="column-title">Company</h3>
            <ul className="column-links">
              <li>
                <Link href="/about">About Us</Link>
              </li>
              <li>
                <Link href="/contact">Contact Support</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Separator line */}
        <div className="site-footer-divider" />

        {/* Bottom Bar */}
        <div className="site-footer-bottom">
          <div className="bottom-meta">
            <p className="copyright">
              &copy; {new Date().getFullYear()} LerenGO. All rights reserved.
            </p>
            <div className="bottom-links">
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/refund-policy">Refund Policy</Link>
              <Link href="/shipping-policy">Shipping &amp; Delivery Policy</Link>
            </div>
          </div>

          <button 
            onClick={scrollToTop} 
            className="scroll-top-btn" 
            aria-label="Scroll to top"
          >
            <span>Back to top</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
