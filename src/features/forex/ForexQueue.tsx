"use client";

import { useState } from "react";
import { FOREX_RULES } from "../../data/forex-rules";
import {
  FOREX_LEADS,
  foreign,
  JOURNEY,
  quoteFor,
  rupees,
  STAGE_LABELS,
  stageIndex,
  type ForexLead,
  type ForexStage,
} from "../../data/forex-desk";

type Filter = "all" | "action" | ForexStage;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "action", label: "Needs you" },
  { id: "quoted", label: "Quoted" },
  { id: "advance", label: "Advance paid" },
  { id: "branch", label: "At branch" },
];

const SPEAKER: Record<string, string> = { customer: "Customer", bot: "Forex Desk", ravi: "Ravi" };

/** What the team does next on a lead, and the stage it moves the lead to. */
function nextAction(lead: ForexLead, stage: ForexStage): { label: string; to: ForexStage; toast: string; hint: string } | null {
  if (stage === "need")
    return {
      label: "Approve quote and send on WhatsApp",
      to: "quoted",
      toast: `Quote sent to ${lead.name} with an advance payment link.`,
      hint: "Ravi has the need and the Rate Desk has priced it. Check it and send.",
    };
  if (stage === "quoted")
    return {
      label: "Book the branch visit",
      to: "branch",
      toast: `Branch visit booked for ${lead.name}. Document list sent on WhatsApp.`,
      hint: "The quote is with the customer. Book the KYC visit now, or wait for the advance.",
    };
  if (stage === "advance")
    return {
      label: "Confirm the branch slot",
      to: "branch",
      toast: `${lead.branch?.name ?? "Branch"} confirmed for ${lead.name}.`,
      hint: "The advance is in and the rate is held. Confirm the slot with the branch.",
    };
  if (stage === "branch")
    return {
      label: "Mark KYC done and handed over",
      to: "done",
      toast: `${lead.code} closed: ${lead.product === "Reload" ? "card reloaded" : "card handed over"}.`,
      hint: "The customer is due at the branch. Close it once KYC is done.",
    };
  return null;
}

/** Forex leads: every enquiry, what the agents captured, the live quote, and the next step to the branch. */
export function ForexQueue() {
  const [stages, setStages] = useState<Record<string, ForexStage>>(() => Object.fromEntries(FOREX_LEADS.map((lead) => [lead.code, lead.stage])));
  const [selected, setSelected] = useState(FOREX_LEADS[0].code);
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<string | null>(null);

  const visible = FOREX_LEADS.filter((lead) => {
    const stage = stages[lead.code];
    if (filter === "all") return true;
    if (filter === "action") return stage === "need" || stage === "advance";
    return stage === filter;
  });
  const lead = FOREX_LEADS.find((item) => item.code === selected) ?? FOREX_LEADS[0];
  const count = (test: (stage: ForexStage) => boolean) => FOREX_LEADS.filter((item) => test(stages[item.code])).length;
  const quotedValue = FOREX_LEADS.filter((item) => stageIndex(stages[item.code]) >= stageIndex("quoted")).reduce(
    (sum, item) => sum + (quoteFor(item)?.total ?? 0),
    0,
  );

  const advance = (code: string, to: ForexStage, message: string) => {
    setStages((current) => ({ ...current, [code]: to }));
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <div className="pl-stack">
      <section className="pl-kpis" aria-label="Forex lead figures">
        <article className="card">
          <span>Enquiries today</span>
          <strong>31</strong>
          <small>14 answered by the bot on its own</small>
        </article>
        <article className="card">
          <span>Need your approval</span>
          <strong>{count((stage) => stage === "need")}</strong>
          <small>quotes ready to send</small>
        </article>
        <article className="card">
          <span>Quoted value</span>
          <strong>{rupees(quotedValue)}</strong>
          <small>{count((stage) => stageIndex(stage) >= stageIndex("quoted"))} customers with a live quote</small>
        </article>
        <article className="card">
          <span>Branch visits booked</span>
          <strong>{count((stage) => stage === "branch" || stage === "advance")}</strong>
          <small>KYC in person, every sale</small>
        </article>
      </section>

      <div className="pl-desk">
        <aside className="card pl-leads" aria-label="Forex leads">
          <div className="pl-lead-filters" role="tablist" aria-label="Filter leads">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <ul>
            {visible.map((item) => (
              <li key={item.code}>
                <button type="button" aria-current={item.code === lead.code ? "true" : undefined} onClick={() => setSelected(item.code)}>
                  <span className="fx-badge" aria-hidden="true">
                    {item.product === "Question" ? "?" : item.currency}
                  </span>
                  <span className="pl-lead-text">
                    <strong>{item.name}</strong>
                    <small>
                      {item.product === "Question" ? item.purpose : `${item.product} · ${foreign(item)} · ${item.destination}`}
                    </small>
                    <span className="pl-lead-meta">
                      <span className={`fx-stage ${stages[item.code]}`}>{STAGE_LABELS[stages[item.code]]}</span>
                      <em>
                        {item.channel} · {item.received}
                      </em>
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {visible.length === 0 ? <li className="pl-empty">Nothing here right now.</li> : null}
          </ul>
        </aside>

        <LeadView key={lead.code} lead={lead} stage={stages[lead.code]} onAdvance={advance} />
      </div>

      {toast ? (
        <div className="pl-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function LeadView({ lead, stage, onAdvance }: { lead: ForexLead; stage: ForexStage; onAdvance: (code: string, to: ForexStage, message: string) => void }) {
  const quote = quoteFor(lead);
  const action = nextAction(lead, stage);
  const current = stageIndex(stage);
  const isQuestion = lead.product === "Question";

  const facts: [string, string][] = isQuestion
    ? [
        ["Asked about", lead.purpose],
        ["Channel", lead.channel],
      ]
    : [
        ["Product", `${lead.product} · ${lead.mode}`],
        ["Amount", `${foreign(lead)} ${lead.currency}`],
        ["Destination", lead.destination],
        ["Travel date", lead.travelDate ?? "Not travelling"],
        ["Purpose", lead.purpose],
        ["City", lead.city],
      ];

  return (
    <div className="pl-workspace">
      <section className="card fx-head">
        <div className="fx-head-top">
          <div>
            <p className="pl-overline">
              {lead.code} · {lead.channel} · {lead.received}
            </p>
            <h2>{lead.name}</h2>
            <p className="fx-head-sub">{isQuestion ? lead.purpose : `${lead.product} ${foreign(lead)} ${lead.mode.toLowerCase()} for ${lead.destination}`}</p>
          </div>
          <span className={`fx-stage ${stage}`}>{STAGE_LABELS[stage]}</span>
        </div>

        {!isQuestion ? (
          <ol className="fx-journey" aria-label="Journey">
            {JOURNEY.map((step, index) => {
              const state = index === 0 || index <= current ? "fx-done" : index === current + 1 ? "fx-next" : "fx-later";
              return (
                <li key={step.label} className={state}>
                  <i aria-hidden="true" />
                  <strong>{step.label}</strong>
                  <small>{step.agent}</small>
                </li>
              );
            })}
          </ol>
        ) : null}

        <dl className="pl-facts fx-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="pl-quote-grid">
        <section className="card pl-card">
          <header className="pl-card-head">
            <h3>Conversation</h3>
            <p>{isQuestion ? "The Forex Desk bot answered on its own." : "The Forex Desk bot picked it up and Ravi captured the need."}</p>
          </header>
          <ol className="fx-chat">
            {lead.conversation.map((line, index) => (
              <li key={index} className={line.from}>
                <small>{SPEAKER[line.from]}</small>
                <p>{line.text}</p>
              </li>
            ))}
          </ol>
          {lead.branch && stageIndex(stage) >= stageIndex("advance") ? (
            <div className="fx-branch">
              <div>
                <p className="pl-overline">Branch visit</p>
                <strong>{lead.branch.name}</strong>
                <span>{lead.branch.slot}</span>
              </div>
              <div>
                <p className="pl-overline">Bring</p>
                <span>{lead.branch.documents.join(" · ")}</span>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="card pl-price" aria-label="Quote">
          {quote ? (
            <>
              <header>
                <p className="pl-overline">Live quote · Rate Desk</p>
                <strong className="pl-price-total">{rupees(quote.total)}</strong>
                <small>
                  {foreign(lead)} at ₹{quote.rate.toFixed(2)} · {quote.rateLabel}
                </small>
              </header>
              <ul className="pl-price-lines">
                <li>
                  <span>
                    {lead.currency} {lead.amount.toLocaleString("en-IN")}
                    <small>at ₹{quote.rate.toFixed(2)}</small>
                  </span>
                  <b>{rupees(quote.inrValue)}</b>
                </li>
                <li>
                  <span>
                    GST on conversion
                    <small>by the standard slabs</small>
                  </span>
                  <b>{rupees(quote.gst)}</b>
                </li>
                <li>
                  <span>
                    TCS
                    <small>{quote.tcsNote}</small>
                  </span>
                  <b>{rupees(quote.tcs)}</b>
                </li>
                <li className="pl-price-total-row">
                  <span>Customer pays</span>
                  <b>{rupees(quote.total)}</b>
                </li>
              </ul>
              <p className="fx-advance">
                Optional advance to lock the rate: <b>{rupees(quote.advance)}</b>. Link valid {FOREX_RULES.paymentLinkValidMinutes} minutes, rate held{" "}
                {FOREX_RULES.rateHoldHours} hours.
              </p>
            </>
          ) : (
            <header>
              <p className="pl-overline">No quote needed</p>
              <strong className="fx-closed">Answered</strong>
              <small>The customer had a question and the bot answered it. If they come back, the lead reopens with Ravi.</small>
            </header>
          )}

          {action ? (
            <div className="pl-actions">
              <p className="fx-hint">{action.hint}</p>
              <button type="button" className="pl-btn primary" onClick={() => onAdvance(lead.code, action.to, action.toast)}>
                {action.label}
              </button>
            </div>
          ) : stage === "done" ? (
            <p className="pl-margin">Closed. KYC done and the {lead.product === "Reload" ? "card reloaded" : "card handed over"}.</p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
