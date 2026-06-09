CREATE TABLE `content_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slot` text NOT NULL,
	`r2_key` text NOT NULL,
	`alt` text,
	`width` integer,
	`height` integer,
	`content_type` text,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_images_slot_unique` ON `content_images` (`slot`);--> statement-breakpoint
CREATE TABLE `content_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`locale` text NOT NULL,
	`path` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_overrides_locale_path_unique` ON `content_overrides` (`locale`, `path`);
