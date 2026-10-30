"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";

export type InsightView = "squad" | "map";

const VIEW_PARAM = "view";

interface ProcessInsightsProps {
  processName: string;
  agentCount: number;
  stepCount: number;
  squad: ReactNode;
  map: ReactNode;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="rail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const SquadIcon = () => (
  <Icon><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16h5" /></Icon>
);
const MapIcon = () => (
  <Icon><circle cx="6" cy="6" r="2" /><circle cx="18" cy="12" r="2" /><circle cx="6" cy="18" r="2" /><path d="M8 6h4a4 4 0 0 1 4 4M8 18h4a4 4 0 0 0 4-4" /></Icon>
);

function toView(value: string | null): InsightView | null {
  return value === "squad" || value === "map" ? value : null;
}

/** Opens the modal when a link (⌘K, Digital workers) lands on ?view=, even on the page already open. */
function ViewFromUrl({ onChange }: { onChange: (view: InsightView | null) => void }) {
  const value = useSearchParams().get(VIEW_PARAM);
  useEffect(() => onChange(toView(value)), [value, onChange]);
  return null;
}

/** Keeps ?view= in the address bar so an open squad or map can be linked to directly. */
function writeView(view: InsightView | null) {
  const url = new URL(window.location.href);
  if (view) url.searchParams.set(VIEW_PARAM, view);
  else url.searchParams.delete(VIEW_PARAM);
  window.history.replaceState(window.history.state, "", url);
}

/**
 * Reference views for a process (who the agents are, how the work flows) kept out of the
 * working tabs. Two quiet buttons in the page header open them in a modal.
 */
export function ProcessInsights({ processName, agentCount, stepCount, squad, map }: ProcessInsightsProps) {
  const [view, setView] = useState<InsightView | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => setIsMounted(true), []);

  const open = useCallback((next: InsightView) => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setView(next);
    writeView(next);
  }, []);

  const close = useCallback(() => {
    setView(null);
    writeView(null);
    returnFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!view) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      cancelAnimationFrame(frame);
    };
  }, [view, close]);

  // Reset scroll when switching between squad and map inside the open modal.
  useEffect(() => {
    panelRef.current?.querySelector(".insight-body")?.scrollTo({ top: 0 });
  }, [view]);

  const isOpen = view !== null;

  return (
    <>
      <Suspense fallback={null}>
        <ViewFromUrl onChange={setView} />
      </Suspense>
      <div className="insight-triggers" role="group" aria-label="Process reference">
        <button className="insight-trigger" type="button" onClick={() => open("squad")} aria-haspopup="dialog" title="Agentic Squad">
          <SquadIcon />
          <span>Squad</span>
          <b>{agentCount}</b>
        </button>
        <button className="insight-trigger" type="button" onClick={() => open("map")} aria-haspopup="dialog" title="Process Map">
          <MapIcon />
          <span>Map</span>
          <b>{stepCount}</b>
        </button>
      </div>
      {isMounted
        ? createPortal(
            <div className={isOpen ? "insight-layer open" : "insight-layer"} aria-hidden={!isOpen}>
              <button className="insight-scrim" type="button" tabIndex={-1} aria-label="Close" onClick={close} />
              <div
                className="insight-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="insight-title"
                ref={panelRef}
                tabIndex={-1}
                inert={!isOpen}
              >
                <header className="insight-head">
                  <div>
                    <p className="kicker">{processName}</p>
                    <h2 id="insight-title">{view === "map" ? "Process Map" : "Agentic Squad"}</h2>
                  </div>
                  <div className="insight-switch" role="tablist" aria-label="Reference view">
                    <button type="button" role="tab" aria-selected={view === "squad"} onClick={() => open("squad")}>
                      <SquadIcon /> Squad
                    </button>
                    <button type="button" role="tab" aria-selected={view === "map"} onClick={() => open("map")}>
                      <MapIcon /> Map
                    </button>
                  </div>
                  <button className="icon-button" type="button" aria-label="Close" onClick={close}>
                    <Icon><path d="M6 6l12 12M18 6 6 18" /></Icon>
                  </button>
                </header>
                <div className="insight-body">{view === "map" ? map : view === "squad" ? squad : null}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
