export type PublicApiError = {
	error: string;
	code: string;
	message: string;
	hint?: string;
};

export type DrawSnapshotRound = {
	round: number;
	drawDate: string;
	numbers: number[];
	bonusNumber: number;
	firstPrizeAmount: number;
	firstPrizeWinnerCount: number;
	claimStartDate: string;
	claimDeadlineDate: string;
};

export type DrawSnapshot = {
	generatedAt: string;
	latestRound: number;
	rounds: DrawSnapshotRound[];
};

export type StatsOverview = {
	latestRound: number;
	latestDrawDate: string;
	totalRounds: number;
	topNumbers: Array<Record<string, unknown>>;
	lowestNumbers: Array<Record<string, unknown>>;
	topPairs: Array<Record<string, unknown>>;
	bonusSummary: Record<string, unknown> | null;
	freshness: Record<string, unknown>;
	summaries: {
		recent10: string;
		recent50: string;
		recent100: string;
		overall: string;
	};
};

export type PublicAuthSummary = {
	emailPassword: {
		enabled: true;
	};
	socialProviders: Array<{
		id: string;
		label: string;
	}>;
	sessionMode: "cookie";
	oauthDiscovery: "planned";
};

export type StatusDocument = {
	service: string;
	status: string;
	timestamp: string;
	publicSurfaces: Record<string, string>;
	auth: PublicAuthSummary;
	dependencies: Record<string, string>;
	issues: Array<{
		code: string;
		message: string;
	}>;
};

export type OpenApiDocument = Record<string, unknown>;

export type ClientOptions = {
	baseUrl?: string;
	fetch?: typeof fetch;
};
