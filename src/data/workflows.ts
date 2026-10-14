/**
 * Automation workflows across the suite: the Vibrium Flow layer that chains voice agents,
 * chat agents, worker agents, messages, waits, conditions, and people. Run counts are weekly totals.
 */

export type FlowNodeKind = "trigger" | "voice" | "chat" | "worker" | "message" | "wait" | "condition" | "human";
export type WorkflowStatus = "live" | "draft" | "integration";

export interface FlowNode {
  kind: FlowNodeKind;
  label: string;
  detail: string;
}

export interface Workflow {
  id: string;
  name: string;
  processId: string;
  outcome: string;
  status: WorkflowStatus;
  /** Why a workflow is not fully live, when it is not. */
  statusNote?: string;
  nodes: FlowNode[];
  runsThisWeek: number;
  /** Share of runs that finished without a person stepping in, 0 to 100. */
  autoRate: number;
}

export const NODE_LABELS: Record<FlowNodeKind, string> = {
  trigger: "Trigger",
  voice: "Voice agent",
  chat: "Chat agent",
  worker: "Worker agent",
  message: "Message",
  wait: "Wait",
  condition: "Condition",
  human: "Person",
};

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  live: "Live",
  draft: "Draft",
  integration: "Live",
};

/** Minutes of desk time one automated run saves, used for the hours-saved figure. */
export const MINUTES_SAVED_PER_RUN = 12;

export const WORKFLOWS: Workflow[] = [
  {
    id: "wf-trip-enquiry",
    name: "Trip enquiry to expert quote",
    processId: "planner",
    outcome: "A planned trip reaches a holiday expert with a warm, confirmed brief",
    status: "live",
    runsThisWeek: 74,
    autoRate: 81,
    nodes: [
      { kind: "trigger", label: "Quote requested in chat", detail: "Trip Planner has a brief, a plan, and a budget range" },
      { kind: "worker", label: "Lead Sync", detail: "Create the lead with brief, plan, and add-ons" },
      { kind: "voice", label: "Holiday Advisor call", detail: "Within 10 minutes. Confirm the brief, book the expert slot" },
      { kind: "condition", label: "Answered?", detail: "If not, wait 30 minutes and call once more" },
      { kind: "message", label: "WhatsApp plan summary", detail: "Itinerary and the expert's slot" },
      { kind: "human", label: "Holiday expert", detail: "Live flights, hotels, and the final price" },
    ],
  },
  {
    id: "wf-website-quote",
    name: "Website lead to designed quote",
    processId: "planner",
    outcome: "A widget chat on the agency's site becomes a priced, branded quote PDF in minutes",
    status: "live",
    runsThisWeek: 126,
    autoRate: 83,
    nodes: [
      { kind: "trigger", label: "Quote requested in the widget", detail: "On the agency's own website, in its colours" },
      { kind: "worker", label: "Fare Compare · Stay Match", detail: "Rank flights and shortlist stays for the brief" },
      { kind: "worker", label: "Quote Builder", detail: "Add extras, apply the markup and GST, draft the price" },
      { kind: "human", label: "Holiday expert", detail: "Picks the options and approves the price on the quote desk" },
      { kind: "worker", label: "Trip Document Designer", detail: "Lays out the branded itinerary and quote PDF" },
      { kind: "message", label: "WhatsApp and email", detail: "PDF to the traveller, follow-up after 24 hours" },
    ],
  },
  {
    id: "wf-quote-followup",
    name: "Quote follow-up",
    processId: "planner",
    outcome: "No quote goes cold without two nudges and a call",
    status: "live",
    runsThisWeek: 41,
    autoRate: 72,
    nodes: [
      { kind: "trigger", label: "Quote sent, no payment in 24 h", detail: "From the holiday desk" },
      { kind: "message", label: "WhatsApp reminder", detail: "Plan highlights and the payment link" },
      { kind: "wait", label: "24 hours", detail: "" },
      { kind: "voice", label: "Holiday Advisor call", detail: "Ask what would make it work" },
      { kind: "condition", label: "Wants changes?", detail: "Dates, hotel, budget, or destination" },
      { kind: "worker", label: "Itinerary Builder", detail: "Revise the plan" },
      { kind: "human", label: "Holiday expert", detail: "Sends the revised quote" },
    ],
  },
  {
    id: "wf-corporate-email",
    name: "Corporate travel mail to quotation",
    processId: "corporate",
    outcome: "Every desk mail is read, sorted, and drafted; only exceptions reach a counsellor",
    status: "live",
    runsThisWeek: 235,
    autoRate: 85,
    nodes: [
      { kind: "trigger", label: "Mail lands in the desk inbox", detail: "Gmail or Outlook" },
      { kind: "worker", label: "Intent Router", detail: "New, change, confirm, clarify, FYI, or cancel" },
      { kind: "worker", label: "Aarav", detail: "Extract traveller, route, date, cabin" },
      { kind: "worker", label: "Policy Guard", detail: "Client policy check" },
      { kind: "condition", label: "Complete and allowed?", detail: "Missing date or blocked trip goes to a person" },
      { kind: "worker", label: "Meera", detail: "TravelOne search and options" },
      { kind: "worker", label: "Anika", detail: "Draft the reply" },
      { kind: "condition", label: "Traveller confirmed?", detail: "Revalidate the fare, then prepare the booking payload" },
      { kind: "human", label: "Reporting manager", detail: "Approves the exact fare before anything is released" },
      { kind: "human", label: "Travel counsellor", detail: "Only the exceptions. Ticketing stays on TravelOne" },
    ],
  },
  {
    id: "wf-visa-docs",
    name: "Visa documents chase",
    processId: "planner",
    outcome: "Documents arrive complete before the visa appointment",
    status: "live",
    runsThisWeek: 46,
    autoRate: 84,
    nodes: [
      { kind: "trigger", label: "International trip booked", detail: "Destination needs a visa for the passport" },
      { kind: "worker", label: "Checklist Builder", detail: "Documents for the destination and purpose" },
      { kind: "message", label: "WhatsApp checklist", detail: "Upload link per traveller" },
      { kind: "wait", label: "48 hours", detail: "" },
      { kind: "worker", label: "Document Check", detail: "Read uploads, flag missing or expired" },
      { kind: "voice", label: "Reminder call", detail: "Only for what is still missing" },
      { kind: "human", label: "Visa desk", detail: "Files the application" },
    ],
  },
  {
    id: "wf-forex-sale",
    name: "Forex lead to payment",
    processId: "forex",
    outcome: "Every forex enquiry is answered, and the interested ones reach a branch visit for KYC",
    status: "live",
    runsThisWeek: 128,
    autoRate: 79,
    nodes: [
      { kind: "trigger", label: "Forex enquiry", detail: "Toll-free call, WhatsApp, or web form" },
      { kind: "voice", label: "Forex Desk", detail: "Answers the question; asks if they want to go ahead" },
      { kind: "condition", label: "Interested?", detail: "If not, closed as answered" },
      { kind: "voice", label: "Ravi · Forex", detail: "Product, currency, amount, date, purpose, city" },
      { kind: "worker", label: "Rate Desk", detail: "Live rate, charges, and TCS; never a stored rate" },
      { kind: "condition", label: "Wants to lock the rate?", detail: "Advance is optional" },
      { kind: "message", label: "Advance payment link", detail: "Valid 30 minutes; rate held 48 hours" },
      { kind: "worker", label: "Branch Handoff", detail: "Nearest branch, slot, and originals to bring" },
      { kind: "human", label: "Branch counter", detail: "Physical KYC, balance, and handover" },
    ],
  },
  {
    id: "wf-call-audit",
    name: "Nightly call audit",
    processId: "audit",
    outcome: "Every recorded call is scored on its line's form, with evidence, by morning",
    status: "live",
    runsThisWeek: 82,
    autoRate: 78,
    nodes: [
      { kind: "trigger", label: "Every night", detail: "New recorded calls from the dialer" },
      { kind: "worker", label: "Recording Intake", detail: "Group calls by opportunity" },
      { kind: "worker", label: "Call Transcriber", detail: "Speakers and timestamps" },
      { kind: "worker", label: "QC Evaluator", detail: "The line's form, pass or fail, with a quote" },
      { kind: "condition", label: "Below the bar?", detail: "Threshold from config" },
      { kind: "worker", label: "Coaching Notes", detail: "Failed rows into feedback per counsellor" },
      { kind: "human", label: "Quality lead", detail: "Reviews and coaches" },
    ],
  },
  {
    id: "wf-pre-departure",
    name: "Pre-departure call",
    processId: "prebook",
    outcome: "Every guest is reconfirmed and prepared two days before leaving",
    status: "live",
    runsThisWeek: 19,
    autoRate: 88,
    nodes: [
      { kind: "trigger", label: "2 days before departure", detail: "From the booking system" },
      { kind: "voice", label: "Ravi · pre-tour", detail: "Reconfirm, weather, documents, FAQs" },
      { kind: "condition", label: "Connected?", detail: "No answer within 300 seconds" },
      { kind: "wait", label: "30 minutes", detail: "Then one retry" },
      { kind: "message", label: "WhatsApp tour details", detail: "Only after a call connects" },
      { kind: "human", label: "Representative", detail: "Calls back on anything Ravi cannot settle" },
    ],
  },
  {
    id: "wf-schedule-change",
    name: "Flight schedule change",
    processId: "airlines",
    outcome: "Travellers hear about a time change before they reach the airport",
    status: "live",
    runsThisWeek: 22,
    autoRate: 64,
    nodes: [
      { kind: "trigger", label: "Carrier schedule change", detail: "On a held reservation" },
      { kind: "worker", label: "Schedule Watch", detail: "Old time, new time, impact" },
      { kind: "voice", label: "Reservation Desk call", detail: "Tell the traveller; take their preference" },
      { kind: "worker", label: "Change Drafter", detail: "Options for a person to release" },
      { kind: "human", label: "Reservations lead", detail: "Releases the reissue" },
    ],
  },
  {
    id: "wf-stay-care",
    name: "In-stay problem to fix",
    processId: "hotels",
    outcome: "A guest's problem reaches the hotel inside its clock and is checked back",
    status: "live",
    runsThisWeek: 38,
    autoRate: 69,
    nodes: [
      { kind: "trigger", label: "Guest reports a problem", detail: "Chat or call during the stay" },
      { kind: "chat", label: "Stay Care", detail: "What, where, front desk, what would help" },
      { kind: "worker", label: "Issue Triage", detail: "Category, urgency, response clock" },
      { kind: "worker", label: "Hotel Liaison", detail: "Front desk, or the duty manager" },
      { kind: "condition", label: "Move, credit, or safety?", detail: "Resolution Guard flags it" },
      { kind: "human", label: "Stay desk", detail: "Decides with the hotel" },
      { kind: "chat", label: "Check back", detail: "Fixed closes with a rating; not fixed escalates" },
    ],
  },
  {
    id: "wf-post-trip",
    name: "Post-trip feedback and next trip",
    processId: "post",
    outcome: "Every guest is heard on the last day; unhappy ones get a person",
    status: "live",
    runsThisWeek: 33,
    autoRate: 83,
    nodes: [
      { kind: "trigger", label: "Last day of the tour", detail: "From the booking system" },
      { kind: "voice", label: "Ravi · completion", detail: "Thank you and NPS from 0 to 10" },
      { kind: "condition", label: "NPS 6 or below?", detail: "" },
      { kind: "human", label: "Ops callback", detail: "For detractors, the same day" },
      { kind: "message", label: "WhatsApp form and next-trip idea", detail: "For everyone else" },
    ],
  },
];

export function workflowsFor(processId: string): Workflow[] {
  return WORKFLOWS.filter((workflow) => workflow.processId === processId);
}
