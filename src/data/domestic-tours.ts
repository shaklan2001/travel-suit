/**
 * Tour care outbound calls. Thresholds match the 8 Oct 2026 project context.
 * The departures are a generic mixed book: group and private, short and long, India and abroad.
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

export const GROUP_TOUR_BOT_ID = "VB00000355";
export const PRIVATE_TOUR_BOT_ID = "VB00000215";

export const SUITE_AS_OF = { year: 2026, month: 10, day: 8 } as const;

export type CalendarDay = { year: number; month: number; day: number };
export type TourStyle = "group" | "private";
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
    code: "PKG012040",
    name: "Hill stations escape",
    tourStyle: "group",
    botId: GROUP_TOUR_BOT_ID,
    nights: 6,
    days: 7,
    startsOn: { year: 2026, month: 10, day: 10 },
    endsOn: { year: 2026, month: 10, day: 16 },
    route: "Hill town 3 nights, valley 2, city 1",
    meals: "Breakfast and dinner",
    included: "Flights, coach transfers, tour manager",
    demoOnlyNote: null,
  },
  {
    code: "PKG012112",
    name: "Heritage cities short break",
    tourStyle: "private",
    botId: PRIVATE_TOUR_BOT_ID,
    nights: 2,
    days: 3,
    startsOn: { year: 2026, month: 10, day: 7 },
    endsOn: { year: 2026, month: 10, day: 9 },
    route: "Two heritage cities, 1 night each",
    meals: "Breakfast only",
    included: "Private car and driver, entry fees extra",
    demoOnlyNote: null,
  },
  {
    code: "PKG011977",
    name: "Backwaters and beaches",
    tourStyle: "private",
    botId: PRIVATE_TOUR_BOT_ID,
    nights: 7,
    days: 8,
    startsOn: { year: 2026, month: 10, day: 2 },
    endsOn: { year: 2026, month: 10, day: 9 },
    route: "Port city 1 night, hills 2, houseboat 1, beach 3",
    meals: "Breakfast only",
    included: "Private car and driver",
    demoOnlyNote: null,
  },
  {
    code: "PKG011903",
    name: "Island getaway",
    tourStyle: "group",
    botId: GROUP_TOUR_BOT_ID,
    nights: 5,
    days: 6,
    startsOn: { year: 2026, month: 10, day: 3 },
    endsOn: { year: 2026, month: 10, day: 8 },
    route: "Island resort 3 nights, second island 2",
    meals: "All meals",
    included: "Flights, ferries, tour manager",
    demoOnlyNote: null,
  },
  {
    code: "PKG012205",
    name: "Desert and forts",
    tourStyle: "group",
    botId: GROUP_TOUR_BOT_ID,
    nights: 5,
    days: 6,
    startsOn: { year: 2026, month: 10, day: 6 },
    endsOn: { year: 2026, month: 10, day: 11 },
    route: "Fort city 2 nights, desert camp 1, lake city 2",
    meals: "Breakfast and dinner",
    included: "Flights, coach transfers, tour manager",
    demoOnlyNote: null,
  },
  {
    code: "PKG012150",
    name: "City break abroad",
    tourStyle: "private",
    botId: PRIVATE_TOUR_BOT_ID,
    nights: 4,
    days: 5,
    startsOn: { year: 2026, month: 10, day: 12 },
    endsOn: { year: 2026, month: 10, day: 16 },
    route: "One city, 4 nights",
    meals: "Breakfast only",
    included: "Flights, visa, airport transfers, city pass",
    demoOnlyNote: null,
  },
];

export const WORKFLOW_OPEN_ITEMS = [
  "Audience: every departure in the next 7 days, group and private.",
  `Pre-tour call ${PRE_TOUR_DAYS_BEFORE_DEPARTURE} days before departure.`,
  `No answer: one retry after ${SUGGESTED_RETRY_DELAY_MINUTES} minutes.`,
  "WhatsApp tour details go only after a connected call.",
  "In-tour and last-day calls follow the same workflow.",
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
    throw new Error(`Package ${code} is not in the tour book.`);
  }
  return found;
}

export function countDueOn(stage: DomesticCallStage, asOf: CalendarDay = SUITE_AS_OF): number {
  return DEMO_PACKAGES.filter((pkg) => planCalls(pkg, asOf).dueToday === stage).length;
}

export function domesticMorningLine(asOf: CalendarDay = SUITE_AS_OF): string {
  const due = countDueOn("pre_tour", asOf) + countDueOn("in_tour", asOf) + countDueOn("completion", asOf);
  return `${due} care calls today across ${DEMO_PACKAGES.length} departures: ${countDueOn("pre_tour", asOf)} pre-tour, ${countDueOn("in_tour", asOf)} in-tour, ${countDueOn("completion", asOf)} on the last day. The care workflow is live.`;
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
