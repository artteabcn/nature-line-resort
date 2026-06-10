-- Migration: add Beds24 booking tracking columns
-- Keeps existing smoobu_* columns for historical bookings made before the migration.
ALTER TABLE bookings ADD COLUMN beds24_room_id INTEGER;
ALTER TABLE bookings ADD COLUMN beds24_booking_id INTEGER;
