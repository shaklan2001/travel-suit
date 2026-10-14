export type AgentKind = "conversational" | "functional" | "analytical";
export type Autonomy = "fully_auto" | "auto_with_approval" | "draft" | "suggest";
export type Severity = "critical" | "warning" | "info";
export type QueueKind = "corporate" | "forex" | "audit" | "domestic" | "planner" | "hotels" | "cases";

export interface Kpi {
  id: string;
  label: string;
  value: string;
  delta: string;
}

export interface AlertItem {
  id: string;
  severity: Severity;
  code: string;
  title: string;
  detail: string;
  action: string;
  pinToHome: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  owner: string;
  code: string;
  pinToHome: boolean;
}

export interface AgentCard {
  id: string;
  name: string;
  role: string;
  kind: AgentKind;
  autonomy: Autonomy;
  version: string;
  summary: string;
  channels: string[];
  skills: string[];
  inputs: string;
  outputs: string;
}

export interface MapStep {
  id: string;
  phase: string;
  lane: string;
  title: string;
  detail: string;
}

export interface QueueCase {
  code: string;
  title: string;
  status: string;
  owner: string;
  next: string;
}

/** One step of the plain-language "how this works" strip on a module overview. */
export interface StoryStep {
  who: string;
  does: string;
  kind: "person" | "agent" | "gate";
}

export interface StageCount {
  label: string;
  value: number;
}

export interface DayVolume {
  day: string;
  /** Items the agents closed without a person. */
  auto: number;
  /** Items that needed a person. */
  human: number;
}

/** Demo-book chart data for a module dashboard. Agents narrate these; they are not a live feed. */
export interface ModuleDashboard {
  stageTitle: string;
  stageUnit: string;
  stages: StageCount[];
  weekTitle: string;
  week: DayVolume[];
}

export interface ProcessModule {
  id: string;
  name: string;
  menuLabel: string;
  group: string;
  oneLiner: string;
  roles: string[];
  kpis: Kpi[];
  brief: string;
  alerts: AlertItem[];
  todos: TodoItem[];
  agents: AgentCard[];
  phases: string[];
  steps: MapStep[];
  cases: QueueCase[];
  queueKind: QueueKind;
  story: StoryStep[];
  /** Title over the main story when a module has more than one flow. Defaults to "How this works". */
  storyTitle?: string;
  /** Further flows in the same module, each with its own four steps. */
  moreStories?: { title: string; steps: StoryStep[] }[];
  dashboard?: ModuleDashboard;
  /** Label of the fourth tab, where the work happens. Defaults to "Queue". */
  workspaceLabel?: string;
  /** Further workspace tabs after the fourth, each at /<module>/<slug>. */
  extraTabs?: { slug: string; label: string }[];
}

export const AUTONOMY_LABELS: Record<Autonomy, string> = {
  fully_auto: "Fully auto",
  auto_with_approval: "Auto with approval",
  draft: "Draft only",
  suggest: "Suggest only",
};

export const KIND_LABELS: Record<AgentKind, string> = {
  conversational: "Conversational",
  functional: "Functional",
  analytical: "Analytical",
};
