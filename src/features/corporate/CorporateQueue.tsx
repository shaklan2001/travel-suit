"use client";

import { ConnectPanel } from "./inbox/ConnectPanel";
import { GmailClient } from "./inbox/GmailClient";
import { useMailbox } from "./inbox/useMailbox";

export function CorporateQueue() {
  const mailbox = useMailbox();

  if (mailbox.source === "none") {
    return <ConnectPanel onConnect={mailbox.connect} />;
  }
  return <GmailClient mailbox={mailbox} />;
}
