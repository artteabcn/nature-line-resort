// TODO: Update these rooms to match the actual property.
// Run: node C:\\Users\\user\\clones\\sync-template.mjs after updating.
export interface Room {
  id: string;
  nameKey: string;
  priceThb: number;
  maxGuests: number;
}

export const ROOMS: Room[] = [
  { id: "room-1", nameKey: "rooms.room1.name", priceThb: 0, maxGuests: 2 },
  { id: "room-2", nameKey: "rooms.room2.name", priceThb: 0, maxGuests: 2 },
];

export function getRoomById(id: string): Room | undefined {
  return ROOMS.find((r) => r.id === id);
}
