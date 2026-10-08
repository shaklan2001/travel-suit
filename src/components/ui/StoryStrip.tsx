import type { StoryStep } from "../../data/types";

const KIND_LABELS: Record<StoryStep["kind"], string> = {
  person: "Starts it",
  agent: "Agents",
  gate: "You decide",
};

/** The process in four plain steps: who starts it, what the agents do, where a person decides. */
export function StoryStrip({ steps }: { steps: StoryStep[] }) {
  return (
    <section className="story" aria-label="How this works">
      <p className="kicker accent">How this works</p>
      <ol className="story-steps">
        {steps.map((step, index) => (
          <li key={`${step.who}-${index}`} className={`story-step ${step.kind}`}>
            <span className="story-tag">
              <b>{index + 1}</b> {KIND_LABELS[step.kind]}
            </span>
            <strong>{step.who}</strong>
            <span>{step.does}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
