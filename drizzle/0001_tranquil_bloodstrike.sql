ALTER TABLE `bookings` ADD `smoobu_apartment_id` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `smoobu_reservation_id` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `channel_id` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `total_price` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `currency` text DEFAULT 'THB';