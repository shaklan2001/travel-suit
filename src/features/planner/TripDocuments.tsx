"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { choicesFromQuery, defaultChoices, HOLIDAY_LEADS, leadByCode, leadTitle, type HolidayLead, type QuoteChoices } from "../../data/holiday-desk";
import {
  ACCENTS,
  applyWorkerCopy,
  composeDocument,
  DEFAULT_BRAND,
  DOC_KIND_LABELS,
  docRef,
  leadFromPrompt,
  parsePrompt,
  TEMPLATE_LABELS,
  type DocBrand,
  type DocKind,
  type DocTemplate,
  type TripDoc,
  type WorkerCopy,
} from "../../data/trip-document";
import { TripDocumentView } from "./TripDocumentView";
import { loadWidgetSettings } from "./widget-settings";

type Source = "prompt" | "lead";
type StepState = "waiting" | "running" | "done";

const EXAMPLES = [
  "6-day Bali honeymoon for Rahul & Priya from Mumbai in November, comfort stays, with a quote",
  "Kerala family holiday for 4 from Delhi in December, 9 days, houseboat included",
  "Luxury Switzerland trip for Ananya and Karan from Delhi in May, 8 days, editorial style",
  "Budget Thailand trip for 4 friends from Bengaluru in March, 7 days, with price",
];

const STEPS = [
  { worker: "Trip Document Designer", text: "Reads the request" },
  { worker: "Itinerary Builder", text: "Plans the days" },
  { worker: "Quote Builder", text: "Prices flights, stays, and extras" },
  { worker: "Trip Document Designer", text: "Writes the copy" },
  { worker: "Trip Document Designer", text: "Lays out the pages" },
];

const STEP_MS = 520;

/** Trip documents: one prompt, or a lead from the quote desk, becomes a designed PDF. */
export function TripDocuments() {
  const [source, setSource] = useState<Source>("prompt");
  const [prompt, setPrompt] = useState(EXAMPLES[0]);
  const [leadCode, setLeadCode] = useState(HOLIDAY_LEADS[0].code);
  const [leadChoices, setLeadChoices] = useState<QuoteChoices | null>(null);
  const [kind, setKind] = useState<DocKind>("quote");
  const [template, setTemplate] = useState<DocTemplate>("editorial");
  const [brand, setBrand] = useState<DocBrand>(DEFAULT_BRAND);
  const [doc, setDoc] = useState<TripDoc | null>(null);
  const [steps, setSteps] = useState<StepState[]>(STEPS.map(() => "waiting"));
  const [running, setRunning] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  // What the current document was built from, so restyling keeps the same trip and copy.
  const lastLead = useRef<HolidayLead | null>(null);
  const lastChoices = useRef<QuoteChoices | null>(null);
  const lastCopy = useRef<WorkerCopy | null>(null);

  useEffect(() => {
    const widget = loadWidgetSettings();
    const nextBrand = { ...DEFAULT_BRAND, agency: widget.name || DEFAULT_BRAND.agency, accent: widget.color || DEFAULT_BRAND.accent };
    setBrand(nextBrand);

    const params = new URLSearchParams(window.location.search);
    const lead = leadByCode(params.get("lead"));
    if (lead) {
      const choices = choicesFromQuery(lead, params);
      setSource("lead");
      setLeadCode(lead.code);
      setLeadChoices(choices);
      setKind("quote");
      lastLead.current = lead;
      lastChoices.current = choices;
      setDoc(composeDocument({ lead, kind: "quote", template: "editorial", brand: nextBrand, choices }));
      setSteps(STEPS.map(() => "done"));
    } else {
      const lead = leadFromPrompt(parsePrompt(EXAMPLES[0]), docRef(EXAMPLES[0]));
      lastLead.current = lead;
      setDoc(composeDocument({ lead, kind: "quote", template: "editorial", brand: nextBrand }));
      setSteps(STEPS.map(() => "done"));
    }
    return () => timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  // Restyling an existing document is instant: template, accent, type, and agency need no new run.
  useEffect(() => {
    setDoc((current) => (current ? rebuild(current, { template, brand, kind }) : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, brand.accent, brand.agency, kind]);

  const rebuild = (current: TripDoc, next: { template: DocTemplate; brand: DocBrand; kind: DocKind }): TripDoc => {
    const lead = lastLead.current;
    if (!lead) return { ...current, template: next.template, brand: next.brand };
    const composed = composeDocument({ lead, kind: next.kind, template: next.template, brand: next.brand, choices: lastChoices.current ?? undefined });
    return applyWorkerCopy(composed, lastCopy.current);
  };

  const generate = async () => {
    setError(null);
    lastCopy.current = null;
    let lead: HolidayLead;
    let choices: QuoteChoices | undefined;
    if (source === "prompt") {
      const request = parsePrompt(prompt);
      if (!request.brief.destinationId) {
        setError("Name a destination in the prompt, for example Bali, Kerala, Dubai, or Switzerland.");
        return;
      }
      if (request.template) setTemplate(request.template);
      setKind(request.kind);
      lead = leadFromPrompt(request, docRef(prompt));
      choices = undefined;
      lastLead.current = lead;
      lastChoices.current = null;
    } else {
      lead = leadByCode(leadCode) ?? HOLIDAY_LEADS[0];
      choices = leadChoices ?? defaultChoices(lead);
      lastLead.current = lead;
      lastChoices.current = choices;
    }
    const request = source === "prompt" ? parsePrompt(prompt) : null;
    const useKind = request?.kind ?? kind;
    const useTemplate = request?.template ?? template;
    const composed = composeDocument({ lead, kind: useKind, template: useTemplate, brand, choices });

    setRunning(true);
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setSteps(STEPS.map((_, index) => (index === 0 ? "running" : "waiting")));
    STEPS.forEach((_, index) => {
      timers.current.push(
        window.setTimeout(() => {
          setSteps(STEPS.map((__, other) => (other <= index ? "done" : other === index + 1 ? "running" : "waiting")));
        }, STEP_MS * (index + 1)),
      );
    });

    const copy = await requestWorkerCopy(source === "prompt" ? prompt : `${lead.names}: ${lead.ask}`, composed);
    lastCopy.current = copy;
    const finished = applyWorkerCopy(composed, copy);
    timers.current.push(
      window.setTimeout(() => {
        setDoc(finished);
        setRunning(false);
      }, STEP_MS * STEPS.length + 120),
    );
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const download = () => {
    if (!doc) return;
    const title = document.title;
    document.title = `${doc.ref} ${doc.destination.name} ${doc.kind === "quote" ? "quote" : "itinerary"}`;
    document.documentElement.classList.add("printing-doc");
    setPrinting(true);
    const done = () => {
      document.documentElement.classList.remove("printing-doc");
      document.title = title;
      setPrinting(false);
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.setTimeout(() => window.print(), 300);
  };

  const pages = doc ? 3 + Math.ceil(doc.days.length / 4) + (doc.price ? 1 : 0) : 0;

  return (
    <div className="pl-stack">
      <section className="pl-intro">
        <div>
          <h2>Trip documents, designed in one prompt</h2>
          <p>
            Describe the trip, or pick a lead from the quote desk. The Trip Document Designer plans the days, prices it, writes
            the copy, and lays out a branded PDF your traveller will want to keep.
          </p>
        </div>
      </section>

      <div className="td-studio">
        <aside className="card pl-card td-panel">
          <div className="segmented td-source" role="tablist" aria-label="Start from">
            <button type="button" role="tab" aria-selected={source === "prompt"} onClick={() => setSource("prompt")}>
              From a prompt
            </button>
            <button type="button" role="tab" aria-selected={source === "lead"} onClick={() => setSource("lead")}>
              From a lead
            </button>
          </div>

          {source === "prompt" ? (
            <div className="pl-form">
              <label className="pl-field">
                <span>Describe the document</span>
                <textarea rows={4} maxLength={400} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              </label>
              <div className="td-examples">
                {EXAMPLES.slice(1).map((example) => (
                  <button key={example} type="button" onClick={() => setPrompt(example)}>
                    {example.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pl-form">
              <label className="pl-field">
                <span>Lead</span>
                <select
                  value={leadCode}
                  onChange={(event) => {
                    setLeadCode(event.target.value);
                    setLeadChoices(null);
                  }}
                >
                  {HOLIDAY_LEADS.map((lead) => (
                    <option key={lead.code} value={lead.code}>
                      {lead.code} · {lead.names} · {leadTitle(lead)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="td-hint">
                {leadChoices ? "Uses the flight, stay, extras, and markup you picked on the quote desk." : "Uses the recommended flight and stay. Pick others on the quote desk."}
              </p>
            </div>
          )}

          <div className="pl-form">
            <div className="pl-field">
              <span>Document</span>
              <div className="segmented" role="group" aria-label="Document type">
                {(Object.keys(DOC_KIND_LABELS) as DocKind[]).map((value) => (
                  <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>
                    {DOC_KIND_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
            <div className="pl-field">
              <span>Design</span>
              <div className="td-templates">
                {(Object.keys(TEMPLATE_LABELS) as DocTemplate[]).map((value) => (
                  <button key={value} type="button" aria-pressed={template === value} className={`td-template-chip ${value}`} onClick={() => setTemplate(value)}>
                    <i aria-hidden="true" />
                    {TEMPLATE_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
            <div className="pl-field">
              <span>Brand colour</span>
              <div className="pl-swatches">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    className="pl-swatch"
                    style={{ background: accent }}
                    aria-label={`Use ${accent}`}
                    aria-pressed={brand.accent === accent}
                    onClick={() => setBrand((current) => ({ ...current, accent }))}
                  />
                ))}
              </div>
            </div>
            <label className="pl-field">
              <span>Agency name</span>
              <input value={brand.agency} maxLength={40} onChange={(event) => setBrand((current) => ({ ...current, agency: event.target.value }))} />
            </label>
          </div>

          <button type="button" className="pl-btn primary td-go" onClick={generate} disabled={running}>
            {running ? "Designing…" : "Design the document"}
          </button>
          {error ? <p className="td-error">{error}</p> : null}

          <ol className="td-run" aria-label="Worker run">
            {STEPS.map((step, index) => (
              <li key={`${step.text}-${index}`} className={steps[index]}>
                <i aria-hidden="true" />
                <span>
                  <strong>{step.text}</strong>
                  <small>{step.worker}</small>
                </span>
              </li>
            ))}
          </ol>
        </aside>

        <section className="td-preview" aria-label="Document preview">
          <div className="td-toolbar">
            <div>
              <strong>{doc ? `${doc.destination.name} · ${DOC_KIND_LABELS[doc.kind]}` : "Preview"}</strong>
              <small>
                {doc ? `${doc.ref} · ${pages} pages · A4 · ${TEMPLATE_LABELS[doc.template]}` : ""}
              </small>
            </div>
            <div className="pl-actions-row">
              <button type="button" className="pl-btn" onClick={() => notify(`Sent to ${doc?.travellers ?? "the traveller"} on WhatsApp.`)} disabled={!doc || running}>
                WhatsApp
              </button>
              <button type="button" className="pl-btn" onClick={() => notify(`Emailed to ${doc?.travellers ?? "the traveller"}.`)} disabled={!doc || running}>
                Email
              </button>
              <button type="button" className="pl-btn primary" onClick={download} disabled={!doc || running}>
                Download PDF
              </button>
            </div>
          </div>
          <div className={`td-canvas${running ? " busy" : ""}`}>{doc ? <TripDocumentView doc={doc} /> : null}</div>
        </section>
      </div>

      {printing && doc ? createPortal(<div className="td-print-root"><TripDocumentView doc={doc} /></div>, document.body) : null}
      {toast ? (
        <div className="pl-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/** Asks the Trip Document Designer worker to write the copy. Returns null when it is not connected. */
async function requestWorkerCopy(prompt: string, draft: TripDoc): Promise<WorkerCopy | null> {
  try {
    const response = await fetch("/api/planner/document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.slice(0, 600),
        draft: JSON.stringify({
          destination: `${draft.destination.name}, ${draft.destination.country}`,
          travellers: draft.travellers,
          dates: draft.dates,
          title: draft.title,
          intro: draft.intro,
          days: draft.days.map((day) => ({ title: day.title, text: day.text })),
          tips: draft.tips,
        }).slice(0, 6000),
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { copy?: WorkerCopy };
    return body.copy ?? null;
  } catch {
    return null;
  }
}
