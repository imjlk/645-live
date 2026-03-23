export type PublicUser = {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
};

export type PublicSession = {
	session: {
		expiresAt: string | null;
	};
	user: PublicUser;
};
