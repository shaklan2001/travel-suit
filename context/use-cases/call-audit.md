# Call Audit

Source: Vibrium project context for Thomas Cook India (TCIL) Forex, 8 Oct 2026, generalised to every line that records calls. Owner: Nishant Shaklan.

Today a Quality team audits calls by hand: they listen to a small sample and fill a sheet. Call Audit automates that for every recorded call, on the form for that line. It is a separate module from the sales flows it audits (forex, holidays, corporate, tour care). Route: `/audit`.

## Flow in the suite

1. **Collect.** Recording Intake pulls the night's recordings and groups every call on one opportunity.
2. **Transcribe.** Call Transcriber: telephony audio, Hindi, English, and Hinglish, speakers and timestamps.
3. **Score.** QC Evaluator scores the line's form, pass or fail per row, with an evidence quote.
4. **Review.** The Quality lead listens only to calls below the bar and can override a row with a reason.
5. **Coach.** Coaching Notes drafts feedback per counsellor; a team lead sends it.

## Lines and forms

| Line | Form | Status |
|---|---|---|
| Forex sales | 31-point sheet, `src/data/forex-scorecard.ts` | Configured |
| Holiday sales | Not shared | `[PENDING]` |
| Corporate desk | Not shared | `[PENDING]` |
| Tour care | Not shared | `[PENDING]` |

Forms live in config. Rows and weights are never hard-coded in a component.

## Forex sales audit (QC Agent) `[CONFIRMED]`

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
