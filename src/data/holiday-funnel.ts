/** Trip planner funnel: widget opens through to bookings, by period, channel, and destination. */

export type FunnelPeriod = "7d" | "30d";

export interface FunnelStage {
  id: string;
  label: string;
  value: number;
  detail: string;
}

export interface ChannelRow {
  channel: string;
  chats: number;
  leads: number;
  bookings: number;
  revenue: number;
}

export interface DestinationRow {
  name: string;
  leads: number;
  bookings: number;
}

export interface FunnelData {
  label: string;
  stages: FunnelStage[];
  revenue: number;
  medianQuoteMinutes: number;
  visitors: number;
  channels: ChannelRow[];
  destinations: DestinationRow[];
  weeks: { label: string; leads: number; bookings: number }[];
}

export const FUNNEL: Record<FunnelPeriod, FunnelData> = {
  "7d": {
    label: "Last 7 days",
    visitors: 21400,
    stages: [
      { id: "open", label: "Widget opened", value: 1180, detail: "5.5% of site visitors" },
      { id: "chat", label: "Chat started", value: 580, detail: "typed or tapped a first reply" },
      { id: "plan", label: "Plan shared", value: 214, detail: "day-by-day plan and budget shown" },
      { id: "lead", label: "Quote requested", value: 126, detail: "lead on the quote desk" },
      { id: "quote", label: "Quote sent", value: 104, detail: "designed PDF sent" },
      { id: "book", label: "Booked", value: 27, detail: "advance paid" },
    ],
    revenue: 5130000,
    medianQuoteMinutes: 18,
    channels: [
      { channel: "Website widget", chats: 412, leads: 88, bookings: 19, revenue: 3610000 },
      { channel: "WhatsApp", chats: 121, leads: 29, bookings: 6, revenue: 1140000 },
      { channel: "App", chats: 47, leads: 9, bookings: 2, revenue: 380000 },
    ],
    destinations: [
      { name: "Bali", leads: 24, bookings: 6 },
      { name: "Dubai", leads: 19, bookings: 5 },
      { name: "Thailand", leads: 17, bookings: 4 },
      { name: "Kerala", leads: 15, bookings: 4 },
      { name: "Maldives", leads: 11, bookings: 3 },
      { name: "Switzerland", leads: 9, bookings: 2 },
    ],
    weeks: [
      { label: "Mon", leads: 15, bookings: 3 },
      { label: "Tue", leads: 17, bookings: 4 },
      { label: "Wed", leads: 19, bookings: 4 },
      { label: "Thu", leads: 21, bookings: 5 },
      { label: "Fri", leads: 18, bookings: 4 },
      { label: "Sat", leads: 22, bookings: 5 },
      { label: "Sun", leads: 14, bookings: 2 },
    ],
  },
  "30d": {
    label: "Last 30 days",
    visitors: 88600,
    stages: [
      { id: "open", label: "Widget opened", value: 4820, detail: "5.4% of site visitors" },
      { id: "chat", label: "Chat started", value: 2390, detail: "typed or tapped a first reply" },
      { id: "plan", label: "Plan shared", value: 902, detail: "day-by-day plan and budget shown" },
      { id: "lead", label: "Quote requested", value: 521, detail: "lead on the quote desk" },
      { id: "quote", label: "Quote sent", value: 447, detail: "designed PDF sent" },
      { id: "book", label: "Booked", value: 109, detail: "advance paid" },
    ],
    revenue: 20840000,
    medianQuoteMinutes: 21,
    channels: [
      { channel: "Website widget", chats: 1702, leads: 361, bookings: 76, revenue: 14520000 },
      { channel: "WhatsApp", chats: 493, leads: 121, bookings: 25, revenue: 4780000 },
      { channel: "App", chats: 195, leads: 39, bookings: 8, revenue: 1540000 },
    ],
    destinations: [
      { name: "Bali", leads: 96, bookings: 22 },
      { name: "Dubai", leads: 81, bookings: 19 },
      { name: "Thailand", leads: 74, bookings: 15 },
      { name: "Kerala", leads: 66, bookings: 16 },
      { name: "Maldives", leads: 43, bookings: 12 },
      { name: "Switzerland", leads: 38, bookings: 8 },
    ],
    weeks: [
      { label: "Wk 1", leads: 112, bookings: 22 },
      { label: "Wk 2", leads: 124, bookings: 26 },
      { label: "Wk 3", leads: 139, bookings: 29 },
      { label: "Wk 4", leads: 146, bookings: 32 },
    ],
  },
};

export const DROP_OFFS = [
  {
    stage: "Chat started → Plan shared",
    insight: "Most drop-offs come at the budget question.",
    action: "Show a per-person price on the suggestion cards before asking for a budget.",
  },
  {
    stage: "Quote requested → Quote sent",
    insight: "Quotes sent after an hour convert at half the rate of those sent in 20 minutes.",
    action: "Keep the quote desk under 20 minutes; Quote Builder drafts the price as soon as the lead lands.",
  },
  {
    stage: "Quote sent → Booked",
    insight: "Travellers who got the designed PDF booked 1.6× more often than plain-text quotes.",
    action: "Send every quote as a Trip Documents PDF, with a WhatsApp follow-up after 24 hours.",
  },
];
