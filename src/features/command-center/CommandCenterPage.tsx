import Link from "next/link";
import { homeTodos, PROCESSES } from "../../data/book";
import { domesticMorningLine } from "../../data/domestic-tours";
import { bookWeek, CONNECTIONS, homeTotals, processScores, rankedAlerts } from "../../data/home-dashboard";
import { MINUTES_SAVED_PER_RUN } from "../../data/workflows";
import { BOOK_AS_OF_LABEL } from "../../lib/suite-config";
import { ProcessMixBars, WeekColumns } from "../../components/ui/Charts";
import { AlertList, KpiGrid, TodoList } from "../../components/ui/FactLists";
import type { Kpi } from "../../data/types";

function homeKpis(): Kpi[] {
  const totals = homeTotals();
  const live = CONNECTIONS.filter((connection) => connection.status === "live").length;
  return [
    { id: "handled", label: "Handled this week", value: totals.handled.toLocaleString("en-IN"), delta: `${totals.human.toLocaleString("en-IN")} needed a person` },
    { id: "auto", label: "Closed by agents", value: `${totals.autoRate}%`, delta: "no person touched them" },
    { id: "hours", label: "Desk hours saved", value: `${totals.hoursSaved} h`, delta: `at ${MINUTES_SAVED_PER_RUN} min per automated run` },
    { id: "urgent", label: "Urgent now", value: String(totals.critical), delta: `${totals.warning} more warnings` },
    { id: "gates", label: "Waiting on a person", value: String(totals.todos), delta: `across ${PROCESSES.length} processes` },
    { id: "flows", label: "Workflows running", value: `${totals.workflowsRunning} of ${totals.workflowsTotal}`, delta: `${totals.workflowRuns} runs this week` },
    { id: "voice", label: "Voice calls by workflows", value: totals.voiceCalls.toLocaleString("en-IN"), delta: "placed by voice agents" },
    { id: "connections", label: "Systems connected", value: `${live} of ${CONNECTIONS.length}`, delta: "all reporting normally" },
  ];
}

const ROLE_VIEWS = [
  { href: "/corporate", title: "Corporate desk", audience: "Counsellor and EA", detail: "Email fleet, policy, quotation drafts." },
  { href: "/forex", title: "Forex", audience: "DFC sales and branches", detail: "Enquiry bot, Ravi to a live quote, optional advance, branch KYC." },
  { href: "/audit", title: "Call audit", audience: "Quality", detail: "Every recorded call transcribed and scored, not a hand-picked sample." },
  { href: "/during", title: "Domestic tours", audience: "Domestic holidays", detail: "Pre-tour, in-tour, and last-day calls. Two Ravi bots, tours read from live bookings." },
  { href: "/planner", title: "Holiday sales", audience: "Holiday experts", detail: "Trip chats, plans with photos and budgets, and callbacks to quote." },
  { href: "/hotels", title: "Stays", audience: "Stay desk", detail: "Hotel shortlists, holds, and in-stay problems." },
  { href: "/workflows", title: "Automation", audience: "Ops and CXO", detail: "Every workflow: voice calls, worker agents, and where a person decides." },
];

function CardArrow() {
  return (
    <svg className="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CommandCenterPage() {
  const totals = homeTotals();
  const scores = processScores();
  const urgent = rankedAlerts().filter(({ alert }) => alert.severity !== "info");
  const alerts = urgent.slice(0, 6).map(({ processId, alert }) => ({ href: `/${processId}/queue`, alert }));
  const todos = homeTodos().map(({ processId, todo, rank }) => ({ href: `/${processId}/queue`, todo, rank }));
  const mixRows = scores
    .filter((score) => score.handled !== null)
    .map((score) => ({ label: score.name, auto: (score.handled ?? 0) - (score.human ?? 0), human: score.human ?? 0 }));

  return (
    <main className="page">
      <header className="page-header">
        <p className="kicker">Command Center</p>
        <h1>
          Vibrium <span className="gradient-text">Travel Suite</span>
        </h1>
        <p className="lede">
          How the whole book is performing, what needs you now, and what the agents already handled.
        </p>
      </header>

      <KpiGrid kpis={homeKpis()} />

      <section className="section">
        <div className="section-head">
          <h2>Needs you now</h2>
          <span className="severity-summary" aria-label="Alerts by severity">
            <span className="severity critical">{totals.critical} critical</span>
            <span className="severity warning">{totals.warning} warning</span>
            <span className="severity info">{totals.info} info</span>
          </span>
        </div>
        <div className="split">
          <div>
            <AlertList items={alerts} />
            {urgent.length > alerts.length ? <p className="meta">Showing {alerts.length} of {urgent.length}. The rest are on each process page.</p> : null}
          </div>
          <div>
            <h3 className="subhead">Today's to-dos</h3>
            <TodoList items={todos} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>How the book is performing</h2>
          <span className="meta">{BOOK_AS_OF_LABEL} · processes with volume</span>
        </div>
        <div className="chart-grid">
          <WeekColumns title="Everything handled, last 7 days" week={bookWeek()} />
          <ProcessMixBars title="Where the work happens" rows={mixRows} />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Process scorecard</h2>
          <span className="meta">Domestic calls are a voice proof of concept, so they have no volume yet</span>
        </div>
        <div className="card table-wrap">
          <table className="scorecard">
            <thead>
              <tr>
                <th>Process</th>
                <th>Open now</th>
                <th>Handled (7d)</th>
                <th>Closed by agents</th>
                <th>Urgent</th>
                <th>To-dos</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score.id}>
                  <td>
                    <Link href={`/${score.id}`} className="scorecard-name">
                      {score.name}
                      <small>{score.group}</small>
                    </Link>
                  </td>
                  <td>{score.open ?? "—"}</td>
                  <td>{score.handled?.toLocaleString("en-IN") ?? "—"}</td>
                  <td>
                    {score.autoRate !== null ? (
                      <span className="rate">
                        <span className="rate-track" aria-hidden="true">
                          <i style={{ width: `${score.autoRate}%` }} />
                        </span>
                        {score.autoRate}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {score.critical + score.warning > 0 ? (
                      <span className={`severity ${score.critical > 0 ? "critical" : "warning"}`}>
                        {score.critical > 0 ? `${score.critical} critical` : `${score.warning} warning`}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{score.todos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section split even">
        <div className="card health-card">
          <div className="section-head">
            <h2>Automation health</h2>
            <Link className="meta" href="/workflows">See every workflow</Link>
          </div>
          <dl className="health-rows">
            <div><dt>Workflows running</dt><dd>{totals.workflowsRunning} of {totals.workflowsTotal}</dd></div>
            <div><dt>Runs this week</dt><dd>{totals.workflowRuns}</dd></div>
            <div><dt>Voice calls placed</dt><dd>{totals.voiceCalls.toLocaleString("en-IN")}</dd></div>
            <div><dt>Still in draft</dt><dd>{totals.workflowsTotal - totals.workflowsRunning}</dd></div>
          </dl>
        </div>
        <div className="card health-card">
          <div className="section-head">
            <h2>Connected systems</h2>
            <span className="meta">All {CONNECTIONS.length} connected</span>
          </div>
          <ul className="connections">
            {CONNECTIONS.map((connection) => (
              <li key={connection.label} className={`conn ${connection.status === "live" ? "is-live" : "is-pending"}`}>
                <i aria-hidden="true" />
                <span>
                  <strong>{connection.label}</strong>
                  <small>{connection.unlocks}</small>
                </span>
                <em>{connection.status === "live" ? "Connected" : "Pending"}</em>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card brief section">
        <div className="brief-head">
          <h2>Executive morning brief</h2>
          <span className="meta">{BOOK_AS_OF_LABEL} · all processes</span>
        </div>
        <p>
          Corporate: 36 open threads. Ananya Mehta’s DEL–BOM quote is a draft. Vikram Sharma’s mail has no date, so search stayed off. Eight FYI threads were suppressed.
        </p>
        <p>
          Forex: 31 enquiries; the bot answered 14 and 11 went on to Ravi. FX-1880 has a live-rate quote ready for approval. FX-1902 paid an advance and is booked for KYC at Andheri.
        </p>
        <p>
          Call audit: forex sales calls are scored on the 31-point form. AU-2041 is scored and sits below the bar on the opening and the card pitch.
        </p>
        <p>
          Domestic: {domesticMorningLine()} No domestic call is due today. The Kashmir pre-departure workflow is live.
        </p>
        <p>
          Airlines AR-7721 is a schedule change waiting on release. Hotel HT-2204 is a shortlist ready to send, and HT-C-3107 is a dead AC past its clock. Trip HL-2611, a Bali honeymoon, is waiting on its expert callback.
        </p>
      </section>

      <section className="section">
        <h2>Role views</h2>
        <div className="role-grid">
          {ROLE_VIEWS.map((view) => (
            <Link className="role-card" key={view.href} href={view.href}>
              <h3>{view.title}<CardArrow /></h3>
              <p className="meta">{view.audience}</p>
              <p>{view.detail}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Process navigator</h2>
        <div className="process-grid">
          {PROCESSES.map((processModule) => (
            <Link className="process-card" key={processModule.id} href={`/${processModule.id}`}>
              <span className="kicker accent">{processModule.group}</span>
              <h3>{processModule.name}<CardArrow /></h3>
              <p>{processModule.oneLiner}</p>
              <div className="chips">
                {processModule.roles.map((role) => (
                  <span className="chip" key={role}>{role}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
