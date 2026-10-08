"use client";

import { useState } from "react";
import { Icon } from "./icons";

interface ComposeWindowProps {
  mailboxAddress: string;
  onDeliver: (raw: string) => void;
  onClose: () => void;
}

const MIN_BODY_CHARACTERS = 10;

/** Demo only. Writes a mail as if a traveller sent it, and drops it into this inbox. */
export function ComposeWindow({ mailboxAddress, onDeliver, onClose }: ComposeWindowProps) {
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSend = () => {
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from.trim())) {
      setError("Enter the sender's email address.");
      return;
    }
    if (body.trim().length < MIN_BODY_CHARACTERS) {
      setError("Write the mail first.");
      return;
    }
    onDeliver(`From: ${from.trim()}\nTo: ${mailboxAddress}\nSubject: ${subject.trim() || "(no subject)"}\n\n${body.trim()}`);
    onClose();
  };

  return (
    <section className="gm-compose" role="dialog" aria-label="New test mail">
      <header className="gm-compose-head">
        <span>New test mail</span>
        <button type="button" className="gm-icon-button small" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <label className="gm-compose-field">
        <span>From</span>
        <input value={from} onChange={(event) => setFrom(event.target.value)} placeholder="traveller@company.com" autoFocus />
      </label>
      <label className="gm-compose-field">
        <span>To</span>
        <input value={mailboxAddress} readOnly />
      </label>
      <label className="gm-compose-field">
        <span className="visually-hidden">Subject</span>
        <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
      </label>
      <textarea
        className="gm-compose-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        aria-label="Message"
        placeholder="Hi team, please book DEL-MAA on 20 November, economy, morning, 1 pax."
      />
      <footer className="gm-compose-foot">
        <button type="button" className="gm-send" onClick={handleSend}>
          Send
        </button>
        <span className="gm-compose-note">{error ?? "Lands in this inbox as a new mail."}</span>
      </footer>
    </section>
  );
}
