CREATE TABLE `case_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`occurred_at` integer NOT NULL,
	`metadata` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `case_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`content` text NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `cases` ADD `case_type` text DEFAULT 'HUKUK' NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` ADD `current_stage` text DEFAULT 'OPENED' NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` ADD `opposing_party` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `judge_name` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `next_hearing_at` integer;--> statement-breakpoint
ALTER TABLE `cases` ADD `summary` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `opened_at` integer;