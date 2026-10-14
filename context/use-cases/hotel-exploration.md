# Hotels — top of funnel, exploration, and booking

Suite design for hotel discovery before a committed stay. "TOFU" here means the top of the funnel: the traveller or the desk is still exploring, not checking in.

Availability, rates, and cancellation terms come from the hotel source at run time. This module does not store room rates.

## Voice, then workers

Voice: Stay Scout talks through city, dates, travellers, purpose, and must-haves (area, breakfast, cancellation).

Workers:

- Shortlist Ranker — three to five stays that match the brief, with the reason each one is there
- Budget Guard — compares the shortlist with the corporate cap once a cap is in config. If the cap is missing, it says so
- Availability Clerk — asks the hotel source. Until that source is connected, the shortlist is marked not live
- Quote Composer — drafts the options mail. Anika's pattern on the corporate desk: a draft, not a confirmation
- Booking Handoff — builds the hold request. A person releases the booking

## Golden path

`HT-2204`. A corporate stay in Mumbai, dates known, area preference known. Stay Scout has a shortlist. Availability is not live. The traveller has not confirmed, so nothing is booked.

## Human gate

A hold or a prepay waits for the traveller's confirm and, when the policy profile says so, an approver. The same rule as the corporate flight desk: no unsafe book.

## In-stay care (during the stay)

A guest has a problem during a stay booked through the desk: the AC, cleanliness, noise, Wi-Fi, food and service, billing, or safety. The `/hotels/queue` tab is the **Stay desk**. Left: the guest chats with Stay Care. Right: the ticket the stay desk sees. Logic lives in `src/data/stay-care.ts`; it is deterministic, not an LLM.

### Chat, then workers

Chat: Stay Care asks only what is still missing: the problem, the hotel and room, whether the front desk already knows, and what would help (fix it, move rooms, refund or credit, a person, or just log it). A detailed first message fills several answers at once.

Workers:

- Issue Triage: category, urgency, and the response clock
- Hotel Liaison: writes to the hotel's front desk, or the duty manager when the front desk has had it for over an hour or it is a safety issue. The hotel system is not connected, so the message is a draft
- Resolution Guard: flags a room move, a refund or credit, a callback, or a safety issue for the stay desk. It never approves one

Stay Care checks back. "Fixed" closes the case with a 1 to 5 rating; a rating of 2 or below is flagged for a stay desk follow-up. "Still not fixed" escalates to the duty manager and the stay desk, with a call to the guest within 15 minutes.

### Human gate

A room move, a refund or credit, a callback, and any safety issue wait for the stay desk, who decides with the hotel. Stay Care never promises a refund, a credit, or a free night, and it promises a call, not an outcome. For safety, it first tells the guest to call hotel reception or 112 if they are in danger.

### Demo values (made up for the demo, keep them configurable)

- Response clock: safety now (a person calls); a room failure (AC, power, water, lock) 30 minutes; cleanliness, noise, Wi-Fi, service 2 hours; billing before checkout. Medium issues the front desk has had for over an hour go up to high.
- Escalation call-back after "still not fixed": within 15 minutes.
- Demo stay: Seabreeze Business Hotel, Andheri, Mumbai, room 1412. The hotel is fictional.
- Golden path `HT-C-3107`: AC not working in room 1412, front desk told over an hour ago, guest asks for a room move, still not fixed, then fixed, rated 4. "Replay HT-C-3107 demo" plays it.
- Second open case `HT-C-3110`: a late checkout charge on the bill.
