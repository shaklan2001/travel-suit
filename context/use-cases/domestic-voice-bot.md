# Thomas Cook domestic voice bot

Context for the Travel Suite care modules. Owner: Nishant Shaklan (nishant@vibrium.ai), Vibrium. Last updated 8 October 2026.

This is a proof of concept for Thomas Cook India domestic holidays. It is not the forex bot. Forex Ravi is `VB00000214`. This Ravi calls guests who have already booked a domestic tour.

The prompt files named below are not in this repo. Booking facts in the prompts are hardcoded. There is no Raahi integration. Raahi is Thomas Cook’s booking and CRM system.

## Call stages

| Stage | When | Purpose |
|---|---|---|
| Pre-tour | Two days before departure | Reconfirm the booking. Prepare the guest: weather, documents, tips. Answer FAQs. |
| In-tour, short tour | Day 2. A short tour is up to 3 days. | Catch problems early. Rating out of 5, then hotel, transport, food, and sightseeing. |
| In-tour, long tour | Second-last day. A long tour is 4 days or more. | Nothing material should still be open when the tour ends. |
| Tour completion | Last day | Thank the guest, point to the feedback form, collect NPS from 0 to 10, offer future trips. |

After the demo is approved, the next use cases are on-tour support with a human handoff, and a broader post-tour NPS and feedback programme. The completion call in this POC already asks for NPS.

## People

| Organisation | People | Role |
|---|---|---|
| Thomas Cook India | Aman Mahajan, Sagar Saundekar (Domestic) | Approve the demo |
| Thomas Cook India | Vaskar Dasgupta (EBIZ) | Project sponsor |
| Vibrium | Abhinav Sharma (growth), Debasruti Mitra (client communication), Piyush Jha, Swapnil Chandwadkar (platform), Nishant Shaklan (prompts and agents) | Delivery |
| AuthBridge | Siddhesh Dalvi, Prerna Mathur | Channel and sales partner |

## What the first demo feedback changed

Aman, 17 September: the voice sounded human, but noise made it feel like a call centre; the bot only read a PDF and would not answer general destination questions; conversation stayed thin; pauses were long; the bot reacted to background voices.

30 September commitments:

- Answer general travel and destination questions, and stay inside Thomas Cook’s scope.
- Out of scope (refunds, booking changes, recalculated charges, compensation, or a request for a person): offer a Thomas Cook representative. There is no live transfer. A representative calls back.
- Totally unrelated topics: one-line decline, then back to the tour. Do not hang up for going off-topic.
- Persona is Thomas Cook. Ravi does not say “भाई” or “यार”. With an upset, scared, or unwell guest he is calm, confirms a problem at most once, and does not repeat a question already answered.
- WhatsApp on the free demo: skipped. The workflow’s WhatsApp node is a separate feature and is not approved.
- Package content Sagar sent: only two packages, one example per tour type.

## Agents

Speech-to-text and text-to-speech use Sarvam. Platform path: Vibrium Agents, then Voice Agent, on the verified workspace.

| Agent | ID | Status |
|---|---|---|
| Thomas Cook Domestic Travel Agent (Kashmir) | VB00000355 | Group-tour bot. Current. |
| Thomas Cook Domestic Travel Agent (Kerala) | VB00000215 | Customised-tour bot. Current. |
| Thomas Cook Pre Tour Agent | VB00000313 | Older pre-tour POC. Not the focus. |
| Thomas Cook Forex Agent | VB00000214 | Forex project. Different Ravi. |
| Thomas Cook Travel Tours | VB00000232 | Older. |

Two bots, because the questions differ. A group tour has a tour manager, a shared vehicle, first-come seats, fixed timings, and a group airport transfer at 10 AM. A customised tour has a private car and driver, no tour manager, and a flexible day. Separate prompts keep each call shorter.

The guest name is the only live variable: `{{GuestName}}`. It must match the platform variable. The first-message field has been rendering an empty name (“am I speaking with ?”). Put `{{GuestName}}` there, or leave the field empty and let the prompt open the call.

## Demo packages

These facts are the ones hardcoded for the demo. Do not add booking facts that are not listed here.

**Kashmir — Exotic Kashmir With Gulmarg Stay — PKG011485 — group — VB00000355**

- 6 nights / 7 days, 7 to 13 October.
- Srinagar houseboat (1 night), Pahalgam (2), Gulmarg (1), Srinagar (2).
- Meals: 6 breakfasts, 5 lunches, 6 dinners.
- Round-trip flights and insurance are included. GST is extra.
- Gondola ticket is not guaranteed. If it is unavailable, Buta Pathri is the alternative.
- Tour manager name “Vikram Joshi” is made up for the demo.

**Kerala — Colours of Kerala — PKG009251 — customised — VB00000215**

- 8 nights / 9 days, 7 to 15 October.
- Kochi (1), Munnar (2), Thekkady (1), Alleppey (1), Kumarakom (1), Kovalam (2).
- Breakfast only. Private AC sedan. All entry fees are extra.

Both prompts use the same cancellation slab: 0–7 days before departure, 100%. 8–21 days, 90%. 22–45 days, 50%. 46 days or more, 30%. A refund, a date change, or a recalculated charge is still a callback. Ravi does not compute it on the call.

On 8 October 2026 both departures are already on day 2, and both tours are longer than 3 days. The in-tour call is the second-last day (Kashmir 12 October, Kerala 14 October), not day 2. Pre-tour was 5 October. Completion is the last day (13 October and 15 October).

## How Ravi is prompted

Identity over a script. Priority order: safety, honesty, the guest feeling heard, usefulness, brevity. Stages are goals. The model chooses the wording.

Booking facts come only from the booking block. If a booking fact is missing, he offers a representative and does not guess. General travel advice is labeled as general.

Human handoff line: he says he will connect the guest with a representative. Urgent cases get an immediate callback. Serious cases get a call as soon as possible. Otherwise the guest picks the time. He promises the call, not an outcome.

The guest’s interruption wins. Stopping the audio mid-sentence is a platform barge-in setting, not a prompt. “Anything else?” and goodbye are separate turns. “Later” is not a goodbye. Garbled speech-to-text means ask them to repeat, not end the call.

Hindi words are written in Devanagari. English terms stay in Roman. Numbers, dates, and amounts are spoken as words. About two short sentences a turn, one question. He follows the language of the latest guest turn, including Hindi written in Roman letters by speech-to-text.

If asked sincerely whether he is human, he says he is Thomas Cook’s digital tour assistant. He does not claim to be human.

FAQ source tags from Thomas Cook’s sheet: Raahi (booking data), LLM (general knowledge), FHE (a human). All 180 FAQs were checked. The audit spreadsheet is not in this repo.

## Workflow

Vibrium Flow is the node builder. The Kashmir workflow is named “Thomas Cook Kashmir - Tour Call + WhatsApp Details”. It is a draft on the canvas and has not been saved.

```
Start → Segment → Voice call VB00000355
  ├─ completed → WhatsApp template → End
  └─ no answer within 300 seconds → Delay → Voice call retry
        ├─ completed → WhatsApp template → End
        └─ no answer within 300 seconds → End
```

A tour-details WhatsApp goes out only after a call connects. If neither call connects, nothing is sent.

Voice-call routes: Default when the call completes, Fallback with a number of seconds, Disposition from the bot. Kashmir currently has only “Customer Satisfied”. WhatsApp routes add Status and Reply.

Open before it can be saved and run:

1. No Thomas Cook segment exists. Example name: “Thomas Cook Kashmir – Demo”, with test numbers, or an internal test segment.
2. Both voice nodes need a campaign. The only choices are “Integrated Flow 2” and “API Integrated Flow”.
3. Delay is 60 seconds. Suggested wait before retry: 30 minutes. That suggestion is not signed off.
4. No Thomas Cook WhatsApp template exists. A proposed draft, `tc_tour_details`, Utility, English, would carry name, tour, dates, route, and tour manager, plus helpline 1800-2099-100. Creating it submits it to Meta. That needs explicit sign-off. WhatsApp itself is skipped for the free demo.
5. Save Draft needs Nishant’s go-ahead.
6. A Kerala workflow for VB00000215 has not been built.

## Platform issues the prompt cannot fix

- Empty name in the first message, as above.
- “Just checking if the call is connected” fires too early, and in English. That is the silence timer.
- Barge-in must be enabled, and should take about 2 to 3 words so background noise does not trip it.
- Noise, voice-activity sensitivity, and the latency Aman heard need a live call.
- Sarvam tone: the wording is calm. Whether the voice itself can be slower or calmer is a voice setting.

## Editing rule

Change both current bots together unless a rule belongs to only one tour type. A rule that came from a failed live call goes in the prompt body, with the failing exchange next to the correct reply, and again as a self-check question. Do not invent booking facts. Any new made-up demo value is listed in this file. Keep the prompt short. Extra tokens add latency on the call.
