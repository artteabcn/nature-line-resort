import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  roomId: text("room_id").notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  guests: integer("guests").notNull().default(1),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "confirmed", "failed", "cancelled"] })
    .notNull()
    .default("pending"),
  smoobuApartmentId: integer("smoobu_apartment_id"),
  smoobuReservationId: integer("smoobu_reservation_id"),
  channelId: integer("channel_id"),
  beds24RoomId: integer("beds24_room_id"),
  beds24BookingId: integer("beds24_booking_id"),
  totalPrice: integer("total_price"),
  currency: text("currency").default("THB"),
  paymentStatus: text("payment_status", {
    enum: ["pending", "authorized", "paid", "refunded", "failed"],
  })
    .notNull()
    .default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountPaid: integer("amount_paid"),
  locale: text("locale").notNull().default("en"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// CMS content overrides — text snippets keyed by (locale, path).
// `path` is a dot-separated key into the messages tree, e.g. "hero.headline"
// or "rooms.items.0.description". A NULL/missing override falls back to the
// shipped messages/*.json default.
export const contentOverrides = sqliteTable("content_overrides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  locale: text("locale").notNull(),
  path: text("path").notNull(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedBy: text("updated_by"),
});

// CMS image slots — slot is a named position on the site (e.g. "logo",
// "hero.main", "rooms.standard.cover", "gallery.0"). r2Key points to the
// uploaded binary in the MEDIA R2 bucket.
export const contentImages = sqliteTable("content_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slot: text("slot").notNull().unique(),
  r2Key: text("r2_key").notNull(),
  alt: text("alt"),
  width: integer("width"),
  height: integer("height"),
  contentType: text("content_type"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedBy: text("updated_by"),
});

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  locale: text("locale").notNull().default("en"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const paidServices = sqliteTable("paid_services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  currency: text("currency").notNull().default("THB"),
  unit: text("unit"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Single-row cache (key = "reviews") for Google Places API responses.
// Avoids hitting Google's API on every SSR render; TTL enforced in code.
export const googleReviewsCache = sqliteTable("google_reviews_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cacheKey: text("cache_key").notNull().unique(),
  data: text("data").notNull(),
  fetchedAt: text("fetched_at").notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContentOverride = typeof contentOverrides.$inferSelect;
export type NewContentOverride = typeof contentOverrides.$inferInsert;
export type ContentImage = typeof contentImages.$inferSelect;
export type NewContentImage = typeof contentImages.$inferInsert;
export type PaidService = typeof paidServices.$inferSelect;
export type NewPaidService = typeof paidServices.$inferInsert;
