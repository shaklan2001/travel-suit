"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useChatPlayback } from "../../components/chat/useChatPlayback";
import { destinationById, INTEREST_LABELS, photoUrl, STYLE_LABELS, type Destination } from "../../data/destinations";
import {
  CALLBACK_MINUTES,
  formatInr,
  GOLDEN_LEAD,
  GOLDEN_TRIP_TURNS,
  indicativeFrom,
  initialTripState,
  MONTHS,
  respondTrip,
  travellerLabel,
  type TripBrief,
  type TripPlan,
  type TripState,
} from "../../data/trip-planner";

type TripChatControl = ReturnType<typeof useChatPlayback<TripState>>;

/**
 * Left: what the traveller sees, a chat that suggests places, plans the days, and estimates the budget.
 * Right: what the holiday desk sees, the lead and the workflow that carries it to a quote.
 */
export function TripPlanner() {
  const chat = useChatPlayback<TripState>(initialTripState, respondTrip);

  return (
    <div className="ride-desk planner-desk">
      <TripChat chat={chat} tag="What the traveller sees" />
      <LeadFile state={chat.committed} busy={chat.busy} onReplay={() => chat.replay(GOLDEN_TRIP_TURNS)} onReset={chat.reset} />
    </div>
  );
}

interface TripChatProps {
  chat: TripChatControl;
  title?: string;
  subtitle?: string;
  avatar?: string;
  tag?: string;
  /** Brand colour for the header, send button, and chips. Used by the website widget. */
  accent?: string;
  className?: string;
}

/** The traveller-facing chat. The suite shows it beside the lead; the website widget shows it alone. */
export function TripChat({
  chat,
  title = "Trip Planner",
  subtitle = "Plans in minutes · an expert confirms the price",
  avatar = "TP",
  tag,
  accent,
  className = "",
}: TripChatProps) {
  const { state, visible, typing, busy, scroller } = chat;
  const [draft, setDraft] = useState("");

  const send = (text: string) => {
    if (!busy && text.trim()) {
      setDraft("");
    }
    chat.send(text);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };

  return (
    <section
      className={`ride-chat planner${accent ? " branded" : ""} ${className}`.trim()}
      style={accent ? ({ "--chat-accent": accent } as CSSProperties) : undefined}
      aria-label="Traveller chat with the trip planner"
    >
      <header className="ride-chat-head">
        <span className="ride-bot-avatar" aria-hidden="true">
          {avatar}
        </span>
        <span className="ride-chat-title">
          <strong>{title}</strong>
          <small>
            <i aria-hidden="true" /> {subtitle}
          </small>
        </span>
        {tag ? <span className="ride-chat-tag">{tag}</span> : null}
      </header>

      <div className="ride-messages" ref={scroller} aria-live="polite">
        {visible.map((message) => (
          <div
            key={message.id}
            className={`ride-msg ${message.from === "bot" ? "bot" : "rider"}${message.suggestions || message.plan ? " wide" : ""}`}
          >
            <p>{message.text}</p>
            {message.suggestions ? (
              <SuggestionCards ids={message.suggestions} brief={state.brief} onPick={(name) => send(name)} disabled={busy} />
            ) : null}
            {message.plan ? <PlanCard plan={message.plan} /> : null}
          </div>
        ))}
        {typing ? (
          <div className="ride-msg bot typing" aria-label={`${title} is typing`}>
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>

      {!busy && state.chips.length > 0 ? (
        <div className="ride-chips" role="group" aria-label="Quick replies">
          {state.chips.map((chip) => (
            <button key={chip} type="button" onClick={() => send(chip)}>
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <form className="ride-input" onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={busy ? "Planning…" : "e.g. Honeymoon in Bali for 6 days"}
          aria-label="Message the trip planner"
          disabled={busy}
          maxLength={300}
        />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Send">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </section>
  );
}

function SuggestionCards({
  ids,
  brief,
  onPick,
  disabled,
}: {
  ids: string[];
  brief: TripBrief;
  onPick: (name: string) => void;
  disabled: boolean;
}) {
  const destinations = ids.map(destinationById).filter((destination): destination is Destination => destination !== null);
  return (
    <div className="dest-grid">
      {destinations.map((destination) => {
        const inSeason = brief.month ? destination.bestMonths.includes(brief.month) : true;
        return (
          <button key={destination.id} type="button" className="dest-card" onClick={() => onPick(destination.name)} disabled={disabled}>
            <img src={photoUrl(destination.photos[0], 600)} alt={`${destination.name}, ${destination.country}`} loading="lazy" />
            <span className="dest-body">
              <strong>{destination.name}</strong>
              <small>{destination.tagline}</small>
              <span className="dest-meta">
                <span className={`season ${inSeason ? "good" : "off"}`}>{inSeason ? "Good season" : "Off season"}</span>
                <span>from {formatInr(indicativeFrom(destination, brief))}/person</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({ plan }: { plan: TripPlan }) {
  const { brief } = plan;
  const destination = destinationById(plan.destinationId);
  if (!destination) {
    return null;
  }
  const max = Math.max(...plan.budget.map((line) => line.high), 1);

  return (
    <article className="trip-card">
      <div className="trip-photos">
        {destination.photos.slice(0, 3).map((photo, index) => (
          <img key={photo} src={photoUrl(photo, index === 0 ? 900 : 500)} alt={index === 0 ? `${destination.name}` : ""} loading="lazy" />
        ))}
        <span className="trip-photo-title">
          <strong>{destination.name}</strong>
          <small>
            {brief.days} days · {brief.month ? MONTHS[brief.month - 1] : ""} · {brief.style ? STYLE_LABELS[brief.style] : ""}
          </small>
        </span>
      </div>

      {plan.seasonNote ? <p className="trip-season">Season check: {plan.seasonNote}</p> : null}

      <div className="trip-section">
        <h3>Day by day</h3>
        <ol className="trip-days">
          {plan.days.map((day) => (
            <li key={day.day}>
              <b>Day {day.day}</b>
              <span>{day.text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="trip-section">
        <div className="trip-total">
          <h3>Estimated budget</h3>
          <span>
            <strong>
              {formatInr(plan.totalLow)} – {formatInr(plan.totalHigh)}
            </strong>
            <small>
              {formatInr(plan.perPersonLow)} – {formatInr(plan.perPersonHigh)} per person
            </small>
          </span>
        </div>
        <ul className="trip-budget">
          {plan.budget.map((line) => (
            <li key={line.label}>
              <span className="trip-budget-label">{line.label}</span>
              <span className="trip-budget-bar" aria-hidden="true">
                <i style={{ width: `${(line.high / max) * 100}%` }} />
              </span>
              <span className="trip-budget-value">
                {formatInr(line.low)} – {formatInr(line.high)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {plan.notes.length > 0 ? (
        <ul className="trip-notes">
          {plan.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      <p className="plan-foot">An estimate from typical costs, not a quote. Your holiday expert confirms live flights, hotels, and the final price.</p>
    </article>
  );
}

type NodeKind = "chat" | "voice" | "worker" | "automation" | "human";
type NodeStatus = "idle" | "working" | "done" | "pending";

const NODE_KIND_LABELS: Record<NodeKind, string> = {
  chat: "Chat agent",
  voice: "Voice agent",
  worker: "Worker agent",
  automation: "Automation",
  human: "Person",
};

function LeadFile({ state, busy, onReplay, onReset }: { state: TripState; busy: boolean; onReplay: () => void; onReset: () => void }) {
  const { brief, plan, leadCode, addOns, step } = state;
  const destination = destinationById(brief.destinationId ?? "");
  const briefDone = plan !== null;
  const hasLead = leadCode !== null;

  const rows: [string, string | null][] = [
    ["Travellers", travellerLabel(brief)],
    ["From", brief.origin],
    ["When", brief.month ? MONTHS[brief.month - 1] : null],
    ["Days", brief.days ? `${brief.days} days` : null],
    ["Stay", brief.style ? STYLE_LABELS[brief.style] : null],
    ["Looking for", lookingFor(brief)],
    ["Destination", destination ? `${destination.name}, ${destination.country}` : null],
    ["Estimate", plan ? `${formatInr(plan.totalLow)} – ${formatInr(plan.totalHigh)}` : null],
  ];

  const nodes: { kind: NodeKind; name: string; status: NodeStatus; note: string }[] = [
    { kind: "chat", name: "Trip Planner", status: briefDone ? "done" : "working", note: briefDone ? "Brief complete" : "Talking to the traveller" },
    {
      kind: "worker",
      name: "Destination Matcher",
      status: destination ? "done" : state.shown.length > 0 ? "working" : "idle",
      note: destination ? `${destination.name} chosen` : state.shown.length > 0 ? `${state.shown.length} places suggested` : "Waits for the brief",
    },
    { kind: "worker", name: "Itinerary Builder", status: plan ? "done" : "idle", note: plan ? `${plan.days.length}-day plan drafted` : "Waits for a destination" },
    { kind: "worker", name: "Estimate Engine", status: plan ? "done" : "idle", note: plan ? "Range from current cost bands" : "Waits for the plan" },
    { kind: "automation", name: "Create lead in CRM", status: hasLead ? "pending" : "idle", note: hasLead ? "Lead written to the CRM" : "When the traveller asks for a quote" },
    {
      kind: "voice",
      name: "Holiday Advisor call",
      status: hasLead ? "working" : "idle",
      note: hasLead ? `Calls within ${CALLBACK_MINUTES} minutes` : "Calls back after the lead",
    },
    { kind: "human", name: "Holiday expert", status: hasLead ? "pending" : "idle", note: "Confirms flights, hotels, and the final price" },
  ];

  const addOnList = [
    addOns.visa ? "Visa desk check" : null,
    addOns.forex ? "Forex card" : null,
    addOns.insurance ? "Travel insurance" : null,
  ].filter((item): item is string => item !== null);

  return (
    <aside className="case-file" aria-label="Lead the holiday desk sees">
      <header className="case-file-head">
        <div>
          <p className="kicker accent">What the holiday desk sees</p>
          <h2>{leadCode ?? "New trip enquiry"}</h2>
        </div>
        <span className={`status-pill${hasLead ? " ok" : ""}`}>
          {step === "done" ? "Callback scheduled" : hasLead ? "Lead created" : briefDone ? "Plan shared" : "Planning"}
        </span>
      </header>

      <div className="case-actions">
        <button className="primary-button" type="button" onClick={onReplay} disabled={busy}>
          Replay {GOLDEN_LEAD}
        </button>
        <button className="ghost-button" type="button" onClick={onReset} disabled={busy}>
          Start over
        </button>
      </div>

      {destination ? <img className="lead-photo" src={photoUrl(destination.photos[0], 700)} alt={destination.name} /> : null}

      <section className="case-block">
        <h3>Trip brief</h3>
        <dl className="brief-rows">
          {rows.map(([label, value]) => (
            <div key={label} className={value ? "filled" : "empty"}>
              <dt>{label}</dt>
              <dd>{value ?? "Waiting"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="case-block">
        <h3>Workflow on this lead</h3>
        <ol className="flow-steps">
          {nodes.map((node) => (
            <li key={node.name} className={`${node.kind} ${node.status}`}>
              <span className="flow-dot" aria-hidden="true" />
              <span className="flow-text">
                <small>{NODE_KIND_LABELS[node.kind]}</small>
                <strong>{node.name}</strong>
                <em>{node.note}</em>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {addOnList.length > 0 ? (
        <section className="case-block">
          <h3>Also on this lead</h3>
          <div className="agent-chips">
            {addOnList.map((item) => (
              <span className="chip channel" key={item}>
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}

function lookingFor(brief: TripBrief): string | null {
  if (brief.interest) return INTEREST_LABELS[brief.interest];
  if (brief.scope === "india") return "India";
  if (brief.scope === "international") return "International";
  if (brief.scope === "either") return "Open to ideas";
  return brief.destinationId ? "Named the place" : null;
}
