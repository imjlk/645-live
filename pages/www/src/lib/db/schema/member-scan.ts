import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const memberScan = pgTable(
	"member_scan",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		ticketHash: text("ticket_hash").notNull(),
		qrData: text("qr_data").notNull(),
		round: integer("round"),
		gamesCount: integer("games_count"),
		resultStatus: text("result_status").notNull(),
		lastCheckedAt: timestamp("last_checked_at"),
		winningGrade: text("winning_grade"),
		summary: text("summary").notNull(),
		createdAt: timestamp("created_at")
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("member_scan_user_ticket_hash_unique").on(
			table.userId,
			table.ticketHash,
		),
		index("member_scan_user_updated_at_idx").on(table.userId, table.updatedAt),
	],
);
