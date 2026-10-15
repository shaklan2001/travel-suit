"use client";

import { Icon } from "./icons";

const STEPS = [
  { title: "Connect", text: "Sign in once with read-only mail access. The fleet can read mail. It cannot send or delete." },
  { title: "Watch", text: "Every new mail is picked up as it lands. There is no run button." },
  { title: "Decide", text: "Intent Router reads each mail. Non-travel mail is left alone. Travel mail runs its path." },
  { title: "Hand off", text: "Only exceptions reach you: a decision to make, or a drafted reply to send." },
];

/** Shown before a mailbox is connected. In the demo, Connect opens the sample desk mailbox. */
export function ConnectPanel({ onConnect }: { onConnect: () => void }) {
  return (
    <section className="card connect-panel">
      <div>
        <p className="kicker">Desk mailbox</p>
        <h2>Connect the corporate travel inbox</h2>
        <p className="lede">
          Your inbox opens here, the way you know it from Gmail. The fleet reads every new mail and marks what still
          needs a person.
        </p>
      </div>

      <ol className="how-it-works">
        {STEPS.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>

      <div className="connect-actions">
        <button className="primary-button gmail-button" type="button" onClick={onConnect}>
          <Icon name="mail" /> Connect Gmail
        </button>
      </div>
    </section>
  );
}
