/**
 * Confirmed forex script rules. Thresholds can change thresholds, so they stay in this config.
 * Live card, cash, and remittance rates are intentionally absent.
 */
export const FOREX_RULES = {
  cashLimitUsdEquivalent: 3000,
  tcsThresholdInr: 1_000_000,
  tcsThresholdLabel: "INR 10 lakh",
  tcsRatePercent: 20,
  tcsStudentsExempt: true,
  financialYearLabel: "1 Apr–31 Mar",
  paymentLinkValidMinutes: 30,
  rateHoldHours: 48,
  doorstepRadiusKm: 7,
  doorstepFeeInrBelowUsd500: 500,
  netBankingFeeInr: 50,
  cardProcessingPercent: 1.7,
  upiFeeInr: 0,
} as const;

export const FOREX_PRODUCTS = [
  "Buy",
  "Sell",
  "Reload",
  "Remittance",
] as const;

export const CRM_STATUSES_AFTER_CALL = ["Booked", "Follow-up", "Lost"] as const;
