"use client";

import Link from "next/link";
import { useState } from "react";
import { PROCESSES } from "../../data/book";
import { AUTONOMY_LABELS, type AgentCard, type ProcessModule } from "../../data/types";
import { WORKFLOWS } from "../../data/workflows";

type WorkforceFilter = "all" | "talk" | "work";

interface Worker {
  agent: AgentCard;
  modules: ProcessModule[];
  workflows: number;
}

/** One roster of every agent in the suite. The same bot on several stages appears once. */
function buildRoster(): Worker[] {
  const byName = new Map<string, Worker>();
  for (const processModule of PROCESSES) {
    for (const agent of processModule.agents) {
      const existing = byName.get(agent.name);
      if (existing) {
        existing.modules.push(processModule);
      } else {
        byName.set(agent.name, { agent, modules: [processModule], workflows: 0 });
      }
    }
  }
  for (const worker of byName.values()) {
    // "Ravi · pre-tour" in a workflow is the Ravi that serves that workflow's process, not every Ravi.
    const firstName = worker.agent.name.split(" · ")[0];
    const moduleIds = new Set(worker.modules.map((processModule) => processModule.id));
    worker.workflows = WORKFLOWS.filter((workflow) =>
      workflow.nodes.some(
        (node) =>
          node.label === worker.agent.name ||
          (moduleIds.has(workflow.processId) && node.label.split(" · ")[0] === firstName),
      ),
    ).length;
  }
  return Array.from(byName.values());
}

const ROSTER = buildRoster();

export function DigitalWorkersPage() {
  const [filter, setFilter] = useState<WorkforceFilter>("all");
  const talkers = ROSTER.filter((worker) => worker.agent.kind === "conversational");
  const doers = ROSTER.filter((worker) => worker.agent.kind !== "conversational");
  const voice = talkers.filter((worker) => worker.agent.channels.includes("Voice")).length;

  return (
    <main className="page">
      <header className="page-header">
        <p className="kicker">Automation</p>
        <h1>Digital workers</h1>
        <p className="lede">
          Voice and chat agents talk to travellers. Worker agents do the system work behind them. Workflows chain them
          together, and each one only goes as far as its autonomy level allows.
        </p>
      </header>

      <section className="kpi-grid" aria-label="Workforce figures">
        <article className="kpi">
          <span>Digital workers</span>
          <strong>{ROSTER.length}</strong>
          <small>across {PROCESSES.length} processes</small>
        </article>
        <article className="kpi">
          <span>Talk to people</span>
          <strong>{talkers.length}</strong>
          <small>{voice} on voice calls</small>
        </article>
        <article className="kpi">
          <span>Do the work</span>
          <strong>{doers.length}</strong>
          <small>systems, documents, rules</small>
        </article>
        <article className="kpi">
          <span>Workflows</span>
          <strong>{WORKFLOWS.length}</strong>
          <small>
            <Link href="/workflows">See every workflow</Link>
          </small>
        </article>
      </section>

      <div className="segmented" role="tablist" aria-label="Filter workers">
        <button type="button" role="tab" aria-selected={filter === "all"} onClick={() => setFilter("all")}>
          All <b>{ROSTER.length}</b>
        </button>
        <button type="button" role="tab" aria-selected={filter === "talk"} onClick={() => setFilter("talk")}>
          Voice and chat agents <b>{talkers.length}</b>
        </button>
        <button type="button" role="tab" aria-selected={filter === "work"} onClick={() => setFilter("work")}>
          Worker agents <b>{doers.length}</b>
        </button>
      </div>

      {filter !== "work" ? <RosterSection title="Voice and chat agents" text="They start or continue the conversation." workers={talkers} /> : null}
      {filter !== "talk" ? <RosterSection title="Worker agents" text="They read, check, draft, and update systems. They never hold the conversation." workers={doers} /> : null}
    </main>
  );
}

function RosterSection({ title, text, workers }: { title: string; text: string; workers: Worker[] }) {
  return (
    <section className="section">
      <div className="group-head">
        <h2>{title}</h2>
        <p className="meta">{text}</p>
      </div>
      <div className="card table-wrap">
        <table className="roster">
          <thead>
            <tr>
              <th>Worker</th>
              <th>Channels</th>
              <th>Autonomy</th>
              <th>Processes</th>
              <th>Workflows</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(({ agent, modules, workflows }) => (
              <tr key={agent.name}>
                <td>
                  <span className="roster-name">
                    <span className="agent-avatar small" aria-hidden="true">
                      {agent.name
                        .split(/[\s·]+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <span>
                      <strong>{agent.name}</strong>
                      <small>{agent.role}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="agent-chips">
                    {agent.channels.map((channel) => (
                      <span className="chip channel" key={channel}>
                        {channel}
                      </span>
                    ))}
                  </span>
                </td>
                <td>
                  <span className={`autonomy-badge ${agent.autonomy}`}>{AUTONOMY_LABELS[agent.autonomy]}</span>
                </td>
                <td>
                  {modules.map((processModule, index) => (
                    <span key={processModule.id}>
                      {index > 0 ? ", " : ""}
                      <Link href={`/${processModule.id}/squad`}>{processModule.menuLabel}</Link>
                    </span>
                  ))}
                </td>
                <td>{workflows > 0 ? workflows : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
