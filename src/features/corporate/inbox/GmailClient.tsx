"use client";

import { useState } from "react";
import { OUTCOME_LABELS, OUTCOME_ORDER, type MailOutcome } from "../../../data/inbox-triage";
import { ComposeWindow } from "./ComposeWindow";
import { Icon } from "./icons";
import { MailList } from "./MailList";
import { MailView } from "./MailView";
import { outcomeOf, type InboxItem, type useMailbox } from "./useMailbox";

type Mailbox = ReturnType<typeof useMailbox>;
type NavView = "inbox" | "starred" | MailOutcome;

const MOBILE_QUERY = "(max-width: 980px)";

/** A Gmail-shaped client over the desk mailbox, so the desk sees the inbox it already knows. */
export function GmailClient({ mailbox }: { mailbox: Mailbox }) {
  const [view, setView] = useState<NavView>("inbox");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [navMobileOpen, setNavMobileOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const isDemo = mailbox.source === "demo";
  const visible = mailbox.items.filter((item) => matchesView(item, view) && matchesQuery(item, query));
  const openItem = openId ? mailbox.items.find((item) => item.mail.id === openId) ?? null : null;
  const openIndex = openItem ? visible.findIndex((item) => item.mail.id === openItem.mail.id) : -1;
  const caseCode = openItem?.decision?.caseCode;
  const caseThread = caseCode ? mailbox.items.filter((item) => item.decision?.caseCode === caseCode).reverse() : [];

  const open = (id: string) => {
    setOpenId(id);
    mailbox.markRead(id);
  };

  const choose = (next: NavView) => {
    setView(next);
    setOpenId(null);
    setNavMobileOpen(false);
  };

  const toggleNav = () => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      setNavMobileOpen((current) => !current);
    } else {
      setNavCollapsed((current) => !current);
    }
  };

  const step = (direction: -1 | 1) => {
    const next = visible[openIndex + direction];
    if (next) {
      open(next.mail.id);
    }
  };

  const unread = mailbox.items.filter((item) => !item.read).length;
  const countFor = (outcome: MailOutcome) => mailbox.items.filter((item) => outcomeOf(item) === outcome).length;
  const reading = mailbox.items.filter((item) => item.decision === null).length;

  return (
    <div className={`gm${navCollapsed ? " nav-collapsed" : ""}${navMobileOpen ? " nav-mobile-open" : ""}`}>
      <header className="gm-top">
        <button className="gm-icon-button" type="button" aria-label="Main menu" onClick={toggleNav}>
          <Icon name="menu" />
        </button>
        <span className="gm-brand">
          <Icon name="mail" className="gm-brand-mark" />
          Mail
        </span>
        <label className="gm-search">
          <Icon name="search" />
          <span className="visually-hidden">Search mail</span>
          <input
            type="search"
            placeholder="Search mail"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpenId(null);
            }}
          />
          {query ? (
            <button className="gm-icon-button small" type="button" aria-label="Clear search" onClick={() => setQuery("")}>
              <Icon name="close" />
            </button>
          ) : null}
        </label>
        <div className="gm-top-right">
          {reading > 0 ? (
            <span className="gm-reading">
              <Icon name="sparkle" /> Fleet reading {reading}
            </span>
          ) : null}
                    <div className="gm-account">
            <button
              type="button"
              className="gm-avatar account"
              aria-label={`Account ${mailbox.mailboxAddress ?? ""}`}
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((current) => !current)}
            >
              {(mailbox.mailboxAddress ?? "?")[0].toUpperCase()}
            </button>
            {accountOpen ? (
              <div className="gm-account-menu">
                <strong>Corporate travel desk</strong>
                <span>{mailbox.mailboxAddress}</span>
                <small>Connected.</small>
                <button
                  type="button"
                  className="gm-outline-button"
                  onClick={() => {
                    setAccountOpen(false);
                    void mailbox.disconnect();
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="gm-nav" aria-label="Mail folders">
        {isDemo ? (
          <button type="button" className="gm-compose-button" onClick={() => setComposeOpen(true)}>
            <Icon name="edit" />
            <span>Compose</span>
          </button>
        ) : null}
        <NavItem icon="inbox" label="Inbox" count={unread} bold active={view === "inbox"} onClick={() => choose("inbox")} />
        <NavItem
          icon="starOutline"
          label="Starred"
          count={mailbox.items.filter((item) => item.starred).length}
          active={view === "starred"}
          onClick={() => choose("starred")}
        />
        <p className="gm-nav-heading">Fleet labels</p>
        {OUTCOME_ORDER.map((outcome) => (
          <NavItem
            key={outcome}
            icon="label"
            iconClass={`label-${outcome}`}
            label={OUTCOME_LABELS[outcome]}
            count={countFor(outcome)}
            active={view === outcome}
            onClick={() => choose(outcome)}
          />
        ))}
      </nav>
      {navMobileOpen ? <button className="gm-scrim" type="button" aria-label="Close menu" onClick={() => setNavMobileOpen(false)} /> : null}

      <main className="gm-main">
        {openItem ? (
          <MailView
            item={openItem}
            caseThread={caseThread}
            position={{ index: Math.max(openIndex, 0), total: Math.max(visible.length, 1) }}
            canSend={isDemo}
            onBack={() => setOpenId(null)}
            onStep={step}
            onOpen={open}
            onToggleStar={mailbox.toggleStar}
            onResolve={mailbox.resolve}
            onDecideApproval={mailbox.decideApproval}
          />
        ) : (
          <MailList
            items={visible}
            emptyText={emptyText(mailbox.items.length, query)}
            canRefresh={mailbox.source === "gmail"}
            refreshing={mailbox.checking}
            onRefresh={() => void mailbox.checkNow()}
            onOpen={open}
            onToggleStar={mailbox.toggleStar}
          />
        )}
      </main>

      {composeOpen && mailbox.mailboxAddress ? (
        <ComposeWindow
          mailboxAddress={mailbox.mailboxAddress}
          onDeliver={mailbox.deliverTestMail}
          onClose={() => setComposeOpen(false)}
        />
      ) : null}

      {mailbox.toast ? (
        <div className="gm-toast" role="status">
          <span>{mailbox.toast.text}</span>
          <button type="button" className="gm-icon-button small" aria-label="Dismiss" onClick={mailbox.dismissToast}>
            <Icon name="close" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface NavItemProps {
  icon: "inbox" | "starOutline" | "label";
  iconClass?: string;
  label: string;
  count: number;
  bold?: boolean;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, iconClass, label, count, bold, active, onClick }: NavItemProps) {
  return (
    <button type="button" className={`gm-nav-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick} title={label}>
      <Icon name={icon} className={iconClass} />
      <span className="gm-nav-label">{label}</span>
      {count > 0 ? <span className={`gm-nav-count${bold ? " bold" : ""}`}>{count}</span> : null}
    </button>
  );
}

function matchesView(item: InboxItem, view: NavView): boolean {
  if (view === "inbox") {
    return true;
  }
  if (view === "starred") {
    return item.starred;
  }
  return outcomeOf(item) === view;
}

function matchesQuery(item: InboxItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const { mail, decision } = item;
  return [mail.from, mail.subject, mail.body, decision?.caseCode ?? ""].some((field) => field.toLowerCase().includes(needle));
}

function emptyText(total: number, query: string): string {
  if (query.trim()) {
    return "No messages matched your search.";
  }
  return total === 0 ? "Waiting for the first mail…" : "Nothing here right now.";
}
