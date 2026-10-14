import { CaseTable } from "../../components/ui/CaseTable";
import { CRM_STATUSES_AFTER_CALL, FOREX_RULES } from "../../data/forex-rules";
import type { QueueCase } from "../../data/types";
import { INTEGRATION_LABELS, INTEGRATION_STATUS } from "../../lib/suite-config";

/** The forex sale, in the order a customer lives it. The branch visit is always the last step. */
const JOURNEY = [
  { who: "Customer", does: "Calls, WhatsApps, or fills a web form: buy, sell, reload, or send money abroad." },
  { who: "Forex Desk", does: "The bot picks up, answers documents, timings, and how-it-works questions, and asks if they want to go ahead." },
  { who: "Ravi", does: "For the interested ones: product, currency, amount, travel date, purpose, and city. Cash or card only once the need is clear." },
  { who: "Rate Desk", does: "Live rate, charges, and TCS for the financial year. If the source is down, Ravi does not speak a number." },
  { who: "Ravi", does: "Reads out the quote. If the customer wants to lock the rate, he sends an advance payment link. Never a card number on the call." },
  { who: "Branch Handoff", does: "Books the nearest branch and a slot, and sends the list of originals to bring." },
  { who: "Branch counter", does: "The customer visits. KYC is checked in person, the balance is paid, and the card or cash is handed over." },
];

export function ForexQueue({ cases }: { cases: QueueCase[] }) {
  return (
    <div className="stack">
      <section className="section">
        <h2>Open forex leads</h2>
        <CaseTable cases={cases} />
      </section>
      <section className="card brief">
        <h2>How a forex enquiry runs</h2>
        <ol className="rule-list">
          {JOURNEY.map((step) => (
            <li key={step.does}>
              <b>{step.who}.</b> {step.does}
            </li>
          ))}
        </ol>
        <p className="note">
          The advance is optional. The branch visit is not: every sale ends with physical KYC at a branch, or at the
          doorstep where the branch confirms it.
        </p>
      </section>
      <section className="card brief">
        <h2>Forex rules</h2>
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
      </section>
      <section className="card brief">
        <h2>Connections</h2>
        <ul className="rule-list">
          {Object.entries(INTEGRATION_STATUS).map(([key, status]) => (
            <li key={key}>
              {INTEGRATION_LABELS[key as keyof typeof INTEGRATION_STATUS]} — {status === "live" ? "Connected" : status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
