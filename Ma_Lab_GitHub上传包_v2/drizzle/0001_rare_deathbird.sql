CREATE TABLE `admin_login_attempts` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`window_started_at` text NOT NULL,
	`blocked_until` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_login_attempts_blocked_idx` ON `admin_login_attempts` (`blocked_until`);--> statement-breakpoint
ALTER TABLE `admin_users` ADD `username` text;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `password_salt` text;--> statement-breakpoint
DELETE FROM `admin_sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_username_idx` ON `admin_users` (`username`);--> statement-breakpoint
ALTER TABLE `content_items` ADD `revision` integer DEFAULT 1 NOT NULL;
