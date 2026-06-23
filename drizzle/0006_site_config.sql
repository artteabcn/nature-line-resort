CREATE TABLE `site_config` (
  `key` TEXT NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_by` TEXT
);
