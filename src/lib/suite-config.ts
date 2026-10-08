export const SUITE_NAME = "Vibrium Travel Suite";

export const OPERATOR = {
  name: "Leela Nair",
  role: "Head of Travel Ops",
  initials: "LN",
} as const;

export const BOOK_AS_OF_LABEL = "8 Oct 2026";

/** Demo book only. These figures are narrated by the suite. They are not a live GDS or CRM feed. */
export const DEMO_BOOK_NOTE =
  "Demo book. Agents narrate these figures. Live rates, TravelOne, CRM, C-Zentrix, and payment links are not connected.";

export const INTEGRATION_STATUS = {
  travelOne: "pending",
  crm: "pending",
  dialer: "pending",
  rateSource: "pending",
  paymentLink: "pending",
  astra: "pending",
} as const;

export type IntegrationKey = keyof typeof INTEGRATION_STATUS;

export const INTEGRATION_LABELS: Record<IntegrationKey, string> = {
  travelOne: "TravelOne search and ticketing",
  crm: "CRM opportunity API",
  dialer: "C-Zentrix dialer and recordings",
  rateSource: "Live forex rate source",
  paymentLink: "Payment-link generator",
  astra: "Astra",
};
