"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  experienceLabel,
  GOLDEN_PATH_TURNS,
  initialPlannerState,
  lengthLabel,
  respond,
  type PlannerState,
  type RidePlan,
} from "../../data/ride-planner";

const BOT_BEAT_MS = 650;
const RIDER_BEAT_MS = 900;

/**
 * Left: what the rider sees, a chat with CX Rider.
 * Right: what the desk sees, the case file the agents fill in as the chat goes.
 */
export function RidePlanner() {
  const [state, setState] = useState<PlannerState>(initialPlannerState);
  /** What the case file shows: updated once the chat has finished revealing a turn. */
  const [committed, setCommitted] = useState<PlannerState>(state);
  const [shown, setShown] = useState(state.messages.length);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const timers = useRef<number[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const revealing = shown < state.messages.length;
  const nextHidden = state.messages[shown];
  const visible = state.messages.slice(0, shown);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [shown]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  /**
   * Shows each new message in turn: rider turns at once, bot turns after a short typing beat.
   * The case file catches up when the turn ends. Returns when that happens, in ms from now.
   */
  const play = (from: number, to: PlannerState, startAt = 0, last = true): number => {
    let delay = startAt;
    for (let index = from; index < to.messages.length; index += 1) {
      delay += to.messages[index].from === "bot" ? BOT_BEAT_MS : index === from && startAt === 0 ? 0 : RIDER_BEAT_MS;
      const count = index + 1;
      timers.current.push(window.setTimeout(() => setShown(count), delay));
    }
    timers.current.push(
      window.setTimeout(() => {
        setCommitted(to);
        if (last) {
          setBusy(false);
        }
      }, delay),
    );
    return delay;
  };

  const send = (text: string) => {
    if (busy || !text.trim()) {
      return;
    }
    const next = respond(state, text);
    setBusy(true);
    setDraft("");
    setState(next);
    play(state.messages.length, next);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };

  const replayGoldenPath = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    const start = initialPlannerState();
    const turns = [...GOLDEN_PATH_TURNS, "Send to ride lead"];
    const states = turns.reduce<PlannerState[]>((list, turn) => [...list, respond(list[list.length - 1], turn)], [start]);
    setBusy(true);
    setState(states[states.length - 1]);
    setCommitted(start);
    setShown(start.messages.length);
    let at = 0;
    for (let index = 1; index < states.length; index += 1) {
      at = play(states[index - 1].messages.length, states[index], at, index === states.length - 1);
    }
  };

  const reset = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    const fresh = initialPlannerState();
    setState(fresh);
    setCommitted(fresh);
    setShown(fresh.messages.length);
    setBusy(false);
  };

  return (
    <div className="ride-desk">
      <section className="ride-chat" aria-label="Rider chat with CX Rider">
        <header className="ride-chat-head">
          <span className="ride-bot-avatar" aria-hidden="true">
            CX
          </span>
          <span className="ride-chat-title">
            <strong>CX Rider</strong>
            <small>
              <i aria-hidden="true" /> Pure Motorcycling community · online
            </small>
          </span>
          <span className="ride-chat-tag">What the rider sees</span>
        </header>

        <div className="ride-messages" ref={scroller} aria-live="polite">
          {visible.map((message) => (
            <div key={message.id} className={`ride-msg ${message.from}`}>
              <p>{message.text}</p>
              {message.plan ? <PlanCard plan={message.plan} /> : null}
            </div>
          ))}
          {revealing && nextHidden?.from === "bot" ? (
            <div className="ride-msg bot typing" aria-label="CX Rider is typing">
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
            placeholder={busy ? "CX Rider is replying…" : "Type a message"}
            aria-label="Message CX Rider"
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

      <CaseFile state={committed} onReplay={replayGoldenPath} onReset={reset} busy={busy} />
    </div>
  );
}

function PlanCard({ plan }: { plan: RidePlan }) {
  return (
    <article className="plan-card">
      <header>
        <span className="plan-kicker">Route Clerk draft · {plan.caseCode}</span>
        <h3>{plan.route?.name ?? "Route to be drafted"}</h3>
        {plan.route ? <p>{plan.route.vibe}</p> : null}
      </header>
      <dl className="plan-facts">
        <div>
          <dt>Meet</dt>
          <dd>{plan.startLabel}</dd>
        </div>
        <div>
          <dt>Flag-off</dt>
          <dd>{plan.flagOff}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{plan.lengthLabel}</dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{plan.totalKm ? `about ${plan.totalKm} km` : "To be drafted"}</dd>
        </div>
      </dl>
      {plan.route ? (
        <ol className="plan-legs">
          {plan.route.legs.map((leg) => (
            <li key={leg.day}>
              <b>Day {leg.day}</b>
              <span>
                {leg.from} → {leg.to} · about {leg.km} km · {leg.hours}
              </span>
              <small>{leg.stops.join(" · ")}</small>
            </li>
          ))}
        </ol>
      ) : null}
      {plan.crew ? (
        <p className="plan-crew">
          Crew: 1 lead, 1 sweep{plan.crew.marshals > 0 ? `, ${plan.crew.marshals} marshal${plan.crew.marshals > 1 ? "s" : ""}` : ""}
        </p>
      ) : null}
      {plan.warnings.length > 0 ? (
        <ul className="plan-warnings">
          {plan.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <p className="plan-foot">Approximate distances. Weather is not connected. No prices are quoted.</p>
    </article>
  );
}

type AgentStatus = "idle" | "working" | "done" | "pending" | "skipped";

function CaseFile({
  state,
  onReplay,
  onReset,
  busy,
}: {
  state: PlannerState;
  onReplay: () => void;
  onReset: () => void;
  busy: boolean;
}) {
  const { brief, plan, step, sentToLead, testRide } = state;
  const isTestRide = testRide !== null;
  const isGroup = brief.mode === "group";
  const briefDone = step === "plan" || step === "done";

  const status = isTestRide
    ? step === "testride_done"
      ? "Sent to dealer"
      : "Test-ride request"
    : sentToLead
      ? "With ride lead"
      : step === "done"
        ? "Saved"
        : briefDone
          ? "Draft ready"
          : "Taking the brief";

  const agents: { name: string; job: string; status: AgentStatus; note: string }[] = [
    {
      name: "CX Rider",
      job: "Talks to the rider",
      status: briefDone || step === "testride_done" ? "done" : "working",
      note: briefDone || step === "testride_done" ? "Brief complete" : "In conversation",
    },
    {
      name: "Route Clerk",
      job: "Drafts route, stops, distance",
      status: isTestRide ? "skipped" : plan ? (plan.route ? "done" : "pending") : "idle",
      note: isTestRide ? "Not needed" : plan ? (plan.route ? "Route drafted" : "No saved route, ride lead drafts") : "Waiting for the brief",
    },
    {
      name: "Group Ride Clerk",
      job: "Writes the iRide note",
      status: isTestRide || brief.mode === "solo" ? "skipped" : plan?.rideNote ? "done" : "idle",
      note: isTestRide || brief.mode === "solo" ? "Not needed" : plan?.rideNote ? "Note ready" : "Waiting for the route",
    },
    { name: "Weather Watch", job: "Flags conditions", status: "pending", note: "Not connected" },
    {
      name: "Dealer Handoff",
      job: "Test rides and service",
      status: isTestRide ? (step === "testride_done" ? "done" : "working") : "skipped",
      note: isTestRide ? (step === "testride_done" ? "Request sent to dealer" : "Collecting details") : "Not needed",
    },
  ];

  const briefRows: [string, string | null][] = isTestRide
    ? [
        ["Ask", "Test ride"],
        ["City", testRide.city],
        ["Motorcycle", testRide.bike],
      ]
    : [
        ["Ride", brief.mode ? (isGroup ? "Group ride event" : "Solo ride") : null],
        ["Start", brief.start],
        ["Length", brief.length ? lengthLabel(brief.length) : null],
        ...(brief.mode === "solo" ? [] : ([["Riders", brief.riders ? `Up to ${brief.riders}` : null]] as [string, string | null][])),
        ["Experience", brief.experience ? experienceLabel(brief.experience) : null],
        ["When", brief.when],
      ];

  return (
    <aside className="case-file" aria-label="Case file the desk sees">
      <header className="case-file-head">
        <div>
          <p className="kicker accent">What the desk sees</p>
          <h2>{plan?.caseCode ?? "New ride case"}</h2>
        </div>
        <span className="status-pill">{status}</span>
      </header>

      <div className="case-actions">
        <button className="primary-button" type="button" onClick={onReplay} disabled={busy}>
          Replay RD-0907 demo
        </button>
        <button className="ghost-button" type="button" onClick={onReset} disabled={busy}>
          Start over
        </button>
      </div>

      <section className="case-block">
        <h3>Ride brief</h3>
        <dl className="brief-rows">
          {briefRows.map(([label, value]) => (
            <div key={label} className={value ? "filled" : "empty"}>
              <dt>{label}</dt>
              <dd>{value ?? "Waiting"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="case-block">
        <h3>Agents on this case</h3>
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

      {!isTestRide && isGroup ? (
        <section className={`case-block gate${sentToLead ? " active" : ""}`}>
          <h3>Human gate · Ride lead</h3>
          <p>
            {sentToLead
              ? "Review requested. The ride lead checks the note, publishes on iRide, and shares the join link."
              : "Publishing on iRide waits for the ride lead. CX Rider never promises a slot."}
          </p>
        </section>
      ) : null}

      {plan && plan.warnings.length > 0 ? (
        <section className="case-block">
          <h3>Flags for the ride lead</h3>
          <ul className="case-flags">
            {plan.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {plan?.rideNote ? (
        <section className="case-block">
          <h3>iRide note draft</h3>
          <pre className="ride-note">{plan.rideNote}</pre>
        </section>
      ) : null}
    </aside>
  );
}
