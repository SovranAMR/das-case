ALTER TABLE `tasks` ADD `assigned_at` integer;--> statement-breakpoint
UPDATE `tasks` SET `assigned_at` = `created_at` WHERE `assigned_to` IS NOT NULL AND `assigned_at` IS NULL;
