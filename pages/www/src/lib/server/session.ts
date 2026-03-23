import type { PublicSession, PublicUser } from "@645/shared";

type SessionEnvelopeLike = {
	session?: {
		expiresAt?: Date | string;
	};
	user?: {
		id?: string;
		name?: string | null;
		email?: string | null;
		image?: string | null;
	};
};

const toIsoString = (value: Date | string | undefined): string | null => {
	if (!value) return null;
	if (value instanceof Date) return value.toISOString();

	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const toPublicSession = (value: unknown): PublicSession | null => {
	if (!value || typeof value !== "object") return null;

	const session = (value as SessionEnvelopeLike).session;
	const user = (value as SessionEnvelopeLike).user;

	if (!session || !user || typeof user.id !== "string") {
		return null;
	}

	return {
		session: {
			expiresAt: toIsoString(session.expiresAt),
		},
		user: {
			id: user.id,
			name: typeof user.name === "string" ? user.name : null,
			email: typeof user.email === "string" ? user.email : null,
			image: typeof user.image === "string" ? user.image : null,
		},
	};
};

export const toPublicUser = (session: PublicSession | null): PublicUser | null =>
	session?.user ?? null;
