-- min_stay and cutoff_hour managed via site_config (key/value table already exists)
INSERT OR IGNORE INTO site_config (key, value, updated_at) VALUES ('min_stay', '1', datetime('now'));
INSERT OR IGNORE INTO site_config (key, value, updated_at) VALUES ('cutoff_hour', '18', datetime('now'));
