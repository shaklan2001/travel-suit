# Travel Suite use cases

Nine process modules. Same suite shape as `context/suite/what-is-a-suite.md`: Command Center, then Dashboard, Agentic Squad, Process Map, and a work queue per process.

The product shell is the Vibrium Travel Suite. Corporate desk, forex, and the domestic voice bot have a source behind them. Airlines, hotels, and trip planning are still suite design. Where a supplier API, rate, or booking system is not connected, the suite says so.

| Process | Route | Source | Voice, then workers |
|---|---|---|---|
| Corporate Travel Desk | `/corporate` | SOTC email automation and the [TravelOne desk](https://thomas-cook-travel-planner.vercel.app/) | Understand the thread, then TravelOne search and a quotation. Booking APIs come later. |
| Forex Assistance | `/forex` | TCIL Forex context, 8 Oct 2026 | Forex Desk bot answers the enquiry. Forex Ravi (`VB00000214`) captures the need, quotes from a live rate, and offers an optional advance link. Every sale ends with a branch visit for KYC. |
| Pre-tour | `/prebook` | Domestic voice bot, 8 Oct 2026 | Outbound Ravi, two days before departure. Reconfirm, prepare, answer FAQs. |
| In-tour | `/during` | Domestic voice bot, 8 Oct 2026 | Day 2 on a tour of up to 3 days. Second-last day when the tour is 4 days or longer. |
| Tour completion | `/post` | Domestic voice bot, 8 Oct 2026 | Last day. Thank-you, feedback form, NPS 0 to 10. |
| Airlines reservation support | `/airlines` | Suite design | Reservation voice agent, then PNR, schedule, and refund workers. Carrier rules are config. |
| Hotel exploration, booking, and stay care | `/hotels` | Suite design | Top-of-funnel stay scout, then shortlist, budget guard, and booking handoff. During the stay, Stay Care takes a guest's problem to the hotel; the stay desk approves room moves and credits. |
| Call audit | `/audit` | TCIL Forex QC context, generalised | Every recorded call transcribed and scored on its line's form, with evidence. Replaces a manual sample. Forex sales form is live; other lines wait on their forms. |
| Trip planning | `/planner` | Suite design, shaped on a full-line travel company | Chat that suggests places with photos, plans the days, and estimates the budget. Voice callback, then a holiday expert quotes. |

## Rules that apply to every module

- A case code is the thread. Emails, calls, and agent actions stay on it.
- Figures on the Command Center are a demo book. Agents narrate them. They are not a live GDS, CRM, or rate feed.
- The Trip Planner shows budget ranges from configured cost bands, always labelled as estimates. They are never a fare, a rate, or a quote. Every other module still stores no price.
- The Automation pages (`/agents`, `/workflows`) show the whole Vibrium stack: voice and chat agents, worker agents, and the workflows that chain them. A workflow whose integration is pending says so; a draft shows no runs.
- Live forex rates are never stored in the app. Confirmed TCIL thresholds (TCS, cash limit, link expiry, rate-hold window) live in config because TCIL will change them.
- Payment card numbers are never taken on a call. Forex payment is a link.
- Customer recordings and real opportunity files stay out of the repo.
- Pending TCIL systems (CRM API, C-Zentrix API, rate source, payment link, Astra) are named as pending. They are not stubbed as if they exist.

Detail for each use case is in the matching file in this folder.
