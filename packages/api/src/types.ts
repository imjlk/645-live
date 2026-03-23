import type { PublicSession, PublicUser } from "@645/shared";
import type {
	MyScanListItem,
	MyScanSummary,
	MyScanUpsertInput,
	MyScansListInput,
} from "@645/shared";

export type AuthContext = {
	session: PublicSession | null;
	user: PublicUser | null;
	userId: string | null;
};

export type AppContext = {
	request: Request;
	auth: AuthContext;
	db?: unknown;
	services: {
		myScans: {
			getSummary(userId: string): Promise<MyScanSummary>;
			list(
				userId: string,
				input?: MyScansListInput,
			): Promise<MyScanListItem[]>;
			upsertPending(
				userId: string,
				items: MyScanUpsertInput[],
			): Promise<{ syncedTicketHashes: string[] }>;
		};
	};
};
