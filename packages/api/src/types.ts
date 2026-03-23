import type { PublicSession, PublicUser } from "@645/shared";

export type AuthContext = {
	session: PublicSession | null;
	user: PublicUser | null;
	userId: string | null;
};

export type AppContext = {
	request: Request;
	auth: AuthContext;
	db?: unknown;
};
