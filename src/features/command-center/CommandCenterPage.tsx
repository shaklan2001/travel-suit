import Link from "next/link";
import { homeAlerts, homeTodos, PROCESSES } from "../../data/book";
import { countDueOn, domesticMorningLine } from "../../data/domestic-tours";
import { BOOK_AS_OF_LABEL } from "../../lib/suite-config";
import { AlertList, KpiGrid, TodoList } from "../../components/ui/FactLists";

const HOME_KPIS = [
  { id: "threads", label: "Open desk threads", value: "36", delta: "+4 today" },
  { id: "qc", label: "QC reviews", value: "12", delta: "CRM rows pending" },
  { id: "domestic", label: "Domestic calls today", value: String(countDueOn("pre_tour") + countDueOn("in_tour") + countDueOn("completion")), delta: "long tours are not on day 2" },
  { id: "hotels", label: "Hotel shortlists", value: "5", delta: "availability pending" },
  { id: "rides", label: "Ride plans", value: "7", delta: "1 unpublished" },
  { id: "hitl", label: "Human gates", value: "6", delta: "across the book" },
  { id: "fyi", label: "FYI suppressed", value: "8", delta: "no auto-reply" },
  { id: "integrations", label: "Live connections", value: "0", delta: "rates and CRM pending" },
];

const ROLE_VIEWS = [
  { href: "/corporate", title: "Corporate desk", audience: "Counsellor and EA", detail: "Email fleet, policy, quotation drafts." },
  { href: "/forex", title: "Forex", audience: "Quality and DFC", detail: "QC scorecard and Forex Ravi, without a stored rate." },
  { href: "/during", title: "Domestic tours", audience: "Domestic holidays", detail: "Pre-tour, in-tour, and last-day calls. Two Ravi bots, no Raahi feed." },
  { href: "/hotels", title: "Stay and ride", audience: "Product desk", detail: "Hotel shortlists and unpublished ride notes." },
];

function CardArrow() {
  return (
    <svg className="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CommandCenterPage() {
  const alerts = homeAlerts().map(({ processId, alert }) => ({
    href: `/${processId}/queue`,
    alert,
  }));
  const todos = homeTodos().map(({ processId, todo, rank }) => ({
    href: `/${processId}/queue`,
    todo,
    rank,
  }));

  return (
    <main className="page">
      <header className="page-header">
        <p className="kicker">Command Center</p>
        <h1>
          Vibrium <span className="gradient-text">Travel Suite</span>
        </h1>
        <p className="lede">
          Cross-process desk for the book — corporate email, forex, care before and after the trip, airlines, hotels, and ride planning.
        </p>
      </header>
      <KpiGrid kpis={HOME_KPIS} />
      <section className="card brief">
        <div className="brief-head">
          <h2>Executive morning brief</h2>
          <span className="meta">{BOOK_AS_OF_LABEL} · all processes</span>
        </div>
        <p>
          Corporate: 36 open threads. Ananya Mehta’s DEL–BOM quote is a draft. Vikram Sharma’s mail has no date, so search stayed off. Eight FYI threads were suppressed.
        </p>
        <p>
          Forex: 12 QC reviews. FX-DEMO-2041 has audio rows only — CRM evidence is pending, so there is no score out of 100. Forex Ravi will not quote until a live rate source answers.
        </p>
        <p>
          Domestic: {domesticMorningLine()} No domestic call is due today. The Kashmir workflow is still an unsaved draft.
        </p>
        <p>
          Airlines AR-7721 is a schedule change waiting on release. Hotel HT-2204 is a shortlist, not a live search. Ride RD-0907 is drafted and not published to iRide.
        </p>
      </section>
      <section className="section">
        <div className="section-head">
          <h2>Cross-process priority</h2>
          <span className="meta">{alerts.length} alerts · {todos.length} todos</span>
        </div>
        <div className="split">
          <AlertList items={alerts} />
          <TodoList items={todos} />
        </div>
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
