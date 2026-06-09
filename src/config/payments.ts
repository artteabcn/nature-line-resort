// Charge model: 50% non-refundable deposit collected at booking time,
// balance due on arrival. Bump or drop this constant to change the split.
export const DEPOSIT_PERCENT = 50;

export function depositAmount(totalThb: number): number {
  // Round up so the house never collects less than half due to rounding.
  return Math.ceil((totalThb * DEPOSIT_PERCENT) / 100);
}

export function balanceDue(totalThb: number): number {
  return totalThb - depositAmount(totalThb);
}
