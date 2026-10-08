import { senderName } from "../../../data/inbox-triage";

/** Gmail list style: time for today, short date otherwise. */
export function listTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function fullTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function snippet(body: string, length = 140): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
}

export function senderAddress(from: string): string {
  return from.match(/<([^>]+)>/)?.[1] ?? from.trim();
}

const AVATAR_COLORS = ["#1a73e8", "#e8710a", "#188038", "#d93025", "#9334e6", "#12a4af", "#c5221f", "#5f6368"];

export function avatarFor(from: string): { initial: string; color: string } {
  const name = senderName(from);
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return { initial: (name[0] ?? "?").toUpperCase(), color: AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}
