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
