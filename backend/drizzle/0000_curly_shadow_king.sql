CREATE TABLE `ai_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`sequence_id` text NOT NULL,
	`generation_type` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`total_tokens` integer,
	`estimated_cost_usd` real,
	`latency_ms` integer,
	`raw_prompt` text,
	`raw_response` text,
	`status` text NOT NULL,
	`error_message` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`sequence_id`) REFERENCES `message_sequences`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `message_sequences` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text NOT NULL,
	`tov_config_id` text NOT NULL,
	`company_context` text NOT NULL,
	`sequence_length` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`prospect_analysis` text,
	`overall_confidence` real,
	`error_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tov_config_id`) REFERENCES `tov_configs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` text PRIMARY KEY NOT NULL,
	`linkedin_url` text NOT NULL,
	`linkedin_username` text,
	`full_name` text,
	`headline` text,
	`summary` text,
	`current_company` text,
	`current_position` text,
	`location` text,
	`industry` text,
	`profile_data` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prospects_linkedin_url_unique` ON `prospects` (`linkedin_url`);--> statement-breakpoint
CREATE TABLE `sequence_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`sequence_id` text NOT NULL,
	`step_number` integer NOT NULL,
	`message_type` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`thinking_process` text,
	`confidence_score` real,
	`personalization_points` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`sequence_id`) REFERENCES `message_sequences`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tov_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`formality` real NOT NULL,
	`warmth` real NOT NULL,
	`directness` real NOT NULL,
	`humor` real DEFAULT 0.3,
	`enthusiasm` real DEFAULT 0.5,
	`custom_instructions` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
