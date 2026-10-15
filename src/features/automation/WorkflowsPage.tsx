"use client";

import Link from "next/link";
import { useState } from "react";
import { PROCESSES } from "../../data/book";
import {
  MINUTES_SAVED_PER_RUN,
  NODE_LABELS,
  STATUS_LABELS,
  WORKFLOWS,
  type FlowNodeKind,
  type Workflow,
} from "../../data/workflows";

const LEGEND: FlowNodeKind[] = ["trigger", "voice", "chat", "worker", "message", "wait", "condition", "human"];

/** Every automation in the suite: what starts it, which agents carry it, and where a person decides. */
export function WorkflowsPage() {
  const [processId, setProcessId] = useState<string>("all");
  const visible = WORKFLOWS.filter((workflow) => processId === "all" || workflow.processId === processId);
  const modulesWithFlows = PROCESSES.filter((processModule) => WORKFLOWS.some((workflow) => workflow.processId === processModule.id));

  const runs = WORKFLOWS.reduce((sum, workflow) => sum + workflow.runsThisWeek, 0);
  const autoRuns = WORKFLOWS.reduce((sum, workflow) => sum + Math.round((workflow.runsThisWeek * workflow.autoRate) / 100), 0);
  const voiceSteps = WORKFLOWS.reduce(
    (sum, workflow) => sum + workflow.runsThisWeek * workflow.nodes.filter((node) => node.kind === "voice").length,
    0,
  );
  const live = WORKFLOWS.filter((workflow) => workflow.status !== "draft").length;

  return (
    <main className="page">
      <header className="page-header">
        <p className="kicker">Automation</p>
        <h1>Workflows</h1>
        <p className="lede">
          Each workflow starts on a trigger and chains voice agents, chat agents, worker agents, messages, and waits. A
          person steps in only where the flow says so.
        </p>
      </header>

      <section className="kpi-grid" aria-label="Workflow figures">
        <article className="kpi">
          <span>Workflows running</span>
          <strong>
            {live} of {WORKFLOWS.length}
          </strong>
          <small>{WORKFLOWS.length - live} still in draft</small>
        </article>
        <article className="kpi">
          <span>Runs this week</span>
          <strong>{runs.toLocaleString("en-IN")}</strong>
          <small>{Math.round((autoRuns / Math.max(runs, 1)) * 100)}% finished without a person</small>
        </article>
        <article className="kpi">
          <span>Voice agent calls</span>
          <strong>{voiceSteps.toLocaleString("en-IN")}</strong>
          <small>placed by workflows this week</small>
        </article>
        <article className="kpi">
          <span>Desk hours saved</span>
          <strong>{Math.round((autoRuns * MINUTES_SAVED_PER_RUN) / 60)} h</strong>
          <small>at {MINUTES_SAVED_PER_RUN} min per automated run</small>
        </article>
      </section>

      <section className="card flow-legend" aria-label="Step types">
        {LEGEND.map((kind) => (
          <span key={kind} className={`flow-chip ${kind}`}>
            <i aria-hidden="true" /> {NODE_LABELS[kind]}
          </span>
        ))}
      </section>

      <div className="segmented" role="tablist" aria-label="Filter by process">
        <button type="button" role="tab" aria-selected={processId === "all"} onClick={() => setProcessId("all")}>
          All <b>{WORKFLOWS.length}</b>
        </button>
        {modulesWithFlows.map((processModule) => (
          <button
            key={processModule.id}
            type="button"
            role="tab"
            aria-selected={processId === processModule.id}
            onClick={() => setProcessId(processModule.id)}
          >
            {processModule.menuLabel}
          </button>
        ))}
      </div>

      <div className="stack workflow-list">
        {visible.map((workflow) => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </main>
  );
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const processModule = PROCESSES.find((item) => item.id === workflow.processId);

  return (
    <article className="card workflow-card">
      <header className="workflow-head">
        <div>
          <h2>{workflow.name}</h2>
          <p className="meta">
            {processModule ? <Link href={`/${processModule.id}`}>{processModule.menuLabel}</Link> : null} · {workflow.outcome}
          </p>
        </div>
        <div className="workflow-stats">
          <span className={`flow-status ${workflow.status}`}>{STATUS_LABELS[workflow.status]}</span>
          {workflow.status !== "draft" ? (
            <span className="meta">
              {workflow.runsThisWeek} runs · {workflow.autoRate}% automated
            </span>
          ) : null}
        </div>
      </header>
      <ol className="flow-chain" aria-label={`${workflow.name} steps`}>
        {workflow.nodes.map((node, index) => (
          <li key={`${node.label}-${index}`} className={`flow-node ${node.kind}`}>
            <span className="flow-node-kind">
              <i aria-hidden="true" /> {NODE_LABELS[node.kind]}
            </span>
            <strong>{node.label}</strong>
            {node.detail ? <small>{node.detail}</small> : null}
          </li>
        ))}
      </ol>
      {workflow.statusNote ? <p className="note workflow-note">{workflow.statusNote}</p> : null}
    </article>
  );
}
