// Beds24 property + room configuration.
// BEDS24_PROPERTY_ID = 0  →  property not yet onboarded; booking form is
// disabled (availability route returns notConfigured: true).
//
// Onboarding checklist:
//   1. Create property in Beds24 dashboard → note propertyId
//   2. Create room types matching local categories → note roomIds
//   3. Set BEDS24_PROPERTY_ID and ROOM_TO_BEDS24_ID below
//   4. Regenerate BEDS24_TO_ROOM_ID and BEDS24_ROOM_IDS from the maps above
//   5. Set BEDS24_REFRESH_TOKEN env var in Cloudflare Pages dashboard
//   6. Redeploy
export const BEDS24_PROPERTY_ID = 0;

// Local display category → Beds24 numeric roomId
export const ROOM_TO_BEDS24_ID: Record<string, number> = {
  standard: 0,
};

// Beds24 numeric roomId → local display category (inverse of above)
export const BEDS24_TO_ROOM_ID: Record<number, string> = {
  0: "standard",
};

// All Beds24 room IDs for this property — used in bulk calendar queries.
export const BEDS24_ROOM_IDS: number[] = [];

// apiSourceId = 0 → direct / website booking in Beds24.
// Verify at: https://wiki.beds24.com/index.php/API_V2.0_apisourceids
export const BEDS24_SOURCE_ID_DIRECT = 0;
