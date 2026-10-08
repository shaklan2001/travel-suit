import { MissingProcess, ProcessFrame } from "../../components/layout/ProcessFrame";
import { getProcess } from "../../data/book";
import type { MapStep, ProcessModule } from "../../data/types";

interface ProcessMapPageProps {
  processId: string;
}

interface Lane {
  name: string;
  isAgent: boolean;
}

export function ProcessMapPage({ processId }: ProcessMapPageProps) {
  const processModule = getProcess(processId);

  if (!processModule) {
    return <MissingProcess />;
  }

  const lanes = lanesOf(processModule);
  const stepCode = (step: MapStep) => step.id.toUpperCase();

  return (
    <ProcessFrame processModule={processModule}>
      <section className="card map-intro">
        <div>
          <h2>Who does what, in order</h2>
          <p>
            Read left to right. Each row is one actor and each column is one phase. A numbered box is a step that actor
            owns. Blue rows are agents; amber rows are people or systems where a human decides.
          </p>
        </div>
        <ol className="phase-strip" aria-label="Phases">
          {processModule.phases.map((phase, index) => (
            <li key={phase}>
              <b>{index + 1}</b> {phase}
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <h2>Swimlanes</h2>
        <div className="swim-scroll" tabIndex={0} aria-label="Swimlane map, scrolls sideways on small screens">
          <div className="swim" style={{ gridTemplateColumns: `10rem repeat(${processModule.phases.length}, minmax(8.5rem, 1fr))` }}>
            <span className="swim-corner">Actor</span>
            {processModule.phases.map((phase) => (
              <span className="swim-phase" key={phase}>
                {phase}
              </span>
            ))}
            {lanes.map((lane) => (
              <LaneRow key={lane.name} lane={lane} module={processModule} stepCode={stepCode} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Step by step</h2>
        <ol className="step-list">
          {processModule.steps.map((step) => {
            const isAgent = lanes.find((lane) => lane.name === step.lane)?.isAgent ?? false;
            return (
              <li key={step.id} className={isAgent ? "agent" : "human"}>
                <span className="step-code">{stepCode(step)}</span>
                <div>
                  <p className="step-meta">
                    {step.phase} · <b>{step.lane}</b> · {isAgent ? "Agent" : "Person or system"}
                  </p>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </ProcessFrame>
  );
}

function LaneRow({ lane, module, stepCode }: { lane: Lane; module: ProcessModule; stepCode: (step: MapStep) => string }) {
  return (
    <>
      <span className={`swim-lane ${lane.isAgent ? "agent" : "human"}`}>
        {lane.name}
        <small>{lane.isAgent ? "Agent" : "Person or system"}</small>
      </span>
      {module.phases.map((phase) => {
        const steps = module.steps.filter((step) => step.lane === lane.name && step.phase === phase);
        return (
          <span className="swim-cell" key={`${lane.name}-${phase}`}>
            {steps.map((step) => (
              <span className={`swim-step ${lane.isAgent ? "agent" : "human"}`} key={step.id}>
                <b>{stepCode(step)}</b>
                {step.title}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
}

/** Lanes in first-appearance order. A lane is an agent when it names one of the module's agents. */
function lanesOf(module: ProcessModule): Lane[] {
  const names = Array.from(new Set(module.steps.map((step) => step.lane)));
  return names.map((name) => ({
    name,
    isAgent: module.agents.some((agent) => agent.name === name || agent.name.startsWith(`${name} `)),
  }));
}
