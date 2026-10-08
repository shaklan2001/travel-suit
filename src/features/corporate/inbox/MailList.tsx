"use client";

import { OUTCOME_LABELS, senderName } from "../../../data/inbox-triage";
import { Icon } from "./icons";
import { listTime, snippet } from "./mail-format";
import { outcomeOf, type InboxItem } from "./useMailbox";

interface MailListProps {
  items: InboxItem[];
  emptyText: string;
  canRefresh: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
}

export function MailList({ items, emptyText, canRefresh, refreshing, onRefresh, onOpen, onToggleStar }: MailListProps) {
  return (
    <>
      <div className="gm-toolbar">
        {canRefresh ? (
          <button className="gm-icon-button" type="button" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
            <Icon name="refresh" />
          </button>
        ) : null}
        <span className="gm-toolbar-spacer" />
        <span className="gm-count">{items.length === 0 ? "0" : `1–${items.length} of ${items.length}`}</span>
      </div>

      {items.length === 0 ? (
        <p className="gm-empty">{emptyText}</p>
      ) : (
        <ul className="gm-rows" aria-label="Messages">
          {items.map((item) => (
            <MailRow key={item.mail.id} item={item} onOpen={onOpen} onToggleStar={onToggleStar} />
          ))}
        </ul>
      )}
    </>
  );
}

function MailRow({
  item,
  onOpen,
  onToggleStar,
}: {
  item: InboxItem;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
}) {
  const { mail, decision, read, starred } = item;
  const outcome = outcomeOf(item);

  return (
    <li className={`gm-row${read ? "" : " unread"}${outcome === "not_travel" ? " dim" : ""}`}>
      <button
        type="button"
        className={`gm-star${starred ? " on" : ""}`}
        aria-label={starred ? "Unstar" : "Star"}
        aria-pressed={starred}
        onClick={() => onToggleStar(mail.id)}
      >
        <Icon name={starred ? "star" : "starOutline"} />
      </button>
      <button type="button" className="gm-row-open" onClick={() => onOpen(mail.id)}>
        <span className="gm-row-sender">{senderName(mail.from)}</span>
        <span className="gm-row-main">
          {outcome ? (
            <span className={`gm-chip outcome-${outcome}`}>{OUTCOME_LABELS[outcome]}</span>
          ) : (
            <span className="gm-chip reading">Fleet reading…</span>
          )}
          {decision?.caseCode ? <span className="gm-chip case">{decision.caseCode}</span> : null}
          <span className="gm-row-subject">{mail.subject}</span>
          <span className="gm-row-snippet"> – {snippet(mail.body)}</span>
        </span>
        <time className="gm-row-time" dateTime={mail.receivedAt}>
          {listTime(mail.receivedAt)}
        </time>
      </button>
    </li>
  );
}
