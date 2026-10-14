export const SUITE_NAME = "Vibrium Travel Suite";

export const OPERATOR = {
  name: "Leela Nair",
  role: "Head of Travel Ops",
  initials: "LN",
} as const;

export const BOOK_AS_OF_LABEL = "8 Oct 2026";

export const INTEGRATION_STATUS = {
  travelOne: "live",
  crm: "live",
  dialer: "live",
  rateSource: "live",
  paymentLink: "live",
  astra: "live",
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
