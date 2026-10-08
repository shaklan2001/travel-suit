import {
  DEMO_JUDGEMENTS,
  DEMO_QC_CASE_CODE,
  SCORECARD,
  SECTION_LABELS,
  summarizeDemoScore,
} from "../../data/forex-scorecard";
import { CRM_STATUSES_AFTER_CALL, FOREX_RULES } from "../../data/forex-rules";
import { INTEGRATION_LABELS, INTEGRATION_STATUS } from "../../lib/suite-config";

const RAVI_STEPS = [
  "Open in Hinglish, then mirror the customer’s language.",
  "Capture product: buy, sell, reload, or remittance, plus purpose, date, city, and documents.",
  "Recommend cash or card only after the need is clear. Cash stays at or under the configured limit.",
  "Quote only from a live rate source. If that source is pending, do not speak a number.",
  "Check TCS for the financial year, and whether payment is from a personal savings account.",
  "Send a payment link. Never take a card number on the call.",
  "After payment, assign the branch. The customer brings originals. CRM status becomes Booked.",
];

export function ForexQueue() {
  const summary = summarizeDemoScore(SCORECARD, DEMO_JUDGEMENTS);

  return (
    <div className="stack">
      <section className="card brief">
        <h2>Confirmed rules in config</h2>
        <ul className="rule-list">
          <li>Cash limit USD {FOREX_RULES.cashLimitUsdEquivalent.toLocaleString("en-IN")} equivalent. Prefer card.</li>
          <li>
            TCS {FOREX_RULES.tcsRatePercent}% above {FOREX_RULES.tcsThresholdLabel} in {FOREX_RULES.financialYearLabel}.
            {FOREX_RULES.tcsStudentsExempt ? " Students are exempt." : ""}
          </li>
          <li>Payment link valid {FOREX_RULES.paymentLinkValidMinutes} minutes. Rate held {FOREX_RULES.rateHoldHours} hours after payment.</li>
          <li>UPI fee INR {FOREX_RULES.upiFeeInr}. Net banking INR {FOREX_RULES.netBankingFeeInr}. Card {FOREX_RULES.cardProcessingPercent}%.</li>
          <li>Doorstep within {FOREX_RULES.doorstepRadiusKm} km, confirmed with the branch.</li>
          <li>CRM status after a call: {CRM_STATUSES_AFTER_CALL.join(", ")}. Quote sent is not a status.</li>
        </ul>
        <p className="note">No live forex rate is stored. Astra, CRM, C-Zentrix, and the payment-link API are pending.</p>
      </section>
      <section className="card brief">
        <h2>Connections</h2>
        <ul className="rule-list">
          {Object.entries(INTEGRATION_STATUS).map(([key, status]) => (
            <li key={key}>
              {INTEGRATION_LABELS[key as keyof typeof INTEGRATION_STATUS]} — {status}
            </li>
          ))}
        </ul>
      </section>
      <section className="card brief">
        <h2>QC · {DEMO_QC_CASE_CODE}</h2>
        <p>
          Audio rows in this demo: {summary.earnedWeight} of {summary.judgedWeight} weight passed.
          Pending evidence weight: {summary.pendingWeight}. This is not a TCIL score out of 100.
        </p>
        <p className="note">
          Section names are an assumption. One interruption fails that row. A partial card pitch fails. Quotes below are synthetic.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Parameter</th>
                <th>Wt</th>
                <th>Section</th>
                <th>Result</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {SCORECARD.map((parameter) => {
                const judgement = DEMO_JUDGEMENTS.find((item) => item.parameterId === parameter.id);
                return (
                  <tr key={parameter.id}>
                    <td>{parameter.id}</td>
                    <td>{parameter.text}</td>
                    <td>{parameter.weight}</td>
                    <td>{SECTION_LABELS[parameter.section]}</td>
                    <td className={judgement?.result ?? "pending"}>
                      {judgement ? labelResult(judgement.result) : "Not in this slice"}
                    </td>
                    <td>{judgement?.reason ?? "Left for a full audit."}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card brief">
        <h2>Ravi · voice, then payment link</h2>
        <ol className="rule-list">
          {RAVI_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function labelResult(result: "pass" | "fail" | "pending_evidence"): string {
  if (result === "pass") {
    return "Pass";
  }
  if (result === "fail") {
    return "Fail";
  }
  return "Pending evidence";
}
