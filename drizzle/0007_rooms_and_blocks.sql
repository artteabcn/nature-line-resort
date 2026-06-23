-- Add room_id to bookings (nullable for backwards compat with old rows)
ALTER TABLE bookings ADD COLUMN arkadya_fee_thb INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN owner_payout_thb INTEGER NOT NULL DEFAULT 0;

-- Manual block dates per room
CREATE TABLE IF NOT EXISTS blocked_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  date TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(room_id, date)
);
