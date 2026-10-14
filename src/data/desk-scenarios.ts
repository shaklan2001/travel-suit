import type { TravelIntent } from "./corporate-desk";

export interface DeskScenario {
  id: string;
  orderLabel: string;
  title: string;
  intent: TravelIntent;
  summary: string;
  email: string;
  bullets: string[];
}

const VANILLA_SEARCH_EMAIL = `From: rahul@abccorp.in
To: corporatetravel@company.com
Subject: Flight booking

Hi Team,

I need to travel from Delhi to Mumbai on 13 Dec and return on 15 Dec.
Both flights preferably morning. Economy class.
Please share options.`;

const NEW_REQUEST_EMAIL = `From: ananya.mehta@acmecorp.in
To: corporatetravel@company.com
Cc: ea.rahul@acmecorp.in
Subject: Flight booking request — Ananya Mehta — 12 Oct DEL-BOM

Hello Travel Desk,

Please arrange a one-way flight for me as below:

Traveller: Ananya Mehta
From: Delhi (DEL)
To: Mumbai (BOM)
Date: 12 October 2026
Class: Economy
Preferred timing: evening departure around 7 PM
Passengers: 1
Cost centre: CC-4821

Please share available options for approval.

Thanks,
Ananya Mehta
Senior Manager — Sales
Acme Corp India`;

const CONFIRMATION_EMAIL = `From: ananya.mehta@acmecorp.in
To: corporatetravel@company.com
Subject: Re: Flight options — Ananya Mehta — 12 Oct DEL-BOM

Hi,

Thanks for the options. Please proceed with the 7 PM IndiGo option (around 19:05).

Traveller remains Ananya Mehta, DEL-BOM on 12 October 2026, economy, 1 pax.
Cost centre CC-4821.

Thanks,
Ananya`;

const MODIFICATION_EMAIL = `From: ananya.mehta@acmecorp.in
To: corporatetravel@company.com
Subject: Re: Flight options — Ananya Mehta — 12 Oct DEL-BOM

Hi team,

Can you please give me a cheaper morning option instead of evening? Client meeting moved up.

Also prefer IndiGo if possible. Same route DEL-BOM on 12 October 2026, economy, 1 pax.

Regards,
Ananya`;

const CLARIFICATION_EMAIL = `From: rahul.ea@acmecorp.in
To: corporatetravel@company.com
Subject: Booking needed for Mr Sharma

Hi,

Need a flight from Bangalore to Hyderabad for Mr Vikram Sharma, economy, 1 pax. Please send options ASAP.

Rahul
EA to Vikram Sharma
Acme Corp India`;

const FYI_EMAIL = `From: ea.rahul@acmecorp.in
To: sales.leadership@acmecorp.in
Cc: corporatetravel@company.com
Subject: FYI — Ananya travel next week

Team,

FYI only — Ananya will be in Mumbai next week for client meetings. No booking action needed on this thread; travel desk already engaged separately.

Rahul`;

const CANCELLATION_EMAIL = `From: ananya.mehta@acmecorp.in
To: corporatetravel@company.com
Subject: Re: Flight options — Ananya Mehta — 12 Oct DEL-BOM

Hi,

Please cancel this travel request. The Mumbai meeting has been postponed. Do not book any option.

Thanks,
Ananya`;

export const DESK_SCENARIOS: DeskScenario[] = [
  {
    id: "vanilla-search",
    orderLabel: "Search and quote",
    title: "Delhi → Mumbai · 13 Dec return 15 Dec · morning · economy",
    intent: "new_request",
    summary: "Standard search request. Understand the email. Search and quote come from TravelOne.",
    email: VANILLA_SEARCH_EMAIL,
    bullets: [
      "Intent classified as new_request",
      "Delhi → Mumbai, 13 Dec outbound, 15 Dec return, economy, morning",
      "Round trip, 1 passenger",
      "Next live step is TravelOne: token, traveller, emulation, flight search",
      "No fare is stored in this suite",
    ],
  },
  {
    id: "new-request",
    orderLabel: "1 · New request",
    title: "Flight booking request — Ananya Mehta — 12 Oct DEL-BOM",
    intent: "new_request",
    summary: "Show email → understand → policy → TravelOne options → quotation reply",
    email: NEW_REQUEST_EMAIL,
    bullets: [
      "Intent classified as new_request",
      "DEL → BOM evening preference extracted",
      "Acme policy applied",
      "3–5 flight options and a quotation email when TravelOne is connected",
      "Revalidation and booking skipped until the traveller confirms",
    ],
  },
  {
    id: "confirmation",
    orderLabel: "2 · Confirmation",
    title: "Re: Flight options — Ananya Mehta — 12 Oct DEL-BOM",
    intent: "confirmation",
    summary: "Confirmation is understood. Fare revalidated, payload prepared, then the manager approves before release.",
    email: CONFIRMATION_EMAIL,
    bullets: [
      "Intent classified as confirmation",
      "7 PM IndiGo option, around 19:05, matched from the thread",
      "Fare revalidation is not run in this milestone",
      "No booking payload. The booking schema has not been shared",
    ],
  },
  {
    id: "modification",
    orderLabel: "3 · Modification",
    title: "Re: Flight options — Ananya Mehta — 12 Oct DEL-BOM",
    intent: "modification",
    summary: "Show change request → updated preference → revised quotation",
    email: MODIFICATION_EMAIL,
    bullets: [
      "Intent classified as modification",
      "Morning, cheaper, IndiGo preference extracted",
      "Revised quotation reply drafted",
      "Previous evening option is not ticketed",
    ],
  },
  {
    id: "clarification",
    orderLabel: "4 · Clarification",
    title: "Booking needed for Mr Sharma",
    intent: "clarification",
    summary: "Show incomplete email → no unsafe search → clarifying questions",
    email: CLARIFICATION_EMAIL,
    bullets: [
      "BLR → HYD for Vikram Sharma — date missing",
      "Flight search skipped",
      "Clarifying questions drafted for the EA",
    ],
  },
  {
    id: "fyi",
    orderLabel: "5 · FYI suppress",
    title: "FYI — Ananya travel next week",
    intent: "fyi_internal",
    summary: "Show the desk does not auto-reply or book on FYI noise",
    email: FYI_EMAIL,
    bullets: [
      "Classified as fyi_internal",
      "Internal FYI — no action requested",
      "No auto-reply and no booking",
    ],
  },
  {
    id: "cancellation",
    orderLabel: "6 · Cancellation",
    title: "Re: Flight options — Ananya Mehta — 12 Oct DEL-BOM",
    intent: "cancellation",
    summary: "Show cancel request → stop booking → cancellation acknowledgement",
    email: CANCELLATION_EMAIL,
    bullets: [
      "Intent classified as cancellation",
      "Please cancel — meeting postponed",
      "Booking stopped and a cancellation reply drafted",
    ],
  },
];

export const PASTE_YOUR_OWN_ID = "paste";
