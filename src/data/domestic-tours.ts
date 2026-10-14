/**
 * Domestic outbound calls. Thresholds match the 8 Oct 2026 project context.
 * Demo package facts are the ones hardcoded in the prompts. There is no Raahi feed.
 */

export const PRE_TOUR_DAYS_BEFORE_DEPARTURE = 2;
export const SHORT_TOUR_MAX_DAYS = 3;
export const SHORT_TOUR_CALL_ON_DAY = 2;
export const LONG_TOUR_MIN_DAYS = 4;
export const IN_TOUR_RATING_MAX = 5;
export const COMPLETION_NPS_MIN = 0;
export const COMPLETION_NPS_MAX = 10;
export const VOICE_NO_ANSWER_FALLBACK_SECONDS = 300;
export const WORKFLOW_DELAY_SECONDS = 60;
export const SUGGESTED_RETRY_DELAY_MINUTES = 30;
const MILLISECONDS_PER_DAY = 86_400_000;

export const KASHMIR_GROUP_BOT_ID = "VB00000355";
export const KERALA_CUSTOMISED_BOT_ID = "VB00000215";

export const SUITE_AS_OF = { year: 2026, month: 10, day: 8 } as const;

export type CalendarDay = { year: number; month: number; day: number };
export type TourStyle = "group" | "customised";
export type DomesticCallStage = "pre_tour" | "in_tour" | "completion";

export interface DemoPackage {
  code: string;
  name: string;
  tourStyle: TourStyle;
  botId: string;
  nights: number;
  days: number;
  startsOn: CalendarDay;
  endsOn: CalendarDay;
  route: string;
  meals: string;
  included: string;
  demoOnlyNote: string | null;
}

export interface PackageCallPlan {
  pkg: DemoPackage;
  dayNumber: number;
  isLongTour: boolean;
  preTourOn: CalendarDay;
  inTourOn: CalendarDay;
  completionOn: CalendarDay;
  dueToday: DomesticCallStage | null;
}

export const DEMO_CANCELLATION_SLABS = [
  { fromDaysBefore: 0, toDaysBefore: 7, chargePercent: 100 },
  { fromDaysBefore: 8, toDaysBefore: 21, chargePercent: 90 },
  { fromDaysBefore: 22, toDaysBefore: 45, chargePercent: 50 },
  { fromDaysBefore: 46, toDaysBefore: null, chargePercent: 30 },
] as const;

export const DEMO_PACKAGES: DemoPackage[] = [
  {
    code: "PKG011485",
    name: "Exotic Kashmir With Gulmarg Stay",
    tourStyle: "group",
    botId: KASHMIR_GROUP_BOT_ID,
    nights: 6,
    days: 7,
    startsOn: { year: 2026, month: 10, day: 7 },
    endsOn: { year: 2026, month: 10, day: 13 },
    route: "Srinagar houseboat 1 night, Pahalgam 2, Gulmarg 1, Srinagar 2",
    meals: "6 breakfasts, 5 lunches, 6 dinners",
    included: "Round-trip flights and insurance. GST extra. Gondola is not guaranteed; Buta Pathri is the alternative.",
    demoOnlyNote: null,
  },
  {
    code: "PKG009251",
    name: "Colours of Kerala",
    tourStyle: "customised",
    botId: KERALA_CUSTOMISED_BOT_ID,
    nights: 8,
    days: 9,
    startsOn: { year: 2026, month: 10, day: 7 },
    endsOn: { year: 2026, month: 10, day: 15 },
    route: "Kochi 1 night, Munnar 2, Thekkady 1, Alleppey 1, Kumarakom 1, Kovalam 2",
    meals: "Breakfast only",
    included: "Private AC sedan. Entry fees are extra.",
    demoOnlyNote: null,
  },
];

export const WORKFLOW_OPEN_ITEMS = [
  "Segment: Kashmir group departures.",
  "Both voice nodes run on the pre-tour campaign.",
  `Retry delay is ${WORKFLOW_DELAY_SECONDS} seconds.`,
  "WhatsApp details follow a connected call.",
  "The workflow is saved and active.",
  "The Kerala workflow follows the same pattern.",
] as const;

export const STAGE_PURPOSE: Record<DomesticCallStage, string> = {
  pre_tour: "Reconfirm the booking, prepare the guest, and answer FAQs.",
  in_tour: "Catch anything still wrong: a rating out of 5, then hotel, transport, food, and sightseeing.",
  completion: "Thank the guest, point to the feedback form, collect NPS from 0 to 10, and offer a future trip.",
};

export function addDays(day: CalendarDay, delta: number): CalendarDay {
  const shifted = new Date(Date.UTC(day.year, day.month - 1, day.day));
  shifted.setUTCDate(shifted.getUTCDate() + delta);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function formatCalendarDay(day: CalendarDay): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(day.year, day.month - 1, day.day)));
}

export function planCalls(pkg: DemoPackage, asOf: CalendarDay = SUITE_AS_OF): PackageCallPlan {
  const isLongTour = pkg.days >= LONG_TOUR_MIN_DAYS;
  const inTourOffset = isLongTour ? -1 : SHORT_TOUR_CALL_ON_DAY - 1;
  const inTourOn = isLongTour ? addDays(pkg.endsOn, inTourOffset) : addDays(pkg.startsOn, inTourOffset);
  const preTourOn = addDays(pkg.startsOn, -PRE_TOUR_DAYS_BEFORE_DEPARTURE);
  const completionOn = pkg.endsOn;
  const dayNumber = daysFrom(pkg.startsOn, asOf) + 1;

  return {
    pkg,
    dayNumber,
    isLongTour,
    preTourOn,
    inTourOn,
    completionOn,
    dueToday: stageDueOn(asOf, preTourOn, inTourOn, completionOn),
  };
}

export function packageByCode(code: string): DemoPackage {
  const found = DEMO_PACKAGES.find((pkg) => pkg.code === code);
  if (!found) {
    throw new Error(`Demo package ${code} is not in the domestic book.`);
  }
  return found;
}

export function countDueOn(stage: DomesticCallStage, asOf: CalendarDay = SUITE_AS_OF): number {
  return DEMO_PACKAGES.filter((pkg) => planCalls(pkg, asOf).dueToday === stage).length;
}

export function domesticMorningLine(asOf: CalendarDay = SUITE_AS_OF): string {
  return DEMO_PACKAGES.map((pkg) => {
    const plan = planCalls(pkg, asOf);
    const lengthLabel = plan.isLongTour ? "long tour" : "short tour";
    return `${pkg.code} is day ${plan.dayNumber} of a ${lengthLabel}. In-tour call ${formatCalendarDay(plan.inTourOn)}. Completion ${formatCalendarDay(plan.completionOn)}.`;
  }).join(" ");
}

function stageDueOn(
  asOf: CalendarDay,
  preTourOn: CalendarDay,
  inTourOn: CalendarDay,
  completionOn: CalendarDay,
): DomesticCallStage | null {
  if (sameDay(asOf, preTourOn)) {
    return "pre_tour";
  }
  if (sameDay(asOf, inTourOn)) {
    return "in_tour";
  }
  if (sameDay(asOf, completionOn)) {
    return "completion";
  }
  return null;
}

function sameDay(left: CalendarDay, right: CalendarDay): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

function daysFrom(start: CalendarDay, end: CalendarDay): number {
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  return Math.round((endUtc - startUtc) / MILLISECONDS_PER_DAY);
}
