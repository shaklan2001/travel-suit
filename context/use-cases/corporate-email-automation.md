# Corporate travel email automation

This is the corporate desk use case in full. The screen at `/corporate` demonstrates email understanding. It does not call TravelOne, and it does not store fares.

The public desk demo (Ananya Mehta, six CT-BT threads) shows how a thread is classified. The SOTC mail defines what to build first.

## What it is

An AI layer for corporate flight requests that arrive by email.

The traveller writes. A human counsellor would read the thread, search in TravelOne, send options, read the reply, search again if the trip changed, recheck the fare after a yes, and only then start ticketing.

The AI takes the understanding and the orchestration. TravelOne stays the system that searches and, later, books. The AI does not replace TravelOne.

## Who does what

| | |
|---|---|
| Traveller | Sends and replies to email |
| AI | Reads the whole thread, classifies intent, extracts the trip, keeps one case, applies rules, turns a TravelOne result into a quotation, understands the next reply, and stops when it is unsure |
| TravelOne | Token, traveller details, emulation, flight search, and later the booking APIs. System of record |
| Human | Ambiguity, conflicts, missing facts, low confidence, unsupported asks, API errors, booking exceptions |

## What the AI reads

Not the last line only. From, To, Cc, subject, body, and the earlier thread. One request can be spread across several mails. Changed subjects, forwards, several people, follow-ups, partial confirmations, and related threads stay on one case. The same thread is not processed twice.

## Intents

`NEW_REQUEST`, `MODIFICATION`, `CONFIRMATION`, `FOLLOW_UP`, `CANCELLATION`, `FYI`, `INTERNAL`, `HUMAN_INTERVENTION`.

The desk demo maps an incomplete mail to clarification, and an FYI with “no booking” to suppress. Follow-up and an explicit human-intervention intent are in the scope even where the demo uses the human gate instead of a separate label.

A reply of “option 2” or “the second one” means the second flight on the quotation already sent. “Around 7 PM” or “anything cheaper” is a modification, then a new search, then a new quotation. “Please proceed” is not a blind book.

## When search stays off

No date, no traveller, or an ambiguous instruction: ask, or hand to a human. Do not call TravelOne on a guess.

Configurable rules, per customer: preferred airlines, cabin, travel policy, quotation format, approval, escalation. The Acme threads in the demo are one client profile. ABC Corp in the SOTC example is another. Do not invent a fare cap or an approval rule that was not configured.

## TravelOne sequence for the first milestone

The current mail’s UAT flow, in order:

1. Generate token
2. Fetch traveller details
3. Emulation / context setup
4. Flight search
5. Search response

The Postman collection for that sequence was referenced in the mail. It is not in this repo. Do not invent the host, the token, or the response schema.

The AI does not paste the raw API body into the customer email. It writes a readable quotation. The exact layout is configurable per customer.

Illustrative rupee amounts in explanations are not fares. Nothing in this project hardcodes a price.

## Manager approval before ticketing

After a confirmation and a revalidated fare, the booking payload is prepared and held. The traveller's reporting manager approves the exact fare before the payload is released to TravelOne. Reject closes the case. A fare that moves after approval needs a new approval. Who the approver is, and any fare threshold, come from client configuration.

## After the traveller says yes

That is not this milestone.

Between the first search, the quotation, the confirmation, and ticketing, fare and seats are revalidated. If the fare moved, the traveller is told and must confirm again. Only then is a booking payload prepared.

The booking schema was not in the mail. Booking request APIs are shared after the first quote response is complete. Do not invent them.

## Human gate

Hand off when the mail is ambiguous, the instructions conflict, facts are missing, confidence is low, the request is unsupported, TravelOne errors, or the case is a booking exception. The human decides. The AI resumes from that decision. It does not guess a refundable evening Air India flight from a sentence that asks for all of those at once.

## Vanilla scenario to demonstrate first

SOTC’s first scenario, not a priced example:

- Delhi to Mumbai
- Outbound 13 December, return 15 December
- Economy
- Morning preferred
- One traveller

Success for the current POC is: the email is understood, TravelOne UAT search runs through token, traveller, emulation, and flight search, and the AI sends a customer-readable quotation. No booking.

## Phases after that

| Phase | Work |
|---|---|
| 1 | Email → search → quote. This is the milestone. |
| 2 | Modification → new search → new quote |
| 3 | Confirmation → fare and availability revalidation |
| 4 | Booking payload, from the real schema |
| 5 | TravelOne booking and ticketing API |
| Later | More customers, hotels, cancellations, amendments, approvals, other channels, analytics |

## How to talk about the build

Build an AI email agent for corporate flight requests. It understands the full conversation, extracts the trip, keeps one case, applies configured rules, calls TravelOne to search, writes the quotation, understands confirm and change, searches again when the trip changes, revalidates before any booking, and escalates risk. The first thing to demonstrate is email → TravelOne flight search → quotation. Booking starts only after that quote is accepted.
