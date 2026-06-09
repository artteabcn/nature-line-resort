// Facility icon keys offered in the CMS Facilities editor.
// MUST stay in sync with ICON_MAP in src/components/AmenitiesSection.tsx
// (each key here must have a matching icon component there).
export const FACILITY_ICONS = [
  "pool",
  "wifi",
  "ac",
  "breakfast",
  "whatsapp",
  "transfer",
  "cleaning",
  "languages",
  "parking",
  "restaurant",
  "bar",
  "gym",
  "spa",
  "beach",
  "garden",
  "tv",
  "pets",
  "family",
  "bicycle",
  "concierge",
] as const;

export type FacilityIcon = (typeof FACILITY_ICONS)[number];
