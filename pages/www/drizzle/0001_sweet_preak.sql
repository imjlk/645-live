CREATE TABLE "member_scan" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ticket_hash" text NOT NULL,
	"qr_data" text NOT NULL,
	"round" integer,
	"games_count" integer,
	"result_status" text NOT NULL,
	"last_checked_at" timestamp,
	"winning_grade" text,
	"summary" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_scan" ADD CONSTRAINT "member_scan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "member_scan_user_ticket_hash_unique" ON "member_scan" USING btree ("user_id","ticket_hash");--> statement-breakpoint
CREATE INDEX "member_scan_user_updated_at_idx" ON "member_scan" USING btree ("user_id","updated_at");