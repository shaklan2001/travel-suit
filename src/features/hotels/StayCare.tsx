"use client";

import { useState, type FormEvent } from "react";
import { useChatPlayback } from "../../components/chat/useChatPlayback";
import {
  ASK_LABELS,
  CATEGORY_LABELS,
  FRONT_DESK_LABELS,
  GOLDEN_CARE_TURNS,
  GOLDEN_TICKET,
  initialCareState,
  respondCare,
  URGENCY_LABELS,
  type CareState,
  type CareTicket,
} from "../../data/stay-care";

/**
 * Left: what the guest sees, a chat with Stay Care during the stay.
 * Right: what the stay desk sees, the ticket the agents build and where a person must act.
 */
export function StayCare() {
  const chat = useChatPlayback<CareState>(initialCareState, respondCare);
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
    <div className="ride-desk">
      <section className="ride-chat stay" aria-label="Guest chat with Stay Care">
        <header className="ride-chat-head">
          <span className="ride-bot-avatar" aria-hidden="true">
            SC
          </span>
          <span className="ride-chat-title">
            <strong>Stay Care</strong>
            <small>
              <i aria-hidden="true" /> Corporate travel desk · replies in minutes
            </small>
          </span>
          <span className="ride-chat-tag">What the guest sees</span>
        </header>

        <div className="ride-messages" ref={scroller} aria-live="polite">
          {visible.map((message) => (
            <div key={message.id} className={`ride-msg ${message.from === "bot" ? "bot" : "rider"}`}>
              <p>{message.text}</p>
              {message.ticket ? <TicketCard ticket={message.ticket} /> : null}
            </div>
          ))}
          {typing ? (
            <div className="ride-msg bot typing" aria-label="Stay Care is typing">
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
            placeholder={busy ? "Stay Care is replying…" : "Describe the problem"}
            aria-label="Message Stay Care"
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

      <TicketFile
        state={chat.committed}
        busy={busy}
        onReplay={() => chat.replay([...GOLDEN_CARE_TURNS, "Still not fixed", "It's fixed now", "4"])}
        onReset={chat.reset}
      />
    </div>
  );
}

function TicketCard({ ticket }: { ticket: CareTicket }) {
  return (
    <article className="plan-card ticket-card">
      <header>
        <span className="plan-kicker">Ticket · {ticket.code}</span>
        <h3>{CATEGORY_LABELS[ticket.category]}</h3>
      </header>
      <dl className="plan-facts">
        <div>
          <dt>Urgency</dt>
          <dd>
            <span className={`urgency ${ticket.urgency}`}>{URGENCY_LABELS[ticket.urgency]}</span>
          </dd>
        </div>
        <div>
          <dt>Response</dt>
          <dd>{ticket.respondWithin}</dd>
        </div>
        <div>
          <dt>Sent to</dt>
          <dd>Hotel {ticket.escalatedTo}</dd>
        </div>
        <div>
          <dt>Needs approval</dt>
          <dd>{ticket.approvalReason ? "Yes, stay desk" : "No"}</dd>
        </div>
      </dl>
      <p className="plan-foot">Hotel Liaison's message goes to the hotel once the desk approves it.</p>
    </article>
  );
}

type AgentStatus = "idle" | "working" | "done" | "pending" | "skipped";

function TicketFile({
  state,
  busy,
  onReplay,
  onReset,
}: {
  state: CareState;
  busy: boolean;
  onReplay: () => void;
  onReset: () => void;
}) {
  const { brief, ticket, status, rating } = state;
  const isSafety = brief.category === "safety";

  const statusLabel =
    status === "resolved"
      ? state.step === "closed"
        ? "Closed"
        : "Fixed"
      : status === "escalated"
        ? "Escalated"
        : isSafety && ticket
          ? "Safety · calling guest"
          : ticket
            ? "Open with hotel"
            : "Taking the details";
  const urgentPill = status === "escalated" || (isSafety && ticket !== null && status !== "resolved");

  const agents: { name: string; job: string; status: AgentStatus; note: string }[] = [
    {
      name: "Stay Care",
      job: "Talks to the guest",
      status: state.step === "closed" ? "done" : "working",
      note: state.step === "closed" ? "Checked back, case closed" : ticket ? "Checking back with the guest" : "Taking the details",
    },
    {
      name: "Issue Triage",
      job: "Category and urgency",
      status: ticket ? "done" : brief.category ? "working" : "idle",
      note: ticket ? `${CATEGORY_LABELS[ticket.category]} · ${URGENCY_LABELS[ticket.urgency]}` : brief.category ? CATEGORY_LABELS[brief.category] : "Waiting for the issue",
    },
    {
      name: "Hotel Liaison",
      job: "Raises it with the hotel",
      status: ticket ? "pending" : "idle",
      note: ticket ? `Message to ${ticket.escalatedTo}, awaiting desk approval` : "Waiting for the ticket",
    },
    {
      name: "Resolution Guard",
      job: "Room move, refund, credit",
      status: ticket?.approvalReason ? "done" : ticket ? "skipped" : "idle",
      note: ticket?.approvalReason ? "Flagged for the stay desk" : ticket ? "Nothing to approve" : "Waiting for the ask",
    },
  ];

  const rows: [string, string | null][] = [
    ["Issue", brief.category ? CATEGORY_LABELS[brief.category] : null],
    ["Hotel", brief.hotel],
    ["Room", brief.room],
    ["Front desk told", isSafety ? "Skipped for safety" : brief.frontDesk ? FRONT_DESK_LABELS[brief.frontDesk] : null],
    ["Guest asks", isSafety ? "A person to call now" : brief.ask ? ASK_LABELS[brief.ask] : null],
    ["Response clock", ticket?.respondWithin ?? null],
  ];

  const gateActive = status !== "resolved" && (Boolean(ticket?.approvalReason) || status === "escalated");

  return (
    <aside className="case-file" aria-label="Ticket the stay desk sees">
      <header className="case-file-head">
        <div>
          <p className="kicker accent">What the stay desk sees</p>
          <h2>{ticket?.code ?? "New in-stay issue"}</h2>
        </div>
        <span className={`status-pill${urgentPill ? " critical" : status === "resolved" ? " ok" : ""}`}>{statusLabel}</span>
      </header>

      <div className="case-actions">
        <button className="primary-button" type="button" onClick={onReplay} disabled={busy}>
          Replay {GOLDEN_TICKET}
        </button>
        <button className="ghost-button" type="button" onClick={onReset} disabled={busy}>
          Start over
        </button>
      </div>

      {brief.text ? (
        <section className="case-block">
          <h3>In the guest's words</h3>
          <blockquote className="guest-quote">{brief.text}</blockquote>
        </section>
      ) : null}

      <section className="case-block">
        <h3>Issue</h3>
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
        <h3>Agents on this ticket</h3>
        <ul className="agent-status">
          {agents.map((agent) => (
            <li key={agent.name} className={agent.status}>
              <i aria-hidden="true" />
              <span>
                <strong>{agent.name}</strong>
                <small>{agent.job}</small>
              </span>
              <em>{agent.note}</em>
            </li>
          ))}
        </ul>
      </section>

      <section className={`case-block gate${gateActive ? " active" : ""}`}>
        <h3>Human gate · Stay desk</h3>
        <p>
          {gateText(state)}
        </p>
      </section>

      {rating !== null ? (
        <section className="case-block">
          <h3>Guest rating</h3>
          <p>
            {rating} out of 5{rating <= 2 ? " · flagged for a stay desk follow-up with the hotel" : ""}
          </p>
        </section>
      ) : null}

      {ticket ? (
        <section className="case-block">
          <h3>Message to the hotel (draft)</h3>
          <pre className="ride-note">{ticket.hotelNote}</pre>
        </section>
      ) : null}
    </aside>
  );
}

function gateText({ status, ticket }: CareState): string {
  if (status === "resolved") {
    return "Resolved with the hotel. Nothing left to decide on this ticket.";
  }
  if (status === "escalated") {
    return "Escalated. Call the guest within 15 minutes and chase the hotel's duty manager.";
  }
  if (ticket?.approvalReason) {
    return `${ticket.approvalReason} Decide with the hotel, then Stay Care tells the guest.`;
  }
  if (ticket) {
    return "Nothing to approve. The hotel fixes it and Stay Care checks back.";
  }
  return "A room move, a refund or credit, a callback, or any safety issue comes here.";
}
