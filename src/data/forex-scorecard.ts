export type ScoreSection = "soft_skills" | "product_sales" | "tool_handling";
export type ScorePolarity = "normal" | "inverted";
export type ScoreEvidence = "audio" | "email" | "crm";
export type DemoResult = "pass" | "fail" | "pending_evidence";

export interface ScoreParameter {
  id: number;
  text: string;
  weight: number;
  section: ScoreSection;
  polarity: ScorePolarity;
  evidence: ScoreEvidence;
}

export interface DemoJudgement {
  parameterId: number;
  result: DemoResult;
  reason: string;
}

export const SECTION_LABELS: Record<ScoreSection, string> = {
  soft_skills: "Soft skills",
  product_sales: "Product and sales",
  tool_handling: "Tool handling",
};

/** September audit sheet. Section names are an assumption — TCIL has not mapped the sheet. */
export const SCORECARD: ScoreParameter[] = [
  { id: 1, text: "Did you greet the customer with enthusiasm and excitement?", weight: 3, section: "soft_skills", polarity: "normal", evidence: "audio" },
  { id: 2, text: "Did you follow standard language on call?", weight: 3, section: "soft_skills", polarity: "normal", evidence: "audio" },
  { id: 3, text: "Did you listen to the customer well?", weight: 3, section: "soft_skills", polarity: "normal", evidence: "audio" },
  { id: 4, text: "Did you interrupt the customer on call?", weight: 3, section: "soft_skills", polarity: "inverted", evidence: "audio" },
  { id: 5, text: "Did you acknowledge the customer's response and express empathy where applicable?", weight: 3, section: "soft_skills", polarity: "normal", evidence: "audio" },
  { id: 6, text: "Did you use the dead-air opportunity to initiate small talk?", weight: 3, section: "soft_skills", polarity: "normal", evidence: "audio" },
  { id: 7, text: "Did you effectively use the hold option?", weight: 3, section: "soft_skills", polarity: "normal", evidence: "audio" },
  { id: 8, text: "Did you follow up with the customer effectively?", weight: 4, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 9, text: "Did you thank the customer before closing?", weight: 3, section: "soft_skills", polarity: "normal", evidence: "audio" },
  { id: 10, text: "Did you use the purpose at the start of the call?", weight: 2, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 11, text: "Did you capture the lead / number awareness?", weight: 2, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 12, text: "Did you use your expertise to recommend the correct product (cash vs card)?", weight: 3, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 13, text: "Did you offer a discount without the ask?", weight: 2, section: "product_sales", polarity: "inverted", evidence: "audio" },
  { id: 14, text: "Did you discuss the features and benefits of the forex card?", weight: 4, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 15, text: "Did you inform about TCS charges for transactions exceeding the threshold in the current FY?", weight: 3, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 16, text: "Did you provide a calculative reason when compared with competition on price?", weight: 3, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 17, text: "Did you attempt to ask for the sale with conviction?", weight: 5, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 18, text: "Did you discuss the benefits of opting for USD if another currency is not available?", weight: 3, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 19, text: "Did you provide a logical explanation for questions raised by the customer?", weight: 4, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 20, text: "Did you reason with the customer for purchase denial?", weight: 4, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 21, text: "Did you provide accurate and complete information to the customer?", weight: 4, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 22, text: "Did you use correct rebuttals if the customer is not agreeing to pay online?", weight: 4, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 23, text: "Did you request the customer to take the feedback survey post booking?", weight: 5, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 24, text: "Did you display a professional attitude throughout the call?", weight: 3, section: "soft_skills", polarity: "normal", evidence: "audio" },
  { id: 25, text: "Did you send emails in the required format?", weight: 2, section: "tool_handling", polarity: "normal", evidence: "email" },
  { id: 26, text: "Did you pitch applicable offers?", weight: 2, section: "product_sales", polarity: "normal", evidence: "audio" },
  { id: 27, text: "Did you update the CRM product screen correctly?", weight: 5, section: "tool_handling", polarity: "normal", evidence: "crm" },
  { id: 28, text: "Did you update the correct disposition in CRM?", weight: 3, section: "tool_handling", polarity: "normal", evidence: "crm" },
  { id: 29, text: "Did you update the notes clearly in CRM?", weight: 3, section: "tool_handling", polarity: "normal", evidence: "crm" },
  { id: 30, text: "Did you explain payment modes, processing charges, and source-of-funds?", weight: 3, section: "tool_handling", polarity: "normal", evidence: "audio" },
  { id: 31, text: "Did you explain that a pending amount must not be paid in cash at the branch?", weight: 3, section: "tool_handling", polarity: "normal", evidence: "audio" },
];

export const EXPECTED_SCORECARD_WEIGHT_TOTAL = 100;

export const SCORECARD_WEIGHT_TOTAL = SCORECARD.reduce((sum, parameter) => sum + parameter.weight, 0);

if (SCORECARD_WEIGHT_TOTAL !== EXPECTED_SCORECARD_WEIGHT_TOTAL) {
  throw new Error("Forex scorecard weights must sum to 100.");
}

/**
 * Synthetic first-call review for the demo desk.
 * Quotes are written for this demo. They are not from a TCIL recording.
 */
export const DEMO_QC_CASE_CODE = "FX-DEMO-2041";

export const DEMO_JUDGEMENTS: DemoJudgement[] = [
  { parameterId: 1, result: "fail", reason: "Opened with a rate question. The standard Thomas Cook forex opening was not used." },
  { parameterId: 2, result: "pass", reason: "Language stayed clear and professional after the opening." },
  { parameterId: 3, result: "pass", reason: "Seller let the traveller finish the destination and date." },
  { parameterId: 4, result: "pass", reason: "No overlapping speech on this demo. One interruption would fail this row." },
  { parameterId: 9, result: "fail", reason: "Call ended without the closing thank-you." },
  { parameterId: 14, result: "fail", reason: "Card pitch was partial. Chip and PIN, insurance, and emergency cash were not covered. Partial is a fail." },
  { parameterId: 15, result: "fail", reason: "TCS for the financial year was not asked. Buy, reload, and remittance need it." },
  { parameterId: 17, result: "pass", reason: "Seller asked for the sale and offered the payment link." },
  { parameterId: 25, result: "pending_evidence", reason: "Quotation email is not in this demo. Needs the sent mail." },
  { parameterId: 27, result: "pending_evidence", reason: "CRM product screen is not connected." },
  { parameterId: 28, result: "pending_evidence", reason: "CRM disposition is not connected." },
  { parameterId: 29, result: "pending_evidence", reason: "CRM notes are not connected." },
];

export interface DemoScoreSummary {
  earnedWeight: number;
  judgedWeight: number;
  pendingWeight: number;
}

export function summarizeDemoScore(
  parameters: ScoreParameter[],
  judgements: DemoJudgement[],
): DemoScoreSummary {
  let earnedWeight = 0;
  let judgedWeight = 0;
  let pendingWeight = 0;

  for (const judgement of judgements) {
    const parameter = parameters.find((row) => row.id === judgement.parameterId);
    if (!parameter) {
      continue;
    }
    if (judgement.result === "pending_evidence") {
      pendingWeight += parameter.weight;
      continue;
    }
    judgedWeight += parameter.weight;
    if (judgement.result === "pass") {
      earnedWeight += parameter.weight;
    }
  }

  return { earnedWeight, judgedWeight, pendingWeight };
}
