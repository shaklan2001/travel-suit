# Travel Suite use cases

Eight process modules. Same suite shape as `context/suite/what-is-a-suite.md`: Command Center, then Dashboard, Agentic Squad, Process Map, and a work queue per process.

The product shell is the Vibrium Travel Suite. Corporate desk, forex, and the domestic voice bot have a source behind them. Airlines, hotels, and ride planning are still suite design. Where a supplier API, rate, or booking system is not connected, the suite says so.

| Process | Route | Source | Voice, then workers |
|---|---|---|---|
| Corporate Travel Desk | `/corporate` | SOTC email automation and the [TravelOne desk](https://thomas-cook-travel-planner.vercel.app/) | Understand the thread, then TravelOne search and a quotation. Booking APIs come later. |
| Forex Assistance | `/forex` | TCIL Forex context, 8 Oct 2026 | QC scores recorded sales calls. Forex Ravi (`VB00000214`) can take a lead through a payment link. Branch KYC still happens in person. |
| Pre-tour | `/prebook` | Domestic voice bot, 8 Oct 2026 | Outbound Ravi, two days before departure. Reconfirm, prepare, answer FAQs. |
| In-tour | `/during` | Domestic voice bot, 8 Oct 2026 | Day 2 on a tour of up to 3 days. Second-last day when the tour is 4 days or longer. |
| Tour completion | `/post` | Domestic voice bot, 8 Oct 2026 | Last day. Thank-you, feedback form, NPS 0 to 10. |
| Airlines reservation support | `/airlines` | Suite design | Reservation voice agent, then PNR, schedule, and refund workers. Carrier rules are config. |
| Hotel exploration and booking | `/hotels` | Suite design | Top-of-funnel stay scout, then shortlist, budget guard, and booking handoff. |
| Ride planning | `/rides` | [Pure Motorcycling community](https://re-community-ruby.vercel.app/) | CX assistant for the rider. Route and group-ride workers. The iRide portal holds the live ride. |

## Rules that apply to every module

- A case code is the thread. Emails, calls, and agent actions stay on it.
- Figures on the Command Center are a demo book. Agents narrate them. They are not a live GDS, CRM, or rate feed.
- Live forex rates are never stored in the app. Confirmed TCIL thresholds (TCS, cash limit, link expiry, rate-hold window) live in config because TCIL will change them.
- Payment card numbers are never taken on a call. Forex payment is a link.
- Customer recordings and real opportunity files stay out of the repo.
- Pending TCIL systems (CRM API, C-Zentrix API, rate source, payment link, Astra) are named as pending. They are not stubbed as if they exist.

Detail for each use case is in the matching file in this folder.
