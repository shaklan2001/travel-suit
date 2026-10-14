import { CaseTable } from "../../components/ui/CaseTable";
import {
  DEMO_JUDGEMENTS,
  DEMO_QC_CASE_CODE,
  SCORECARD,
  SECTION_LABELS,
  summarizeDemoScore,
} from "../../data/forex-scorecard";
import type { QueueCase } from "../../data/types";

/** Which call lines are audited, and on which form. */
const AUDIT_LINES = [
  { line: "Forex sales", calls: "Inbound and outbound DFC calls", form: `${SCORECARD.length}-point sheet`, status: "Live" },
  { line: "Holiday sales", calls: "Holiday expert quote calls", form: "Holiday quote-call sheet", status: "Live" },
  { line: "Corporate desk", calls: "Counsellor calls with travellers and EAs", form: "Corporate desk sheet", status: "Live" },
  { line: "Tour care", calls: "Representative callbacks on domestic tours", form: "Tour care sheet", status: "Live" },
];

export function AuditQueue({ cases }: { cases: QueueCase[] }) {
  const summary = summarizeDemoScore(SCORECARD, DEMO_JUDGEMENTS);

  return (
    <div className="stack">
      <section className="card brief">
        <h2>Manual audit, automated</h2>
        <p>
          Today a Quality team listens to a small sample of calls by hand. Here every recorded call is transcribed and
          scored on its line’s form. People listen only to the calls below the bar.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Line</th>
                <th>Calls</th>
                <th>Form</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_LINES.map((row) => (
                <tr key={row.line}>
                  <td>{row.line}</td>
                  <td>{row.calls}</td>
                  <td>{row.form}</td>
                  <td>
                    <span className={row.status === "Live" ? "status-pill ok" : "status-pill"}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="section">
        <h2>Audit queue</h2>
        <CaseTable cases={cases} />
      </section>
      <section className="card brief">
        <h2>Forex sales · {DEMO_QC_CASE_CODE}</h2>
        <p>
          Reviewed rows: {summary.earnedWeight} of {summary.judgedWeight} weight passed ({Math.round((summary.earnedWeight / summary.judgedWeight) * 100)}%).
          Below the bar, so it goes to the Quality lead.
        </p>
        <p className="note">
          One interruption fails that row. A partial card pitch fails.
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
              {SCORECARD.filter((parameter) => DEMO_JUDGEMENTS.some((item) => item.parameterId === parameter.id)).map((parameter) => {
                const judgement = DEMO_JUDGEMENTS.find((item) => item.parameterId === parameter.id);
                return (
                  <tr key={parameter.id}>
                    <td>{parameter.id}</td>
                    <td>{parameter.text}</td>
                    <td>{parameter.weight}</td>
                    <td>{SECTION_LABELS[parameter.section]}</td>
                    <td className={judgement?.result}>{judgement ? labelResult(judgement.result) : null}</td>
                    <td>{judgement?.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
  return "Needs evidence";
}
