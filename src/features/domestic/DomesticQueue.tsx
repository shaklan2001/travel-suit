import type { DomesticCallStage } from "../../data/domestic-tours";
import {
  COMPLETION_NPS_MAX,
  COMPLETION_NPS_MIN,
  DEMO_CANCELLATION_SLABS,
  DEMO_PACKAGES,
  IN_TOUR_RATING_MAX,
  planCalls,
  formatCalendarDay,
  STAGE_PURPOSE,
  VOICE_NO_ANSWER_FALLBACK_SECONDS,
  WORKFLOW_OPEN_ITEMS,
} from "../../data/domestic-tours";

const FOCUS_LABEL: Record<DomesticCallStage, string> = {
  pre_tour: "Pre-tour",
  in_tour: "In-tour",
  completion: "Tour completion",
};

interface DomesticQueueProps {
  focus: DomesticCallStage;
}

export function DomesticQueue({ focus }: DomesticQueueProps) {
  const plans = DEMO_PACKAGES.map((pkg) => planCalls(pkg));

  return (
    <div className="stack">
      <section className="card brief">
        <h2>{FOCUS_LABEL[focus]}</h2>
        <p>{STAGE_PURPOSE[focus]}</p>
        <p className="note">
          This Ravi is the domestic tour bot. Forex Ravi is a different agent. Guest name and package facts come from the booking.
        </p>
      </section>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Style</th>
              <th>Today</th>
              <th>Pre-tour</th>
              <th>In-tour</th>
              <th>Completion</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.pkg.code}>
                <td>
                  <strong>{plan.pkg.code}</strong>
                  <div>{plan.pkg.name}</div>
                  <div className="meta">{plan.pkg.botId} · {plan.pkg.nights} nights / {plan.pkg.days} days</div>
                </td>
                <td>{plan.pkg.tourStyle}</td>
                <td>{plan.dueToday ? FOCUS_LABEL[plan.dueToday] : `Day ${plan.dayNumber}, no call`}</td>
                <td>{formatCalendarDay(plan.preTourOn)}</td>
                <td>{formatCalendarDay(plan.inTourOn)}{plan.isLongTour ? " · second-last day" : ""}</td>
                <td>{formatCalendarDay(plan.completionOn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {plans.map((plan) => (
        <section className="card brief" key={plan.pkg.code}>
          <h3>{plan.pkg.name}</h3>
          <p>{plan.pkg.route}</p>
          <p className="meta">{plan.pkg.meals}. {plan.pkg.included}</p>
          {plan.pkg.demoOnlyNote ? <p className="note">{plan.pkg.demoOnlyNote}</p> : null}
        </section>
      ))}
      <section className="card brief">
        <h2>What the call will not decide</h2>
        <p>
          In-tour rating is out of {IN_TOUR_RATING_MAX}. Completion NPS is {COMPLETION_NPS_MIN} to {COMPLETION_NPS_MAX}.
          A refund, a date change, or a new charge is a callback. Ravi does not work the slab on the phone.
        </p>
        <ul className="rule-list">
          {DEMO_CANCELLATION_SLABS.map((slab) => (
            <li key={slab.chargePercent}>
              {slab.toDaysBefore === null
                ? `${slab.fromDaysBefore} days or more before departure`
                : `${slab.fromDaysBefore} to ${slab.toDaysBefore} days before departure`}
              {": "}
              {slab.chargePercent}%
            </li>
          ))}
        </ul>
      </section>
      <section className="card brief">
        <h2>Kashmir workflow</h2>
        <p>
          Live. No-answer fallback is {VOICE_NO_ANSWER_FALLBACK_SECONDS} seconds.
        </p>
        <ul className="rule-list">
          {WORKFLOW_OPEN_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
