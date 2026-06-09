// Smoobu apartment + channel configuration.
export const SMOOBU_CHANNEL_ID_DIRECT_WEBSITE = 0;
export const SMOOBU_CHANNEL_ID_BLOCKED = 0;

export const SMOOBU_APARTMENT_IDS = [0] as const;

// The 6 physical apartments fall into 3 room categories in Smoobu:
//   Cosy   → 0 (Cosy 1), 3040766 (Cosy 2), 3040781 (Cosy 3)
//   Deluxe → 3040756 (Deluxe)
//   Family → 3040771 (Familiale 1), 3040776 (Familiale 2)
// The roomId values match the `id` of each item in `rooms.items` (messages/*.json).
// Smoobu apartmentId → local roomId (category).
export const APARTMENT_TO_ROOM_ID: Record<number, string> = {
  0: "cosy",
  3040766: "cosy",
  3040781: "cosy",
  3040756: "deluxe",
  3040771: "family",
  3040776: "family",
};

// Local roomId (category) → default Smoobu apartmentId (used when a direct
// booking is made without going through the availability search). Real
// assignment of the booked unit happens at the availability step.
export const ROOM_TO_APARTMENT_ID: Record<string, number> = {
  cosy: 0,
  deluxe: 3040756,
  family: 3040771,
};
