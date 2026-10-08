# What a Suite Is

A suite is one industry’s end-to-end operating system. It is the desk a head of ops opens in the morning, plus the voice agents and worker agents that run the business process underneath it.

It is not a single chatbot. It is a command center, a process map, and an agent workforce, sold as one product for one industry.

This note is the shared definition behind Vibrium’s live suites. Travel Suite should follow the same shape. Travel use cases are not defined in this file yet.

## The company model

We build voice and automation workflow agents as an end-to-end solution.

1. A **voice agent** talks to the person (customer, partner, agent, borrower, merchant).
2. **Worker agents** then do the back-office steps on systems, documents, and rules.
3. Together, that workforce plus the ops console is called a **suite**.

The call starts the file. The workers carry it. A human decides only the exceptions.

## The three layers

Every suite has the same three layers. Only the industry content changes.

1. **Command Center** — what needs a human today, across the whole book of business.
2. **Process modules** — each stage of the business, with its own dashboard, squad, process map, and work queues.
3. **Agents** — voice agents that talk to people, worker agents that do system work, and a copilot that narrates facts. The copilot does not invent the numbers.

## Reference suites

| Suite | Live app | Who it is for | The book it runs |
|---|---|---|---|
| Trade | https://vibrium-trade-suite.vercel.app/ | Buying-agency ops | Enquiries, quotes, factories, cash cycle |
| Lending | https://lendingautomation.vercel.app/home | Head of Lending Ops | Lead → loan → KYC → disburse → collect |
| Insurance | https://insurance-automation-beta.vercel.app/ | Head of Insurance Ops | Health and Term: quote, underwrite, renew, claim |
| Payments | https://vibrium-payment-suite.vercel.app/home | VP / merchant ops | Pipeline, onboarding, collections, first transaction |
| Retail | https://retailautomation.vercel.app/home | Distributor | Trade, fulfilment, collections, coverage |

Retail’s home is a sign-in for a distributor console. The other four show the operating pattern in the product itself.

## How the screen is laid out

The product looks like an ops console, signed in as a named role.

Examples:

- Rajesh Kapoor, Head of Lending Ops
- Neha Kapoor, Head of Insurance Ops
- A signed-in payments user, VP

**Left rail**, grouped the way the business is grouped.

Insurance is the clearest nav:

- Intelligence — Command Center, AI Insights, Scenarios, Risk Radar, Insurance Copilot
- Growth — Leads, Quotes, Underwriting
- Book — Policies, Renewals, Claims
- Distribution — Broker Network, POSP Onboarding, Commissions
- Automation — Automations, Flow Builder, Digital Workers, Comms Hub, Approvals, Automation ROI
- Platform — Integrations, Settings

It also switches between Carrier Ops and a Broker Portal, and has search across policies, claims, and brokers.

Lending and Payments use a suite menu that jumps into one process at a time. Inside a process, the inner menu is always:

- Suite Home
- Dashboard
- Agentic Squad
- Process Map
- Then the work queues for that process

Trade uses the same idea on a sourcing desk: Command Center, Finance, Deal Board, Document Vault, Process map, Supplier Hub, Mailbox, and a book switcher (agency, trader, currency, finance process).

## Command Center

Home is always the Command Center. Lending and Payments build it the same way.

- A **KPI strip** across the book, each number with a movement (week over week, versus plan, percentage points).
- An **executive morning brief**, dated, written process by process.
- **Cross-process priority**: critical alerts with a case code and a next action, plus a numbered todo list with an owner.
- **Role views**: the same book, cut for each audience (CXO, ops, credit, collections, marketing). Each card opens the matching module and shows a small chart.
- A **process navigator**: every process has a one-line job, plus links to Dashboard, Squad, and Map.
- A **process-wise brief**: what the process does, and which human roles own it.

The brief is grounded. The product states that figures come from the system of record or a rules engine, and that agents only narrate. They do not invent AUM, FOIR, CIBIL, pipeline, or forecast numbers.

A todo looks like this: a rank, an action, an owner, and a case code. Example: “Decide LA-2026-GOLD before EOD — Neha Kapoor.”

An alert looks like this: severity, a short title, the case facts, and one next step. Example: a KYC SLA cluster, with the action “Failover DigiLocker path; escalate vendor.”

## Process module

Each business process is a module. Origination in Lending, Revenue in Payments, and Finance in Trade all follow this.

### Dashboard

The process-level command center: KPIs for that process, a shorter brief, priority alerts and todos, and the queues that matter (approvals, inbox, exceptions).

### Agentic Squad

One card per agent. A card carries:

- Name and job
- Live status and version
- Type: conversational, functional, or analytical
- Channels (voice, WhatsApp, SMS, email, portal, API, alerts, dashboard)
- Skills, marked core or advanced
- Inputs and outputs

Lending origination squad example:

| Agent | Type | What it does |
|---|---|---|
| Journey Orchestrator | functional | Routes the application and nudges stalled KYC or docs |
| KYC Verifier | functional | PAN, Aadhaar, CKYC, liveness |
| Doc Collector | conversational | Chases salary slips, bank statements, and ITR on WhatsApp and email, with OCR |
| Lead Scorer | analytical | Re-scores the lead for the ops queue |
| SLA Sentinel | functional | Watches clocks and escalates breaches |
| Comms Concierge | conversational | Stage messages: OTP, doc request, e-sign |

Payments revenue squad is analytical on purpose. Eight agents explain funnel, forecast, risk, priority, coaching, and the executive brief. The rules engine owns the numbers. The agents own the wording, the rationale, and the citations.

### Process map

A swimlane. It is the contract for the process.

- Rows are the actors: customer, voice agent, worker, human ops, accounts, system of record.
- Columns are the phases.
- Every step is numbered, named, and owned.
- Each step says what “done” means.

Lending origination phases: Intake → KYC → Documents → Complete → Govern. Twelve steps, from lead convert to SLA breach escalation.

Payments revenue phases: Ingest → Compute → Narrate → Deliver → Govern. Salesforce stays the system of record. The suite reads, computes, and narrates. Phase 1 does not write back to the CRM.

Trade finance phases, once PI and PO are in hand: Deploy to factory → Track exposure → Buyer recoveries → Commission settle. Lanes are Buyer, Agency Sourcing, Agency Accounts, and Factory. Accounts and Sourcing are the same agency, split only by function.

### Work queues

The rest of the module is where humans and agents work the book: leads, applications, journeys, drop-offs, SLAs, documents, exceptions, forecast, risk, priority deals, CRM sync. The exact queues depend on the industry. The pattern does not.

## How a day runs

1. Open the Command Center and read the brief.
2. Work today’s todos by case code, highest priority first.
3. Open the case. See the stage, the owner agent, the source email or call, and the decision a human still has to make.
4. Agents keep moving the file. Voice and WhatsApp talk to the person. Workers hit the systems.
5. Anything risky, over SLA, or over policy lands in an approval inbox. The human decides.
6. The process map says who owns the handoff and what done means.

Trade states the same day in four steps: open the Command Center and load the book, work today’s todos by deal code, open a deal and review the day-by-day timeline and source emails, then use buyers and factories when choosing who to contact.

## The case code

Every live file has a stable code. The code is the thread. Emails, calls, documents, scores, and agent actions stay on it.

Examples from the live suites:

- Lending: `LA-2026-GOLD` (Priya Sharma, personal loan, the golden path awaiting an underwriting decision)
- Payments: `OPP-8841`, `OPP-8655`, `MCH-2026-0022`, `COL-2215`, `MID-VB-88055`
- Insurance: `REN-H-2026-GOLD`, `UW-H-2026-GOLD`, `UW-T-2026-GOLD`, `ONB-2026-GOLD`, `CLM-H-2026-GOLD`, `BRK-2026-GOLD`
- Trade: deal codes on the book, with the original enquiry email stored on the deal

Golden-path cases are the demo stories. They are real-shaped files that walk a buyer, a lender, or an insurer through the happy path and the exception path.

## Agent model

There are three kinds of agent, plus a copilot.

### Voice and conversational agents

They talk to a person and start or continue the file.

Channels: voice, WhatsApp, SMS, email, portal.

Insurance examples:

- **Ayra** — insurance advisor. Qualifies leads, helps quotes, orchestrates cross-sell on Health and Term. Tools include a dialer, WhatsApp, CRM update, and a do-it-yourself quote link.
- **Sanvi** — claims concierge. Takes first notice of loss by voice, then chases documents and hospital updates on WhatsApp.
- **Medical Verifier** — recovers a medical underwriting drop-off as voice first, then WhatsApp stage agents.
- **Renewal Sentinel** — 60/30/15 day renewal cadence and lapse revival, on WhatsApp and voice.
- **POSP Activator** — drives invite, KYC, exam, license, bank mandate, and first-sale coaching until a point-of-sale person is activated.

The Medical Verifier line is the company pattern in one sentence: voice, then WhatsApp stage agents, with a human in the loop when something is wrong.

### Worker agents

They do a bounded job on systems, documents, or rules. They do not hold the conversation.

Lending examples: Journey Orchestrator, KYC Verifier, Policy Engine, Bureau Analyst, Fraud Guard, Disbursement Steward, Underwriter Assist.

Insurance examples: Onboarding Steward (KYC, e-sign, NACH, proposal completeness), Term Risk Analyst (drafts the loading memo), Commission Steward, Compliance Guard, Fraud Sentinel.

Payments examples: document, CKYC, DigiLocker, OCR, penny-drop, and risk-summary bots. Workflows send reminders and the welcome. Version 1 is deterministic rules. A cognitive agent can sit beside the rules. It does not replace them.

Trade examples: extract a buyer enquiry into commercial fields, score a factory on size, output, on-time, shipments, and quality, and keep the source email on the deal.

### Analytical agents

They explain a fact pack. They rank, word alerts, write the morning brief, and recommend a next action. They cite the facts they used.

Payments is the cleanest statement of this: funnel, forecast, risk, priority, coaching, executive briefing, section commentary, and threshold alerts. Each card lists inputs as a fact pack and outputs as narrative, rationale, or citations, plus a run id.

### Copilot

A copilot answers questions about the book and about one case code. Insurance Copilot briefs golden paths across underwriting, renewals, and claims. Lending Copilot briefs stay on the fact pack. The copilot narrates. It does not create a metric.

## Autonomy

Each worker has an explicit autonomy level. The suite shows it. It is not implied.

| Level | Meaning | Example |
|---|---|---|
| Fully auto | Runs until the step is complete | Onboarding Steward chases KYC and NACH until issuance |
| Auto with approval | Acts, then a human confirms the decision | Ayra, Medical Verifier, Sanvi, Renewal Sentinel, POSP Activator |
| Draft | Writes the memo, the script, or the statement. A human issues it | Term Risk Analyst, Advisor Assist, Commission Steward |
| Suggest | Flags and recommends. It does not decide | Fraud Sentinel, Compliance Guard |

High-ticket or policy-breaking actions use maker-checker or an approval queue. Lending disbursement uses maker-checker on high-ticket SME and home loans. The automation inbox holds policy deviations, field-visit authorizations, and disbursement authorizations, each with a priority and a case code.

## The operating rule

Systems compute the facts. Agents narrate and act. Humans approve the exceptions.

- Rules, the LMS, the CRM, or the analytics pack produce the numbers.
- Agents may route, chase, draft, score within a published rule, and explain.
- Agents may not invent a metric, a bureau score, a fare, or a balance.
- Explainability is a step on the process map: rationale, citations, and a run id.
- Hours saved are reported as automation ROI, sometimes converted to an FTE equivalent, next to worker success rate and pending approvals.

## What the automation layer contains

Across suites, the workforce layer is its own process, not a settings page.

- Digital workers, with status: working, idle, or waiting on approval
- Governed flows, including drafts that are not published yet
- An approvals inbox
- A comms hub for WhatsApp, SMS, email, and voice templates
- Automation ROI: hours saved, success rate, tasks by worker
- A copilot
- Integrations and settings

Lending’s automation home shows this as a normal command center: hours saved, worker success, pending approvals, active flows, a critical inbox, and a priority list.

## What this means for Travel Suite

Travel Suite is this same shell over a travel book.

The Command Center is the morning desk for a head of travel ops. Each use case becomes a process module with a dashboard, a squad, and a swimlane. The voice agent is the traveler-facing or agent-facing call. The worker agents touch the systems behind the booking: suppliers, documents, payments, changes, and service. A case code ties the call, the emails, and the booking together. The copilot briefs the desk from those facts. Approvals catch the exceptions.

The eight Travel Suite use cases live in `context/use-cases/`. Each one is a process module: command center facts, a squad, a swimlane, a case code, and a human gate on exceptions. Voice starts the file. Workers carry it. Unconfirmed supplier, CRM, rate, and payment connections stay marked pending.
