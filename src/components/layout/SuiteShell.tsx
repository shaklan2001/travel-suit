"use client";

import { useCallback, useEffect, useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProcess, PROCESSES } from "../../data/book";
import { DEMO_BOOK_NOTE, OPERATOR } from "../../lib/suite-config";
import { CommandPalette } from "./CommandPalette";
import { SuiteNavLink } from "./SuiteNavLink";

const NAV_GROUPS = ["Book", "Care"] as const;
const LOGO_SRC = "https://vibrium-artifacts.s3.ap-south-1.amazonaws.com/site-artifacts/Vibrium-Logo.png";
const COLLAPSE_KEY = "vts.sidebar.collapsed";
const DESKTOP_QUERY = "(min-width: 981px)";
const SECTION_LABELS: Record<string, string> = { squad: "Agentic Squad", map: "Process Map" };

function Glyph({ children, className = "nav-icon" }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function NavGlyph({ id }: { id: string }) {
  if (id === "home") {
    return <Glyph><path d="m4 10.5 8-6.5 8 6.5" /><path d="M6 10v9h12v-9" /></Glyph>;
  }
  if (id === "corporate") {
    return <Glyph><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Glyph>;
  }
  if (id === "forex") {
    return <Glyph><circle cx="12" cy="12" r="8" /><path d="M12 8v8" /><path d="M9.5 10.2c.6-.9 4.6-1.1 4.6.8 0 1.6-4.2 1.2-4.2 2.8 0 1.2 4 .9 4.6-.2" /></Glyph>;
  }
  if (id === "airlines") {
    return <Glyph><path d="M2 16 22 8" /><path d="m9 13-2 7 3-2 3 4 2-1-2-5 6-3" /></Glyph>;
  }
  if (id === "hotels") {
    return <Glyph><path d="M4 20V6l8-3 8 3v14" /><path d="M9 20v-6h6v6" /></Glyph>;
  }
  if (id === "prebook") {
    return <Glyph><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></Glyph>;
  }
  if (id === "during") {
    return <Glyph><path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.2 2 2 0 0 1 4.1 1h2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.1 8.5a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" /></Glyph>;
  }
  if (id === "post") {
    return <Glyph><circle cx="12" cy="12" r="8" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></Glyph>;
  }
  return <Glyph><circle cx="6" cy="17" r="2" /><circle cx="18" cy="17" r="2" /><path d="M8 17h8M6 17 8 8h9l2 6" /></Glyph>;
}

/** Suite › Group › Process › Section, derived from the route. */
function useBreadcrumbs(pathname: string) {
  const [processId, section] = pathname.split("/").filter(Boolean);
  const processModule = processId && processId !== "home" ? getProcess(processId) : null;
  const crumbs: { label: string; href?: string }[] = [{ label: "Travel Suite", href: "/home" }];

  if (!processModule) {
    crumbs.push({ label: "Command Center" });
    return crumbs;
  }
  crumbs.push({ label: processModule.group });
  if (!section) {
    crumbs.push({ label: processModule.menuLabel });
    return crumbs;
  }
  crumbs.push({ label: processModule.menuLabel, href: `/${processModule.id}` });
  crumbs.push({ label: SECTION_LABELS[section] ?? processModule.workspaceLabel ?? "Queue" });
  return crumbs;
}

interface SuiteShellProps {
  children: ReactNode;
}

export function SuiteShell({ children }: SuiteShellProps) {
  const pathname = usePathname();
  const crumbs = useBreadcrumbs(pathname);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Book: true, Care: true });
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);

  // The inline script in the root layout sets data-rail before first paint; mirror it, then enable transitions.
  useEffect(() => {
    setIsCollapsed(document.documentElement.dataset.rail === "collapsed");
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    document.documentElement.dataset.rail = isCollapsed ? "collapsed" : "expanded";
    try {
      window.localStorage.setItem(COLLAPSE_KEY, isCollapsed ? "1" : "0");
    } catch {
      // Not persisted; the toggle still works for this visit.
    }
  }, [isCollapsed, isReady]);

  const toggleCollapsed = useCallback(() => {
    setTip(null);
    setIsCollapsed((collapsed) => !collapsed);
  }, []);

  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    setIsNavOpen(false);
    setIsPaletteOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
      } else if (mod && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleCollapsed();
      } else if (event.key === "Escape") {
        setIsNavOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  useEffect(() => {
    document.body.style.overflow = isNavOpen || isPaletteOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isNavOpen, isPaletteOpen]);

  // Collapsed rail: one fixed-position tooltip so the scrolling nav never clips it.
  function showTip(event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) {
    if (!isCollapsed || !window.matchMedia(DESKTOP_QUERY).matches) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-label]");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    setTip({ label: target.dataset.label ?? "", top: rect.top + rect.height / 2 });
  }


  return (
    <>
    <div className="wave-wallpaper" aria-hidden="true">
      <div className="wave-wash" />
      <svg viewBox="0 0 1440 1024" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="vibBgSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a76e8" stopOpacity="0.30" />
            <stop offset="1" stopColor="#2a76e8" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="vibBgWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#16b8d4" stopOpacity="0.30" />
            <stop offset="1" stopColor="#16b8d4" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="vibBgGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#18b890" stopOpacity="0.32" />
            <stop offset="1" stopColor="#18b890" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path d="M -275 456 C -229 471 -92 526 0 547 C 92 569 183 594 275 584 C 367 575 458 514 550 493 C 642 471 733 446 825 456 C 917 465 1008 526 1100 547 C 1192 569 1283 594 1375 584 C 1467 575 1604 508 1650 493 L 1440 1024 L 0 1024 Z" fill="url(#vibBgSky)" />
        <path d="M -313 672 C -260 685 -104 753 0 749 C 104 745 208 678 313 648 C 417 619 521 567 625 571 C 729 575 833 642 938 672 C 1042 701 1146 753 1250 749 C 1354 745 1510 665 1563 648 L 1440 1024 L 0 1024 Z" fill="url(#vibBgWater)" />
        <path d="M -245 862 C -204 854 -82 836 0 815 C 82 795 163 743 245 738 C 327 733 408 764 490 785 C 572 805 653 857 735 862 C 817 867 898 836 980 815 C 1062 795 1143 743 1225 738 C 1307 733 1429 777 1470 785 L 1440 1024 L 0 1024 Z" fill="url(#vibBgGreen)" />
      </svg>
    </div>
    <div className={isReady ? "shell ready" : "shell"}>
      <button
        className={isNavOpen ? "backdrop open" : "backdrop"}
        type="button"
        tabIndex={-1}
        aria-hidden={!isNavOpen}
        aria-label="Close menu"
        onClick={() => setIsNavOpen(false)}
      />
      <aside className={isNavOpen ? "sidebar open" : "sidebar"} aria-label="Suite navigation">
        <div className="brand-row">
          <Link className="brand" href="/home" data-label="Suite Home">
            <img className="brand-logo" src={LOGO_SRC} alt="" width={32} height={32} />
            <p className="fade-label">
              <strong>Vibrium</strong>
              <span>Travel Suite</span>
            </p>
          </Link>
          <button className="drawer-close" type="button" aria-label="Close menu" onClick={() => setIsNavOpen(false)}>
            <Glyph className="rail-icon"><path d="M6 6l12 12M18 6 6 18" /></Glyph>
          </button>
        </div>
        <button
          className="rail-button"
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          title={`${isCollapsed ? "Expand" : "Collapse"} sidebar (⌘B)`}
          onClick={toggleCollapsed}
        >
          <Glyph className="rail-icon"><path d="m15 6-6 6 6 6" /></Glyph>
        </button>
        <nav aria-label="Suite" onMouseOver={showTip} onFocus={showTip} onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)}>
          <SuiteNavLink className="nav-link" href="/home" end label="Suite Home">
            <NavGlyph id="home" />
            <span className="fade-label">Suite Home</span>
          </SuiteNavLink>
          {NAV_GROUPS.map((group) => {
            const isOpen = isCollapsed || openGroups[group] !== false;
            const groupId = `nav-group-${group.toLowerCase()}`;
            return (
              <div className="nav-group" key={group}>
                <button
                  className="nav-section"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={groupId}
                  tabIndex={isCollapsed ? -1 : 0}
                  onClick={() => setOpenGroups((current) => ({ ...current, [group]: current[group] === false }))}
                >
                  <span className="fade-label">{group}</span>
                  <svg className={isOpen ? "chevron open" : "chevron"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
                <div className={isOpen ? "nav-group-items open" : "nav-group-items"} id={groupId} inert={!isOpen}>
                  <div>
                    {PROCESSES.filter((processModule) => processModule.group === group).map((processModule) => (
                      <SuiteNavLink key={processModule.id} className="nav-link" href={`/${processModule.id}`} label={processModule.menuLabel}>
                        <NavGlyph id={processModule.id} />
                        <span className="fade-label">{processModule.menuLabel}</span>
                      </SuiteNavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        <div className="account" data-label={`${OPERATOR.name} · ${OPERATOR.role}`} onMouseOver={showTip} onMouseLeave={() => setTip(null)}>
          <div className="account-avatar" aria-hidden="true">{OPERATOR.initials}</div>
          <div className="account-copy fade-label">
            <p>{OPERATOR.name}</p>
            <span>{OPERATOR.role}</span>
          </div>
        </div>
      </aside>
      {tip && isCollapsed ? (
        <span className="rail-tip" role="tooltip" style={{ top: tip.top }}>{tip.label}</span>
      ) : null}
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-start">
            <button className="icon-button menu-button" type="button" aria-label="Open menu" onClick={() => setIsNavOpen(true)}>
              <Glyph className="rail-icon"><path d="M4 7h16M4 12h16M4 17h10" /></Glyph>
            </button>
            <nav className="crumbs" aria-label="Breadcrumb">
              <ol>
                {crumbs.map((crumb, index) => {
                  const isLast = index === crumbs.length - 1;
                  return (
                    <li key={`${crumb.label}-${index}`}>
                      {crumb.href && !isLast ? (
                        <Link href={crumb.href}>{crumb.label}</Link>
                      ) : (
                        <span aria-current={isLast ? "page" : undefined}>{crumb.label}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
          <div className="topbar-actions">
            <button className="search-trigger" type="button" onClick={() => setIsPaletteOpen(true)} aria-label="Search pages">
              <Glyph className="rail-icon"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Glyph>
              <span>Jump to…</span>
              <kbd>⌘K</kbd>
            </button>
            <span className="status-chip" title={DEMO_BOOK_NOTE}>
              <i aria-hidden="true" />
              Demo book
            </span>
          </div>
        </header>
        {children}
        <footer className="suite-footer">
          <p>{DEMO_BOOK_NOTE}</p>
        </footer>
      </div>
    </div>
    <CommandPalette open={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  );
}
