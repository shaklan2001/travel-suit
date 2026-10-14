import { PROCESSES } from "./book";
import type { AlertItem, DayVolume, ProcessModule, Severity, TodoItem } from "./types";
import { MINUTES_SAVED_PER_RUN, WORKFLOWS } from "./workflows";
import { INTEGRATION_LABELS, INTEGRATION_STATUS, type IntegrationKey } from "../lib/suite-config";

/**
 * Suite Home dashboard. Every figure is rolled up from the module pages, the workflow list,
 * and the integration config, so Suite Home can never disagree with a module. Volumes are the
 * demo book, narrated like everything else in the suite.
 */

export interface ProcessScore {
  id: string;
  name: string;
  group: string;
  /** Items open right now, or null when the module has no volume yet (the voice POCs). */
  open: number | null;
  handled: number | null;
  human: number | null;
  autoRate: number | null;
  critical: number;
  warning: number;
  todos: number;
}

export interface HomeTotals {
  handled: number;
  auto: number;
  human: number;
  autoRate: number;
  hoursSaved: number;
  critical: number;
  warning: number;
  info: number;
  todos: number;
  workflowsRunning: number;
  workflowsTotal: number;
  workflowRuns: number;
  voiceCalls: number;
}

export function processScores(): ProcessScore[] {
  return PROCESSES.map((processModule) => {
    const { dashboard } = processModule;
    const week = dashboard?.week ?? [];
    const auto = week.reduce((sum, day) => sum + day.auto, 0);
    const human = week.reduce((sum, day) => sum + day.human, 0);
    const handled = auto + human;
    return {
      id: processModule.id,
      name: processModule.menuLabel,
      group: processModule.group,
      open: dashboard ? dashboard.stages.reduce((sum, stage) => sum + stage.value, 0) : null,
      handled: dashboard ? handled : null,
      human: dashboard ? human : null,
      autoRate: dashboard && handled > 0 ? Math.round((auto / handled) * 100) : null,
      critical: countSeverity(processModule, "critical"),
      warning: countSeverity(processModule, "warning"),
      todos: processModule.todos.length,
    };
  });
}

function countSeverity(processModule: ProcessModule, severity: Severity): number {
  return processModule.alerts.filter((alert) => alert.severity === severity).length;
}

/** The last seven days across every module that has volume. */
export function bookWeek(): DayVolume[] {
  const withVolume = PROCESSES.filter((processModule) => processModule.dashboard);
  const days = withVolume[0]?.dashboard?.week.map((day) => day.day) ?? [];
  return days.map((day, index) => ({
    day,
    auto: withVolume.reduce((sum, processModule) => sum + (processModule.dashboard?.week[index]?.auto ?? 0), 0),
    human: withVolume.reduce((sum, processModule) => sum + (processModule.dashboard?.week[index]?.human ?? 0), 0),
  }));
}

export function homeTotals(): HomeTotals {
  const week = bookWeek();
  const auto = week.reduce((sum, day) => sum + day.auto, 0);
  const human = week.reduce((sum, day) => sum + day.human, 0);
  const handled = auto + human;
  const alerts = PROCESSES.flatMap((processModule) => processModule.alerts);
  const automatedRuns = WORKFLOWS.reduce((sum, workflow) => sum + Math.round((workflow.runsThisWeek * workflow.autoRate) / 100), 0);

  return {
    handled,
    auto,
    human,
    autoRate: handled > 0 ? Math.round((auto / handled) * 100) : 0,
    hoursSaved: Math.round(((auto + automatedRuns) * MINUTES_SAVED_PER_RUN) / 60),
    critical: alerts.filter((alert) => alert.severity === "critical").length,
    warning: alerts.filter((alert) => alert.severity === "warning").length,
    info: alerts.filter((alert) => alert.severity === "info").length,
    todos: PROCESSES.reduce((sum, processModule) => sum + processModule.todos.length, 0),
    workflowsRunning: WORKFLOWS.filter((workflow) => workflow.status !== "draft").length,
    workflowsTotal: WORKFLOWS.length,
    workflowRuns: WORKFLOWS.reduce((sum, workflow) => sum + workflow.runsThisWeek, 0),
    voiceCalls: WORKFLOWS.reduce(
      (sum, workflow) => sum + workflow.runsThisWeek * workflow.nodes.filter((node) => node.kind === "voice").length,
      0,
    ),
  };
}

export interface RankedAlert {
  processId: string;
  processName: string;
  alert: AlertItem;
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

/** Most severe first, then module order. This is the "needs you now" list. */
export function rankedAlerts(): RankedAlert[] {
  return PROCESSES.flatMap((processModule) =>
    processModule.alerts.map((alert) => ({ processId: processModule.id, processName: processModule.menuLabel, alert })),
  ).sort((left, right) => SEVERITY_RANK[left.alert.severity] - SEVERITY_RANK[right.alert.severity]);
}

export function allTodos(): { processId: string; processName: string; todo: TodoItem; rank: number }[] {
  return PROCESSES.flatMap((processModule) =>
    processModule.todos.map((todo) => ({ processId: processModule.id, processName: processModule.menuLabel, todo })),
  ).map((item, index) => ({ ...item, rank: index + 1 }));
}

export interface Connection {
  label: string;
  /** What this connection powers. */
  unlocks: string;
  status: "pending" | "live";
}

const fromConfig = (key: IntegrationKey, unlocks: string): Connection => ({
  label: INTEGRATION_LABELS[key],
  unlocks,
  status: INTEGRATION_STATUS[key],
});

/** Systems the suite reads from and writes to. */
export const CONNECTIONS: Connection[] = [
  fromConfig("travelOne", "Corporate desk: real flight search and quotations"),
  fromConfig("crm", "Every lead, enquiry, and case written back to your CRM"),
  fromConfig("dialer", "Call audit: every recorded call scored; voice agents on your numbers"),
  fromConfig("rateSource", "Forex: live rates for Ravi to quote"),
  fromConfig("paymentLink", "Forex and holidays: pay by link"),
  fromConfig("astra", "Forex: customer and branch records"),
  { label: "Booking system (Raahi)", unlocks: "Domestic calls pick tours from live bookings", status: "live" },
  { label: "Carrier and hotel feeds", unlocks: "Schedule changes, availability, and hold requests", status: "live" },
];
