"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { KpiGrid } from "../../components/ui/FactLists";
import {
  DEMO_JUDGEMENTS,
  DEMO_QC_CASE_CODE,
  SCORECARD,
  SECTION_LABELS,
  summarizeDemoScore,
  type ScoreSection,
} from "../../data/forex-scorecard";
import type { QueueCase } from "../../data/types";

/** A call scores below this share of its form's weight and goes to the Quality lead. */
const PASS_BAR = 80;
const STORAGE_KEY = "vts.audit.source";

type SourceId = "dialer" | "contact" | "storage" | "upload";

const SOURCES: { id: SourceId; name: string; detail: string; button: string; note: string }[] = [
  {
    id: "dialer",
    name: "Cloud dialer",
    detail: "Exotel, Ozonetel, Knowlarity, Tata Tele",
    button: "Connect dialer",
    note: "Read-only API access. Recordings and call details only.",
  },
  {
    id: "contact",
    name: "Contact centre",
    detail: "Genesys, Amazon Connect, Avaya, Five9",
    button: "Connect contact centre",
    note: "Read-only access to call recordings and agent details.",
  },
  {
    id: "storage",
    name: "Recording storage",
    detail: "S3, Azure Blob, Google Drive, or an SFTP folder",
    button: "Connect storage",
    note: "Read-only. New files in the folder are picked up as they land.",
  },
  {
    id: "upload",
    name: "Upload calls",
    detail: "MP3 or WAV files for a one-off audit",
    button: "Upload recordings",
    note: "Files are scored once. Nothing keeps syncing.",
  },
];

interface AuditLine {
  id: string;
  line: string;
  calls: string;
  form: string;
  audited: number;
  avgScore: number;
  belowBar: number;
}

/** Which call lines are audited, on which form, and how the last seven days scored. */
const AUDIT_LINES: AuditLine[] = [
  { id: "forex", line: "Forex sales", calls: "Inbound and outbound DFC calls", form: `${SCORECARD.length}-point sheet`, audited: 52, avgScore: 78, belowBar: 5 },
  { id: "holiday", line: "Holiday sales", calls: "Holiday expert quote calls", form: "Holiday quote-call sheet", audited: 14, avgScore: 86, belowBar: 1 },
  { id: "corporate", line: "Corporate desk", calls: "Counsellor calls with travellers and EAs", form: "Corporate desk sheet", audited: 11, avgScore: 91, belowBar: 1 },
  { id: "care", line: "Tour care", calls: "Representative callbacks on domestic tours", form: "Tour care sheet", audited: 7, avgScore: 88, belowBar: 0 },
];

const CASE_SCORES: Record<string, number> = { "AU-2044": 68, "AU-2046": 88, "AU-2049": 86 };

const STEPS = [
  { title: "Connect", text: "Point the desk at wherever your calls are recorded. Read-only." },
  { title: "Pull", text: "Every recording is picked up and grouped by opportunity. No sampling." },
  { title: "Score", text: "Each call is transcribed and scored on its line's form, with a quote for every row." },
  { title: "Review", text: "Only calls below the bar reach the Quality lead, with a drafted coaching note." },
];

interface Connection {
  source: SourceId;
  lines: string[];
}

function readConnection(): Connection | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Connection) : null;
    return parsed && SOURCES.some((source) => source.id === parsed.source) && Array.isArray(parsed.lines) ? parsed : null;
  } catch {
    return null;
  }
}

function writeConnection(connection: Connection | null) {
  try {
    if (connection) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not persisted; the connection holds for this visit.
  }
}

export function AuditQueue({ cases }: { cases: QueueCase[] }) {
  const [isReady, setIsReady] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [syncing, setSyncing] = useState<Connection | null>(null);

  useEffect(() => {
    setConnection(readConnection());
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  if (syncing) {
    return (
      <SyncPanel
        connection={syncing}
        onDone={() => {
          writeConnection(syncing);
          setConnection(syncing);
          setSyncing(null);
        }}
      />
    );
  }

  if (!connection) {
    return <ConnectCalls onConnect={setSyncing} />;
  }

  return (
    <AuditWorkspace
      connection={connection}
      cases={cases}
      onDisconnect={() => {
        writeConnection(null);
        setConnection(null);
      }}
    />
  );
}

/* ───────────── Before: connect the call source ───────────── */

function ConnectCalls({ onConnect }: { onConnect: (connection: Connection) => void }) {
  const [source, setSource] = useState<SourceId>("dialer");
  const [lines, setLines] = useState<string[]>(AUDIT_LINES.map((line) => line.id));
  const chosen = SOURCES.find((item) => item.id === source) ?? SOURCES[0];

  const toggleLine = (id: string) =>
    setLines((current) => (current.includes(id) ? current.filter((line) => line !== id) : [...current, id]));

  return (
    <section className="card connect-panel au-connect">
      <div>
        <p className="kicker">Call source</p>
        <h2>Connect where your calls are recorded</h2>
        <p className="lede">
          Wherever your counsellors' calls land, the desk pulls every recording, scores it on that line's form, and shows you only
          the calls that need a person.
        </p>
      </div>

      <div className="mx-providers au-sources" role="radiogroup" aria-label="Call source">
        {SOURCES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={source === item.id}
            className="mx-provider"
            onClick={() => setSource(item.id)}
          >
            <SourceMark source={item.id} />
            <span>
              <strong>{item.name}</strong>
              <small>{item.detail}</small>
            </span>
          </button>
        ))}
      </div>

      <fieldset className="au-line-picker">
        <legend>Lines to audit</legend>
        {AUDIT_LINES.map((line) => (
          <label key={line.id} className={lines.includes(line.id) ? "on" : undefined}>
            <input type="checkbox" checked={lines.includes(line.id)} onChange={() => toggleLine(line.id)} />
            <span>
              <strong>{line.line}</strong>
              <small>{line.form}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <ol className="how-it-works">
        {STEPS.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>

      <div className="connect-actions">
        <button
          className="primary-button au-connect-button"
          type="button"
          disabled={lines.length === 0}
          onClick={() => onConnect({ source, lines })}
        >
          <SourceGlyph source={source} /> {chosen.button}
        </button>
        <span className="meta">{lines.length === 0 ? "Pick at least one line to audit." : chosen.note}</span>
      </div>
    </section>
  );
}

/* ───────────── During: first sync ───────────── */

function SyncPanel({ connection, onDone }: { connection: Connection; onDone: () => void }) {
  const source = SOURCES.find((item) => item.id === connection.source) ?? SOURCES[0];
  const lines = AUDIT_LINES.filter((line) => connection.lines.includes(line.id));
  const calls = lines.reduce((sum, line) => sum + line.audited, 0);
  const below = lines.reduce((sum, line) => sum + line.belowBar, 0);
  const steps = [
    `Connected to ${source.name.toLowerCase()}`,
    `${calls} recordings found from the last 7 days`,
    "Transcribed in Hindi, English, and Hinglish",
    `Scored on ${lines.length === 1 ? "the line's form" : `${lines.length} line forms`}`,
    `${below} ${below === 1 ? "call" : "calls"} below the bar sent to review`,
  ];
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= steps.length) {
      const timer = window.setTimeout(onDone, 450);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setDone((count) => count + 1), 520);
    return () => window.clearTimeout(timer);
  }, [done, steps.length, onDone]);

  return (
    <section className="card au-sync" aria-live="polite">
      <SourceMark source={connection.source} />
      <div>
        <p className="kicker">First sync</p>
        <h2>Pulling your calls</h2>
        <ol>
          {steps.map((step, index) => (
            <li key={step} className={index < done ? "done" : index === done ? "active" : undefined}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── After: the audit workspace ───────────── */

function lineOf(queueCase: QueueCase): AuditLine | undefined {
  return AUDIT_LINES.find((line) => queueCase.title.toLowerCase().startsWith(line.line.toLowerCase()));
}

function AuditWorkspace({ connection, cases, onDisconnect }: { connection: Connection; cases: QueueCase[]; onDisconnect: () => void }) {
  const source = SOURCES.find((item) => item.id === connection.source) ?? SOURCES[0];
  const lines = AUDIT_LINES.filter((line) => connection.lines.includes(line.id));
  const summary = summarizeDemoScore(SCORECARD, DEMO_JUDGEMENTS);
  const featuredScore = Math.round((summary.earnedWeight / summary.judgedWeight) * 100);
  const scoreOf = (code: string) => (code === DEMO_QC_CASE_CODE ? featuredScore : CASE_SCORES[code]);
  const queue = cases.filter((queueCase) => {
    const line = lineOf(queueCase);
    return !line || connection.lines.includes(line.id);
  });
  const showFeatured = connection.lines.includes("forex");

  const audited = lines.reduce((sum, line) => sum + line.audited, 0);
  const below = lines.reduce((sum, line) => sum + line.belowBar, 0);
  const average = audited > 0 ? Math.round(lines.reduce((sum, line) => sum + line.avgScore * line.audited, 0) / audited) : 0;

  return (
    <div className="au-workspace">
      <div className="au-source-bar">
        <SourceMark source={connection.source} />
        <p>
          <strong>{source.name}</strong>
          <span className="au-live">
            <i aria-hidden="true" /> Connected
          </span>
          <small>
            {audited} calls pulled · {lines.length} {lines.length === 1 ? "line" : "lines"} audited · synced just now
          </small>
        </p>
        <button className="ghost-button" type="button" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>

      <KpiGrid
        kpis={[
          { id: "audited", label: "Calls audited · 7 days", value: String(audited), delta: "every recorded call" },
          { id: "coverage", label: "Coverage", value: "100%", delta: "was ~5% by hand" },
          { id: "average", label: "Average score", value: `${average}%`, delta: `bar is ${PASS_BAR}%` },
          { id: "below", label: "Below the bar", value: String(below), delta: "with the Quality lead" },
        ]}
      />

      <section className="section">
        <div className="group-head">
          <h2>Lines</h2>
          <p className="meta">Each line is scored on its own form.</p>
        </div>
        <div className="au-lines">
          {lines.map((line) => (
            <article key={line.id} className="card au-line">
              <header>
                <h3>{line.line}</h3>
                <span className="status-pill ok">Live</span>
              </header>
              <p className="meta">{line.calls}</p>
              <div className="au-line-score">
                <strong className={line.avgScore < PASS_BAR ? "low" : undefined}>{line.avgScore}%</strong>
                <span>average</span>
              </div>
              <ScoreBar value={line.avgScore} />
              <dl>
                <div>
                  <dt>Audited</dt>
                  <dd>{line.audited}</dd>
                </div>
                <div>
                  <dt>Below bar</dt>
                  <dd className={line.belowBar > 0 ? "low" : undefined}>{line.belowBar}</dd>
                </div>
                <div>
                  <dt>Form</dt>
                  <dd>{line.form}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="group-head">
          <h2>Audit queue</h2>
          <p className="meta">Lowest score first. Anything under {PASS_BAR}% waits for the Quality lead.</p>
        </div>
        <div className="card table-wrap au-queue">
          <table>
            <thead>
              <tr>
                <th>Case</th>
                <th>Call</th>
                <th>Score</th>
                <th>Status</th>
                <th>Next</th>
              </tr>
            </thead>
            <tbody>
              {[...queue]
                .sort((a, b) => (scoreOf(a.code) ?? 100) - (scoreOf(b.code) ?? 100))
                .map((queueCase) => {
                  const score = scoreOf(queueCase.code);
                  const isLow = score !== undefined && score < PASS_BAR;
                  return (
                    <tr key={queueCase.code} className={isLow ? "low" : undefined}>
                      <td className="case-cell">{queueCase.code}</td>
                      <td>
                        {queueCase.title}
                        <small>{queueCase.owner}</small>
                      </td>
                      <td className="au-score-cell">
                        {score !== undefined ? (
                          <>
                            <b className={isLow ? "low" : undefined}>{score}%</b>
                            <ScoreBar value={score} />
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className={isLow ? "status-pill critical" : "status-pill ok"}>{queueCase.status}</span>
                      </td>
                      <td>{queueCase.next}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {showFeatured ? <ScorecardDetail score={featuredScore} /> : null}
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  return (
    <span className="au-bar" aria-hidden="true">
      <span className={value < PASS_BAR ? "low" : undefined} style={{ width: `${value}%` }} />
      <i style={{ left: `${PASS_BAR}%` }} />
    </span>
  );
}

/** The latest call below the bar, row by row, with the evidence behind every verdict. */
function ScorecardDetail({ score }: { score: number }) {
  const [noteSent, setNoteSent] = useState(false);
  const rows = useMemo(
    () =>
      DEMO_JUDGEMENTS.map((judgement) => ({
        judgement,
        parameter: SCORECARD.find((parameter) => parameter.id === judgement.parameterId),
      })).filter((row) => row.parameter),
    [],
  );
  const failed = rows.filter((row) => row.judgement.result === "fail");
  const passed = rows.filter((row) => row.judgement.result === "pass");
  const sections = (Object.keys(SECTION_LABELS) as ScoreSection[])
    .map((section) => {
      const inSection = rows.filter((row) => row.parameter?.section === section);
      const total = inSection.reduce((sum, row) => sum + (row.parameter?.weight ?? 0), 0);
      const earned = inSection.filter((row) => row.judgement.result === "pass").reduce((sum, row) => sum + (row.parameter?.weight ?? 0), 0);
      return { section, total, earned };
    })
    .filter((row) => row.total > 0);

  return (
    <section className="section">
      <div className="group-head">
        <h2>Latest below the bar</h2>
        <p className="meta">{DEMO_QC_CASE_CODE} · Forex sales · first call · counsellor A</p>
      </div>
      <div className="card au-scorecard">
        <aside>
          <div className="au-ring" style={{ background: `conic-gradient(var(--critical) ${score * 3.6}deg, var(--muted-bg) 0)` }}>
            <span>
              <strong>{score}%</strong>
              <small>bar {PASS_BAR}%</small>
            </span>
          </div>
          <p className="au-tally">
            <span className="pass">{passed.length} passed</span>
            <span className="fail">{failed.length} failed</span>
          </p>
          <ul className="au-sections">
            {sections.map((row) => (
              <li key={row.section}>
                <span>
                  {SECTION_LABELS[row.section]}
                  <b>
                    {row.earned}/{row.total}
                  </b>
                </span>
                <ScoreBar value={Math.round((row.earned / row.total) * 100)} />
              </li>
            ))}
          </ul>
          <button
            className={noteSent ? "ghost-button au-note sent" : "primary-button au-note"}
            type="button"
            disabled={noteSent}
            onClick={() => setNoteSent(true)}
          >
            {noteSent ? "Coaching note sent to team lead" : "Send coaching note"}
          </button>
        </aside>
        <ol className="au-rows">
          {[...failed, ...passed].map(({ judgement, parameter }) => (
            <li key={judgement.parameterId} className={judgement.result}>
              <span className="au-verdict">{judgement.result === "pass" ? "Pass" : judgement.result === "fail" ? "Fail" : "Needs evidence"}</span>
              <div>
                <strong>
                  {parameter?.text}
                  <small>
                    #{parameter?.id} · {parameter ? SECTION_LABELS[parameter.section] : ""} · weight {parameter?.weight}
                  </small>
                </strong>
                <p>{judgement.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── Marks ───────────── */

function SourceGlyph({ source }: { source: SourceId }) {
  const paths: Record<SourceId, ReactNode> = {
    dialer: (
      <path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.2 2 2 0 0 1 4.1 1h2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.1 8.5a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
    ),
    contact: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
        <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
        <path d="M19.5 19a3 3 0 0 1-3 3H13" />
      </>
    ),
    storage: (
      <>
        <ellipse cx="12" cy="5.5" rx="8" ry="3" />
        <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" />
        <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </>
    ),
  };
  return (
    <svg className="au-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[source]}
    </svg>
  );
}

function SourceMark({ source }: { source: SourceId }) {
  return (
    <span className={`au-mark ${source}`} aria-hidden="true">
      <SourceGlyph source={source} />
    </span>
  );
}
