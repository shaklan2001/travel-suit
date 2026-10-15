"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { DEMO_MAILBOX_ADDRESS, type MailProvider } from "./useMailbox";

const STEPS = [
  { title: "Connect", text: "Sign in once with read-only mail access. The fleet can read mail. It cannot send or delete." },
  { title: "Watch", text: "Every new mail is picked up as it lands. There is no run button." },
  { title: "Decide", text: "Intent Router reads each mail. Non-travel mail is left alone. Travel mail runs its path." },
  { title: "Hand off", text: "Only exceptions reach you: a decision to make, or a drafted reply to send." },
];

const PROVIDERS: { id: MailProvider; name: string; detail: string; button: string }[] = [
  { id: "outlook", name: "Outlook", detail: "Microsoft 365, Exchange Online, and Outlook.com", button: "Sign in with Microsoft" },
  { id: "gmail", name: "Gmail", detail: "Google Workspace and Gmail", button: "Sign in with Google" },
  { id: "forward", name: "Any other mailbox", detail: "Zoho Mail, GoDaddy, Rediff, or your own mail server", button: "I've set up forwarding" },
];

const FORWARD_ADDRESS = "desk-7f3k2@in.mail.vibrium.ai";

/** Shown before a mailbox is connected. The desk works the same on Outlook, Gmail, or a forwarded mailbox. */
export function ConnectPanel({ onConnect }: { onConnect: (provider: MailProvider) => void }) {
  const [provider, setProvider] = useState<MailProvider>("outlook");
  const [copied, setCopied] = useState(false);
  const chosen = PROVIDERS.find((item) => item.id === provider) ?? PROVIDERS[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(FORWARD_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="card connect-panel">
      <div>
        <p className="kicker">Desk mailbox</p>
        <h2>Connect the corporate travel inbox</h2>
        <p className="lede">
          Use the mailbox your desk already has. Your inbox opens here, the fleet reads every new mail, and it marks what still
          needs a person.
        </p>
      </div>

      <div className="mx-providers" role="radiogroup" aria-label="Mail provider">
        {PROVIDERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={provider === item.id}
            className={`mx-provider ${item.id}`}
            onClick={() => setProvider(item.id)}
          >
            <ProviderMark provider={item.id} />
            <span>
              <strong>{item.name}</strong>
              <small>{item.detail}</small>
            </span>
          </button>
        ))}
      </div>

      {provider === "forward" ? (
        <div className="mx-forward">
          <p>
            Add a forwarding rule in your mail settings that sends a copy of every mail for <b>{DEMO_MAILBOX_ADDRESS}</b> to this
            address. Nothing changes for your team; they keep working in their usual mailbox.
          </p>
          <div className="mx-forward-row">
            <code>{FORWARD_ADDRESS}</code>
            <button type="button" className="pl-btn" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      <ol className="how-it-works">
        {STEPS.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>

      <div className="connect-actions">
        <button className={`primary-button gmail-button mx-connect ${provider}`} type="button" onClick={() => onConnect(provider)}>
          <Icon name="mail" /> {chosen.button}
        </button>
        <span className="meta">
          {provider === "forward" ? "Read-only: the fleet only sees mail you forward." : "Read-only access. You can disconnect at any time."}
        </span>
      </div>
    </section>
  );
}

export function ProviderMark({ provider }: { provider: MailProvider }) {
  if (provider === "outlook") {
    return (
      <svg className="mx-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="2" y="4" width="28" height="24" rx="5" fill="#0a64d6" />
        <ellipse cx="13" cy="16" rx="5.2" ry="6.2" fill="none" stroke="#fff" strokeWidth="2.6" />
        <path d="M20 11h7v10h-7" fill="none" stroke="#9cc8ff" strokeWidth="2" />
      </svg>
    );
  }
  if (provider === "gmail") {
    return (
      <svg className="mx-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="2" y="6" width="28" height="20" rx="4" fill="#fff" stroke="#e3e8ec" />
        <path d="M4 9l12 9 12-9" fill="none" stroke="#ea4335" strokeWidth="3" strokeLinejoin="round" />
        <path d="M4 9v15" stroke="#4285f4" strokeWidth="3" />
        <path d="M28 9v15" stroke="#34a853" strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg className="mx-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="4" width="28" height="24" rx="5" fill="#1a333c" />
      <path d="M8 12h16v10H8z" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M8 12l8 6 8-6" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M20 7l4 2-4 2" fill="none" stroke="#00ccc5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
