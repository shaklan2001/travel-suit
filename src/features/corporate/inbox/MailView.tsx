"use client";

import { useState } from "react";
import { CORPORATE_POC_NOTE } from "../../../data/corporate-desk";
import { OUTCOME_LABELS, senderName, type ApprovalRequest, type MailDecision, type TripFacts } from "../../../data/inbox-triage";
import { flightOptionsOf } from "../../../data/live-triage";
import type { FleetRun } from "../../../lib/fleet/types";
import { Icon } from "./icons";
import { avatarFor, fullTime, listTime, senderAddress, snippet } from "./mail-format";
import { outcomeOf, type InboxItem, type ManagerVerdict, type SentReply } from "./useMailbox";

interface MailViewProps {
  item: InboxItem;
  caseThread: InboxItem[];
  position: { index: number; total: number };
  canSend: boolean;
  onBack: () => void;
  onStep: (direction: -1 | 1) => void;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  onResolve: (id: string, resolution: string, toastText: string) => void;
  onDecideApproval: (id: string, verdict: ManagerVerdict) => void;
}

export function MailView({
  item,
  caseThread,
  position,
  canSend,
  onBack,
  onStep,
  onOpen,
  onToggleStar,
  onResolve,
  onDecideApproval,
}: MailViewProps) {
  const { mail, decision } = item;
  const outcome = outcomeOf(item);
  const thread = caseThread.length > 0 ? caseThread : [item];

  return (
    <div className="gm-view">
      <div className="gm-toolbar">
        <button className="gm-icon-button" type="button" aria-label="Back to inbox" onClick={onBack}>
          <Icon name="back" />
        </button>
        <span className="gm-toolbar-spacer" />
        <span className="gm-count">
          {position.index + 1} of {position.total}
        </span>
        <button className="gm-icon-button" type="button" aria-label="Newer" disabled={position.index <= 0} onClick={() => onStep(-1)}>
          <Icon name="chevronLeft" />
        </button>
        <button
          className="gm-icon-button"
          type="button"
          aria-label="Older"
          disabled={position.index >= position.total - 1}
          onClick={() => onStep(1)}
        >
          <Icon name="chevronRight" />
        </button>
      </div>

      <div className="gm-view-scroll">
        <header className="gm-subject">
          <h2>{mail.subject}</h2>
          {outcome ? <span className={`gm-chip outcome-${outcome}`}>{OUTCOME_LABELS[outcome]}</span> : null}
          {decision?.caseCode ? <span className="gm-chip case">{decision.caseCode}</span> : null}
          <span className="gm-chip inbox">Inbox</span>
        </header>

        {decision ? (
          <FleetCard item={item} decision={decision} onResolve={onResolve} onDecideApproval={onDecideApproval} />
        ) : (
          <section className="gm-fleet reading">
            <p className="gm-fleet-title">
              <Icon name="sparkle" /> Vibrium fleet is reading this mail…
            </p>
          </section>
        )}

        <div className="gm-thread">
          {thread.map((entry) =>
            entry.mail.id === mail.id ? (
              <OpenMessage key={entry.mail.id} item={entry} onToggleStar={onToggleStar} />
            ) : (
              <CollapsedMessage key={entry.mail.id} item={entry} onOpen={onOpen} />
            ),
          )}
        </div>

        {item.sent ? <SentCard to={mail.from} sent={item.sent} /> : null}

        {decision?.draftReply && !item.resolution ? (
          <DraftReply
            key={mail.id}
            to={mail.from}
            subject={decision.live?.replySubject ?? null}
            text={decision.draftReply}
            canSend={canSend}
            onSend={() => onResolve(mail.id, "Drafted reply sent by you", "Message sent")}
          />
        ) : null}
      </div>
    </div>
  );
}

function FleetCard({
  item,
  decision,
  onResolve,
  onDecideApproval,
}: {
  item: InboxItem;
  decision: MailDecision;
  onResolve: (id: string, resolution: string, toastText: string) => void;
  onDecideApproval: (id: string, verdict: ManagerVerdict) => void;
}) {
  const steps = decision.live?.steps ?? decision.preview?.steps ?? [];
  const ranCount = steps.filter((step) => step.status === "ran").length || 1;

  return (
    <section className="gm-fleet" aria-live="polite">
      <p className="gm-fleet-title">
        <Icon name="sparkle" /> Vibrium fleet · {decision.intentLabel}
      </p>
      <p className="gm-fleet-summary">{decision.summary}</p>

      {item.resolution ? (
        <div className="gm-fleet-action closed">
          <Icon name="done" />
          <span>
            <strong>Closed.</strong> {item.resolution}.
          </span>
        </div>
      ) : decision.approval ? (
        <ApprovalPanel
          request={decision.approval}
          verdict={item.approval}
          onDecide={(verdict) => onDecideApproval(item.mail.id, verdict)}
          onTicketed={() => onResolve(item.mail.id, "Ticketed on TravelOne by you", "Case marked done")}
        />
      ) : decision.humanAction ? (
        <div className="gm-fleet-action todo">
          <span>
            <strong>Your action:</strong> {decision.humanAction}
          </span>
          {!decision.draftReply ? (
            <button
              type="button"
              className="gm-text-button"
              onClick={() => onResolve(item.mail.id, "Marked done by you", "Case marked done")}
            >
              Mark as done
            </button>
          ) : null}
        </div>
      ) : (
        <div className="gm-fleet-action clear">
          <Icon name="done" />
          <span>
            <strong>No action from you.</strong>{" "}
            {decision.outcome === "waiting"
              ? "The case waits on TravelOne. The fleet continues on its own when search is connected."
              : decision.outcome === "not_travel"
                ? "Not a travel request. The mail is left as it is."
                : "Handled end to end by the fleet."}
          </span>
        </div>
      )}

      <ul className="gm-fleet-done">
        {decision.automated.map((step) => (
          <li key={step}>
            <Icon name="done" /> {step}
          </li>
        ))}
      </ul>

      {decision.trip ? <TripChips trip={decision.trip} /> : null}

      {decision.nextAutomatic && !item.resolution ? (
        <p className="gm-fleet-next">
          <strong>Next, without you:</strong> {decision.nextAutomatic}
        </p>
      ) : null}

      {decision.live ? <LiveDetails run={decision.live.run} /> : null}

      {steps.length > 0 ? (
        <details className="gm-fleet-steps">
          <summary>
            {ranCount} of {steps.length} agents ran
          </summary>
          <ol>
            {steps.map((step) => (
              <li key={step.key} className={step.status}>
                <span className="gm-step-status">{step.status}</span>
                <span>
                  <strong>{step.name}</strong> · {step.label}
                  <small>{step.note}</small>
                </span>
              </li>
            ))}
          </ol>
          <p className="gm-fleet-note">{decision.live ? LIVE_FLEET_NOTE : CORPORATE_POC_NOTE}</p>
        </details>
      ) : null}
    </section>
  );
}

const LIVE_FLEET_NOTE =
  "Vibrium workers read this mail. TravelOne search and revalidation run on the live booking API. Nothing is ticketed until a person approves.";

const inr = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;
const words = (value: unknown) => (typeof value === "string" ? value.replace(/_/g, " ") : "");

/** What the workers produced beyond the headline: quoted options, fare check, booking payload, next steps. */
function LiveDetails({ run }: { run: FleetRun }) {
  const options = flightOptionsOf(run);
  const { policy, revalidation, booking, orchestration } = run;
  const questions = Array.isArray(orchestration?.clarifyingQuestions) ? (orchestration.clarifyingQuestions as string[]) : [];
  const actions = Array.isArray(orchestration?.nextActions) ? (orchestration.nextActions as string[]) : [];
  const warnings = Array.isArray(policy?.warnings) ? (policy.warnings as string[]) : [];
  const bookingErrors = Array.isArray(booking?.validationErrors) ? (booking.validationErrors as string[]) : [];
  const payload = booking?.payload as Record<string, unknown> | undefined;

  return (
    <div className="gm-live">
      {policy ? (
        <p className="gm-live-line">
          <strong>Policy:</strong> {words(policy.policyStatus) || "checked"}
          {policy.needsApprover ? " · approver needed" : ""}
          {warnings.length > 0 ? ` · ${warnings.join("; ")}` : ""}
        </p>
      ) : null}

      {options.length > 0 ? (
        <table className="gm-live-options" aria-label="Flight options ranked by Meera">
          <tbody>
            {options.map((option) => (
              <tr key={option.optionId} className={option.optionId === run.options?.recommendedOptionId ? "recommended" : undefined}>
                <td>
                  <strong>
                    {option.airline} {option.flightNo}
                  </strong>
                  <small>{option.rationale}</small>
                </td>
                <td>
                  {option.departureTime} → {option.arrivalTime}
                  {option.duration ? <small>{option.duration}</small> : null}
                </td>
                <td className="fare">
                  {inr(option.fare)}
                  {option.optionId === run.options?.recommendedOptionId ? <small>Recommended</small> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {revalidation ? (
        <p className="gm-live-line">
          <strong>Fare check:</strong> {words(revalidation.revalidationStatus)} · {inr(Number(revalidation.quotedFare) || 0)} →{" "}
          {inr(Number(revalidation.revalidatedFare) || 0)}
          {revalidation.requiresTravellerReconfirmation ? " · traveller must reconfirm" : ""}
        </p>
      ) : null}

      {booking ? (
        <details className="gm-live-payload">
          <summary>
            Booking payload · {booking.bookingReady ? "ready for TravelOne" : `held back${bookingErrors.length ? ` (${bookingErrors.length} gaps)` : ""}`}
          </summary>
          {bookingErrors.length > 0 ? (
            <ul>
              {bookingErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          <pre>{JSON.stringify(payload ?? {}, null, 2)}</pre>
        </details>
      ) : null}

      {questions.length > 0 ? (
        <div className="gm-live-block">
          <strong>Questions for the sender</strong>
          <ul>
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="gm-live-block">
          <strong>Next actions (Kabir)</strong>
          <ol>
            {actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/** The gate before ticketing. The payload is prepared and held until the reporting manager approves this exact fare. */
function ApprovalPanel({
  request,
  verdict,
  onDecide,
  onTicketed,
}: {
  request: ApprovalRequest;
  verdict: ManagerVerdict | null;
  onDecide: (verdict: ManagerVerdict) => void;
  onTicketed: () => void;
}) {
  const facts = [
    request.traveller,
    request.route,
    request.date,
    request.flight,
    request.fare !== null ? inr(request.fare) : "",
    request.costCentre ? `Cost centre ${request.costCentre}` : "",
  ].filter(Boolean);

  return (
    <div className={`gm-approval${verdict ? ` ${verdict}` : ""}`}>
      <p className="gm-approval-title">
        <Icon name="done" /> {verdict === "approved" ? "Manager approved" : "Waiting for the reporting manager"}
      </p>
      <p className="gm-approval-facts">{facts.join(" · ")}</p>
      <p className="gm-approval-reason">{request.reason}</p>
      {verdict === "approved" ? (
        <div className="gm-approval-actions">
          <span>
            <strong>Your action:</strong> Ticket this on TravelOne with the prepared payload.
          </span>
          <button type="button" className="gm-text-button" onClick={onTicketed}>
            Mark as ticketed
          </button>
        </div>
      ) : (
        <div className="gm-approval-actions">
          <span>The payload is held. Nothing is released to TravelOne until the manager approves.</span>
          <button type="button" className="gm-send" onClick={() => onDecide("approved")}>
            Approve
          </button>
          <button type="button" className="gm-text-button" onClick={() => onDecide("rejected")}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

const TRIP_FIELDS: { key: keyof TripFacts; label: string }[] = [
  { key: "route", label: "Route" },
  { key: "date", label: "Date" },
  { key: "cabin", label: "Cabin" },
  { key: "timing", label: "Time" },
  { key: "passengers", label: "Pax" },
  { key: "costCentre", label: "Cost centre" },
];

function TripChips({ trip }: { trip: TripFacts }) {
  return (
    <div className="gm-trip" aria-label="Trip details read by Aarav">
      {TRIP_FIELDS.map(({ key, label }) => (
        <span key={key} className={`gm-trip-chip${trip[key] ? "" : " missing"}`}>
          {label}: <b>{trip[key] ?? "missing"}</b>
        </span>
      ))}
    </div>
  );
}

function OpenMessage({ item, onToggleStar }: { item: InboxItem; onToggleStar: (id: string) => void }) {
  const { mail, starred } = item;
  const avatar = avatarFor(mail.from);

  return (
    <article className="gm-message">
      <span className="gm-avatar" style={{ background: avatar.color }} aria-hidden="true">
        {avatar.initial}
      </span>
      <div className="gm-message-body">
        <div className="gm-message-head">
          <div className="gm-message-who">
            <strong>{senderName(mail.from)}</strong> <span>&lt;{senderAddress(mail.from)}&gt;</span>
            <small>
              to {mail.to || "me"}
              {mail.cc ? `, cc ${mail.cc}` : ""}
            </small>
          </div>
          <div className="gm-message-meta">
            <time dateTime={mail.receivedAt}>{fullTime(mail.receivedAt)}</time>
            <button
              type="button"
              className={`gm-star${starred ? " on" : ""}`}
              aria-label={starred ? "Unstar" : "Star"}
              aria-pressed={starred}
              onClick={() => onToggleStar(mail.id)}
            >
              <Icon name={starred ? "star" : "starOutline"} />
            </button>
            {mail.sourceUrl ? (
              <a className="gm-text-button" href={mail.sourceUrl} target="_blank" rel="noopener noreferrer">
                Open in Gmail
              </a>
            ) : null}
          </div>
        </div>
        <div className="gm-message-text">{mail.body}</div>
      </div>
    </article>
  );
}

function CollapsedMessage({ item, onOpen }: { item: InboxItem; onOpen: (id: string) => void }) {
  const { mail } = item;
  const avatar = avatarFor(mail.from);
  const outcome = outcomeOf(item);

  return (
    <button type="button" className="gm-message collapsed" onClick={() => onOpen(mail.id)}>
      <span className="gm-avatar" style={{ background: avatar.color }} aria-hidden="true">
        {avatar.initial}
      </span>
      <span className="gm-collapsed-main">
        <strong>{senderName(mail.from)}</strong>
        {outcome ? <span className={`gm-chip outcome-${outcome}`}>{OUTCOME_LABELS[outcome]}</span> : null}
        <span className="gm-row-snippet">{snippet(mail.body, 110)}</span>
      </span>
      <time dateTime={mail.receivedAt}>{listTime(mail.receivedAt)}</time>
    </button>
  );
}

function SentCard({ to, sent }: { to: string; sent: SentReply }) {
  return (
    <section className="gm-draft sent" aria-label="Reply sent by Anika">
      <div className="gm-draft-head">
        <Icon name="reply" />
        <span className="gm-draft-tag sent">Sent</span>
        <span className="gm-draft-to">{senderName(to)}</span>
        <span className="gm-draft-by">
          <Icon name="sparkle" /> Sent automatically by Anika · <time dateTime={sent.sentAt}>{fullTime(sent.sentAt)}</time>
        </span>
      </div>
      {sent.subject ? <p className="gm-draft-subject">{sent.subject}</p> : null}
      <div className="gm-message-text sent-body">{sent.body}</div>
    </section>
  );
}

function DraftReply({
  to,
  subject,
  text,
  canSend,
  onSend,
}: {
  to: string;
  subject: string | null;
  text: string;
  canSend: boolean;
  onSend: () => void;
}) {
  const [body, setBody] = useState(text);
  const [copied, setCopied] = useState(false);


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="gm-draft" aria-label="Reply drafted by Anika">
      <div className="gm-draft-head">
        <Icon name="reply" />
        <span className="gm-draft-tag">Draft</span>
        <span className="gm-draft-to">{senderName(to)}</span>
        <span className="gm-draft-by">
          <Icon name="sparkle" /> Drafted by Anika
        </span>
      </div>
      {subject ? <p className="gm-draft-subject">{subject}</p> : null}
      <textarea
        className="gm-draft-text"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        aria-label="Reply text"
        spellCheck={false}
      />
      <div className="gm-draft-foot">
        {canSend ? (
          <button type="button" className="gm-send" onClick={onSend} disabled={body.trim().length === 0}>
            Send
          </button>
        ) : null}
        <button type="button" className="gm-text-button" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
