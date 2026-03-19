export function computeEffectiveRate(
  fedRatePercent: number,
  multiplier: number,
  floorPercent: number
): number {
  const computed = fedRatePercent * multiplier;
  return Math.max(computed, floorPercent);
}

export function computeMonthlyInterest(
  balance: number,
  effectiveAnnualRatePercent: number
): number {
  const monthlyRate = effectiveAnnualRatePercent / 100 / 12;
  const interest = balance * monthlyRate;
  // Round to 2 decimal places
  return Math.round(interest * 100) / 100;
}
