// Clones run under Merchant-of-Record: the FULL booking is charged to Arkadya's
// Stripe at booking time, and the owner is remitted the total minus
// COMMISSION_PERCENT, paid out off-platform (bank / PromptPay).
// (The PinkHouse template uses a per-owner 50% deposit instead — not this file.)
export const DEPOSIT_PERCENT = 100; // full prepayment
export const COMMISSION_PERCENT = 6; // Arkadya commission on each booking

export function depositAmount(totalThb: number): number {
  // Round up so the house never collects less than due to rounding.
  return Math.ceil((totalThb * DEPOSIT_PERCENT) / 100);
}

export function balanceDue(totalThb: number): number {
  return totalThb - depositAmount(totalThb); // 0 under full prepayment
}

export function commissionAmount(totalThb: number): number {
  return Math.round((totalThb * COMMISSION_PERCENT) / 100);
}

export function ownerPayout(totalThb: number): number {
  return totalThb - commissionAmount(totalThb);
}
