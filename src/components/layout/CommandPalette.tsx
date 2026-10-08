"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { PROCESSES } from "../../data/book";

interface PaletteItem {
  href: string;
  title: string;
  hint: string;
}

const ITEMS: PaletteItem[] = [
  { href: "/home", title: "Suite Home", hint: "Command Center" },
  ...PROCESSES.flatMap((processModule) => {
    const base = `/${processModule.id}`;
    return [
      { href: base, title: processModule.name, hint: `${processModule.group} · Overview` },
      { href: `${base}/squad`, title: `${processModule.menuLabel} — Agentic Squad`, hint: processModule.group },
      { href: `${base}/map`, title: `${processModule.menuLabel} — Process Map`, hint: processModule.group },
      { href: `${base}/queue`, title: `${processModule.menuLabel} — ${processModule.workspaceLabel ?? "Queue"}`, hint: processModule.group },
    ];
  }),
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** Cmd/Ctrl+K jump list for every page in the suite. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return ITEMS;
    return ITEMS.filter((item) => {
      const haystack = `${item.title} ${item.hint}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(item: PaletteItem | undefined) {
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className={open ? "palette-layer open" : "palette-layer"} aria-hidden={!open}>
      <button className="palette-scrim" type="button" tabIndex={-1} aria-label="Close search" onClick={onClose} />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Jump to a page" onKeyDown={onKeyDown}>
        <div className="palette-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a process, squad, map or queue…"
            aria-label="Search pages"
            tabIndex={open ? 0 : -1}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" ref={listRef} role="listbox">
          {results.length === 0 ? <li className="palette-empty">No page matches “{query}”.</li> : null}
          {results.map((item, index) => (
            <li key={item.href}>
              <button
                type="button"
                data-index={index}
                role="option"
                aria-selected={index === active}
                tabIndex={-1}
                onMouseMove={() => setActive(index)}
                onClick={() => go(item)}
              >
                <span>{item.title}</span>
                <small>{item.hint}</small>
              </button>
            </li>
          ))}
        </ul>
        <div className="palette-foot" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
        </div>
      </div>
    </div>
  );
}
