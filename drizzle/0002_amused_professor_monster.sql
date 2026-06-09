ALTER TABLE `bookings` ADD `payment_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `stripe_payment_intent_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `amount_paid` integer;