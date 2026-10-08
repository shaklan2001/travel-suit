# Corporate Travel Desk Automation

The end-to-end project, the TravelOne boundary, and the current POC milestone are in `corporate-email-automation.md`.

Source for the six demo threads: https://thomas-cook-travel-planner.vercel.app/

Current build stops at email understanding plus a TravelOne search and a quotation. Token, traveller, emulation, and flight search are the UAT sequence. The Postman collection is not in this repo. Fare revalidation and the booking API come after that quote is validated. This desk does not call TravelOne and does not store a fare.

The desk pastes a corporate travel email, or runs one of six CT-BT demo threads, through one nine-agent fleet. Routing is adaptive. Agents that do not belong on that path are skipped on purpose. Revalidation runs only after the traveller confirms an option. FYI mail does not get a reply and does not get a booking.

Client on the demo thread: Acme Corp India. Traveller: Ananya Mehta. Desk address: corporatetravel@thomascook.in. Search and ticketing stay on TravelOne. This suite shows the same path. It does not call TravelOne.

## The six email paths

| # | Intent | What the thread shows | What must not happen |
|---|---|---|---|
| 1 | `new_request` | Flight booking request, Ananya Mehta, 12 Oct, DEL–BOM, economy, evening around 7 PM, 1 passenger, cost centre CC-4821 | No revalidation and no booking until she confirms |
| 2 | `confirmation` | She accepts the 7 PM IndiGo option, around 19:05 | Fare and seats are revalidated, then a ticketing payload is built. Ticketing still happens on TravelOne |
| 3 | `modification` | She wants a cheaper morning option, IndiGo if possible. Same route and date | A revised quotation. The old option is not ticketed |
| 4 | `clarification` | EA Rahul asks for Bangalore–Hyderabad for Vikram Sharma, economy, 1 passenger. No date | No search. The desk asks for the missing date |
| 5 | `fyi_internal` | Rahul tells sales leadership Ananya will be in Mumbai. Travel desk is only on cc. "No booking action needed" | No auto-reply and no booking |
| 6 | `cancellation` | "Please cancel this travel request. Do not book any option." | Stop booking work. Send a cancellation acknowledgement |

## Fleet

| Order | Key | Name in the desk | Job |
|---|---|---|---|
| 1 | `email_classifier` | Intent Router | Classify and decide the path |
| 2 | `email_extractor` | Aarav | Read the thread and structure the trip |
| 3 | `case_linker` | Case Linker | Attach the mail to the case. Watch duplicate risk |
| 4 | `policy_guard` | Policy Guard | Apply the corporate policy profile. Block an unsafe book |
| 5 | `flight_options` | Meera | Turn a TravelOne search into ranked options and a quote mail |
| 6 | `fare_revalidator` | Fare Revalidator | Revalidate fare and seats before ticketing |
| 7 | `booking_payload` | Sara | Build the TravelOne handoff payload. She does not ticket |
| 8 | `reply_composer` | Anika | Draft the mail the desk would send |
| 9 | `orchestrator` | Kabir | Next best action, including human escalation |

Green means the agent ran. A grey skip is correct for that path, not a failure.

## Path notes from the desk

- New booking: classify → extract → case → policy → search/quote → reply → next actions.
- Confirmation: match the selected flight → revalidate → build the payload when it is safe → acknowledge the traveller.
- Change: update preferences → search again → revised quotation.
- Incomplete: missing fields block search. The desk asks. It does not guess.
- FYI: do not search and do not book.
- Cancellation: stop booking, acknowledge, close the case.
- If policy blocks the trip, the case escalates. It does not book.

Fares are not stored here. A live quote comes from TravelOne at run time.
