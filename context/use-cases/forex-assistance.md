# Forex Assistance

Source: Vibrium project context for Thomas Cook India (TCIL) Forex, 8 Oct 2026. Owner: Nishant Shaklan.

Two use cases, one process module.

| # | Use case | What it does | Priority |
|---|---|---|---|
| 1 | QC Agent | Transcribes recorded sales calls and scores the seller on TCIL's 31-parameter quality form, with evidence | First. Audit data already exists |
| 2 | Forex voice agent, Ravi | Talks to a forex lead, understands the trip, recommends a product, quotes from a live rate source, and completes the transaction including payment | Second, designed in parallel |

One BRD per use case. Anything outside the SOW and the BRD is out of scope. The BRD needs process flows, the technology stack, and a high-level architecture diagram.

Tags used below: `[CONFIRMED]` stated by TCIL. `[PENDING]` needed from TCIL, do not hard-code. `[ASSUMPTION]` Vibrium's working guess, keep it configurable.

## Do not invent

Do not invent TCIL systems, API paths, CRM field names, the payment gateway, Astra, live rates, or policies. Astra's purpose is `[PENDING]`. Live rates are never hard-coded. Persona rate ranges are stale and must not be used. Customer recordings contain PII. They are not stored in this repo, not logged, and not sent to a third party unless TCIL InfoSec approves.

## As-is process `[CONFIRMED]`

- CRM holds leads. SSO. Opportunity screen. Incidents. Platform name `[PENDING]`.
- C-Zentrix is the dialer and the recording store. Every call is routed through it.
- Sellers use the dialer and email. Leads can arrive from WhatsApp. Sellers do not chat on WhatsApp or SMS. A post-transaction feedback survey on WhatsApp is in the script. Confirm that exception `[PENDING]`.
- TCIL Holidays already has CRM and C-Zentrix integrated with Vibrium. Reuse that as a reference, and confirm before documenting it as forex architecture.
- Lead sources: toll-free, website, Forex app, Blinkit, WhatsApp.
- Status after a call is only Booked, Follow-up, or Lost, plus a sub-status. "Quote sent" is not a status. Lost needs a lost reason.
- Seller fields include quoted net rate, callback, branch, travellers, destination, travel start, and notes. Exact names `[PENDING]`.
- On Booked: sale value, payment reference, mode (UPI, net banking, RTGS, credit card), payment date.
- After payment, the nearest branch does physical KYC and hands over cash or card. Video KYC is rare, mainly card reloads or a Blinkit card. Blinkit can deliver a card in about 10–15 minutes. Doorstep delivery is branch staff. First-call resolution is about 40–50%.

Outbound: form creates an Uncalled lead, CRM triggers the dialer, a seller gets the opportunity popup, the seller runs the script and updates CRM.

Inbound: toll-free connects a seller. The seller searches by phone or email and creates a contact and opportunity if needed. Sales follows the same conversation. Service (card issues, delivery, refunds, branch) is an Incident.

## Script rules to keep in config `[CONFIRMED]`

- Buy captures amount and currency, travel date, purpose, documents for that purpose, and current city. Sell captures leftover amount, passport and PAN, and city. Reload matches buy. Remittance captures amount and currency, purpose, documents, and city.
- If the customer asks for price first, collect the details, then check the rate.
- Documents: original Indian passport, original PAN, valid visa, air tickets. Study needs a university, CAS, or I-20 letter. Employment needs an employment letter with a joining date. Immigration needs the immigration or PR letter.
- Business or corporate payment account → branch only (RBI). NRI or OCI → branch only. No third-party payment. Payment is from the traveller's personal savings account.
- Cash limit: max USD 3,000 or equivalent. Prefer less cash and more card.
- TCS: transactions this financial year (1 Apr–31 Mar). Above INR 10 lakh → 20% TCS, students excepted. Applies to Buy, Reload, and Remittance.
- Doorstep: address within 6–7 km of the branch, confirm with the branch. Below USD 500 equivalent, INR 500 delivery charge. Above that, free. Confirm with the branch.
- Payment link, never card numbers on the call. Link valid 30 minutes. After payment, rate held 48 hours. Customer visits the branch inside that window.
- Modes: net banking (INR 50), UPI (no charge, recommended), debit or credit card (1.7%), NEFT/RTGS only to the Thomas Cook India Pvt. Ltd. account.
- If the customer refuses online payment, rebut, then route the lead to the branch and email the template.

## QC Agent `[CONFIRMED]`

- Unit of audit is one opportunity across all of its calls.
- Start with first calls, inbound and outbound. Then follow-up chains. Then lost calls.
- Phase 1 input is files on a password-protected drive. Phase 2 is the C-Zentrix audio stream plus the CRM API.
- Each parameter is pass (full weight) or fail (0). No partial credit. Weights sum to 100.
- One interruption fails the interruption parameter.
- A parameter must be done in totality. A partial card-features pitch fails.
- N/A handling is `[PENDING]`. The sheet has no N/A column. Non-applicable items were marked Green.
- Parameters 25 and 27–29 need email or CRM evidence, not only audio.
- The acceptable score is TCIL's number and will change. Keep it in config.
- Compare AI scores to the September 2026 human audits. Separate "AI wrong" from "human missed".
- The three section names (Soft Skills, Product & Sales, Tool Handling) are not on the sheet. Any section column is `[ASSUMPTION]`.

The 31 parameter texts and weights are in `src/data/forex-scorecard.ts`, which is the config copy of the September sheet. Real recordings, opportunity ids, and transcript PII are not in the repo.

Conceptual pipeline, technology not finalised `[ASSUMPTION]`: ingest and group by opportunity, encrypted storage, telephony speech-to-text with speaker labels and timestamps, PII redaction for display, silence and overlap features, a per-parameter judgement with a quote and a timestamp, optional CRM and email for the tool-handling rows, a score from config weights, human override with an audit log, and a dashboard.

## Ravi `[CONFIRMED]` plus the conflicts to avoid

- Male forex representative of Thomas Cook India. English, Hindi, and Hinglish. Starts in Hinglish and mirrors the customer. Hindi in Devanagari. Forex terms stay in Roman.
- Does not narrate reasoning, does not recommend before the need is understood, does not claim a rate is live unless it came from a live source, and does not close without asking what else the customer needs.
- Saying whether he is an AI is an InfoSec and legal check `[PENDING]`.
- Latest minutes: the endpoint includes payment, not only a handoff to a seller `[CONFIRMED]`. Physical KYC is still the norm. A realistic "complete" is payment done, branch or delivery assigned, CRM = Booked `[ASSUMPTION]`.
- Inbound versus outbound scope for Ravi is `[PENDING]`.
- Persona TCS of INR 7 lakh conflicts with the script. Use INR 10 lakh.
- Persona lounge access and Mastercard-only conflicts with the script (VISA and Mastercard, no lounge in the script). Reconcile `[PENDING]`.
- Persona document names BTQF and LERMS conflict with the script document list. Use the script list until TCIL says otherwise.

## Integrations `[PENDING]`

CRM, C-Zentrix, live card/cash/remittance rates, payment-link generation, email templates, and Astra. Do not guess Astra. Payment by link is the working assumption for PCI. InfoSec still confirms it.
