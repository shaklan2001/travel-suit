import { MissingProcess, ProcessFrame } from "../../components/layout/ProcessFrame";
import { getProcess } from "../../data/book";
import { AUTONOMY_LABELS, type AgentCard, type AgentKind, type Autonomy } from "../../data/types";

interface SquadPageProps {
  processId: string;
}

const GROUPS: { kind: AgentKind; title: string; text: string }[] = [
  { kind: "conversational", title: "Talk to people", text: "Voice, chat, or email. They start the case and keep the person informed." },
  { kind: "functional", title: "Do the work", text: "They work the systems, documents, and rules behind the case." },
  { kind: "analytical", title: "Read and explain", text: "They structure, rank, and explain. They cite facts and never invent a number." },
];

const AUTONOMY_HINTS: Record<Autonomy, string> = {
  fully_auto: "Runs the step to the end on its own.",
  auto_with_approval: "Acts, then a person confirms the decision.",
  draft: "Writes the draft. A person sends or releases it.",
  suggest: "Flags and recommends. It never decides.",
};

const AUTONOMY_ORDER: Autonomy[] = ["fully_auto", "auto_with_approval", "draft", "suggest"];

export function SquadPage({ processId }: SquadPageProps) {
  const processModule = getProcess(processId);

  if (!processModule) {
    return <MissingProcess />;
  }

  const agents = processModule.agents;
  const usedLevels = AUTONOMY_ORDER.filter((level) => agents.some((agent) => agent.autonomy === level));

  return (
    <ProcessFrame processModule={processModule}>
      <section className="squad-intro card">
        <div>
          <h2>
            {agents.length} agents run this process
          </h2>
          <p>
            Each card says what the agent does, how far it may go on its own, and what it takes in and hands on. Anything
            above its level goes to a person.
          </p>
        </div>
        <ul className="autonomy-legend" aria-label="Autonomy levels">
          {usedLevels.map((level) => (
            <li key={level}>
              <span className={`autonomy-badge ${level}`}>{AUTONOMY_LABELS[level]}</span>
              <span>{AUTONOMY_HINTS[level]}</span>
            </li>
          ))}
        </ul>
      </section>

      {GROUPS.map((group) => {
        const members = agents.filter((agent) => agent.kind === group.kind);
        if (members.length === 0) {
          return null;
        }
        return (
          <section className="section" key={group.kind}>
            <div className="group-head">
              <h2>{group.title}</h2>
              <p className="meta">{group.text}</p>
            </div>
            <div className="squad-grid">
              {members.map((agent) => (
                <AgentTile key={agent.id} agent={agent} />
              ))}
            </div>
          </section>
        );
      })}
    </ProcessFrame>
  );
}

function AgentTile({ agent }: { agent: AgentCard }) {
  const initials = agent.name
    .split(/[\s·]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const version = /^\d/.test(agent.version) ? `v${agent.version}` : agent.version;

  return (
    <article className="agent-card">
      <header className="agent-head">
        <span className="agent-avatar" aria-hidden="true">
          {initials}
        </span>
        <div>
          <h3>{agent.name}</h3>
          <p className="meta">{agent.role}</p>
        </div>
        <span className="agent-live">
          <i aria-hidden="true" /> Live · {version}
        </span>
      </header>

      <p className="agent-summary">{agent.summary}</p>

      <div className="agent-autonomy">
        <span className={`autonomy-badge ${agent.autonomy}`}>{AUTONOMY_LABELS[agent.autonomy]}</span>
        <span className="meta">{AUTONOMY_HINTS[agent.autonomy]}</span>
      </div>

      <div className="agent-chips">
        {agent.channels.map((channel) => (
          <span className="chip channel" key={channel}>
            {channel}
          </span>
        ))}
        {agent.skills.map((skill) => (
          <span className="chip" key={skill}>
            {skill}
          </span>
        ))}
      </div>

      <div className="agent-io" aria-label="Inputs and outputs">
        <span>
          <small>Takes in</small>
          {agent.inputs}
        </span>
        <span className="agent-io-arrow" aria-hidden="true">
          →
        </span>
        <span>
          <small>Hands on</small>
          {agent.outputs}
        </span>
      </div>
    </article>
  );
}
