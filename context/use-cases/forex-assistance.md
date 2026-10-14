# Forex Assistance

Source: Vibrium project context for Thomas Cook India (TCIL) Forex, 8 Oct 2026. Owner: Nishant Shaklan.

This module is the forex sale only. Auditing the calls that sellers make (the QC Agent) is its own module, Call Audit, in `call-audit.md`. Do not mix the two.

## Flow in the suite

1. **Enquiry.** Toll-free call, WhatsApp, website, Forex app, or Blinkit form: buy, sell, reload, or remittance.
2. **Forex Desk bot answers.** Picks up every enquiry, answers documents, timings, and how-it-works questions, and asks if the customer wants to go ahead. It never quotes a rate. Not interested → closed as answered.
3. **Ravi captures the need.** Product, currency, amount, travel date, purpose, documents, and city. Cash or card only once the need is clear.
4. **Rate Desk quotes from the live rate.** Rate, charges, and TCS for the financial year. Source down → no number.
5. **Optional advance.** If the customer wants to lock the rate, Ravi sends a payment link (30 minutes; rate held 48 hours). No card number on the call.
6. **Branch visit, always.** Branch Handoff books the nearest branch and a slot and sends the originals to bring. The customer visits; KYC is done in person, the balance is paid, and the card or cash is handed over. Doorstep only where the branch confirms it.

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
