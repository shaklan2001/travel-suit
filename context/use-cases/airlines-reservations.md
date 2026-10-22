# Airlines — customer service and reservation support

Suite design for a carrier or a desk that supports reservations. Not a confirmed airline API. PNR contents, fare rules, and refund eligibility come from the carrier system at run time. This module does not store fares and does not invent a waiver.

## Voice, then workers

Voice: Reservation Desk takes the call — new booking question, change, seat, special service, or refund.

Workers:

- PNR Reader — pulls the reservation the carrier system returns. If the lookup is pending, the case stays in review
- Schedule Watch — detects a time change or cancellation on a held PNR
- Change Drafter — writes the change for a human to release
- Service Clerk — meals, wheelchair, seat, frequent-flyer note

## Golden path

`AR-7721`. Schedule change on a held reservation. The voice agent tells the traveller the flight moved. Change Drafter prepares the options. A reservations lead releases the reissue.

## Human gate

Anything that reissues, refunds, or splits a ticket waits for a person. The agent can read status and draft the next step.
