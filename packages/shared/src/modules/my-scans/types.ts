export type MyScanResultStatus =
	| "winner"
	| "loser"
	| "unreleased"
	| "unknown"
	| "expired";

export type MyScanListItem = {
	id: string;
	ticketHash: string;
	round: number | null;
	gamesCount: number | null;
	resultStatus: MyScanResultStatus;
	lastCheckedAt: string | null;
	winningGrade: string | null;
	claimStartAt: string | null;
	claimDeadlineAt: string | null;
	summary: string;
	createdAt: string;
	updatedAt: string;
};

export type MyScanSummary = {
	totalTickets: number;
	pendingResults: number;
	winningTickets: number;
	lastScannedAt: string | null;
};

export type MyScansListInput = {
	limit?: number;
};

export type MyScanUpsertInput = {
	ticketHash: string;
	qrData: string;
	scannedAt: string;
	round?: number | null;
	gamesCount?: number | null;
	resultStatus: MyScanResultStatus;
	lastCheckedAt?: string | null;
	winningGrade?: string | null;
	claimStartAt?: string | null;
	claimDeadlineAt?: string | null;
	summary: string;
};

export type MyScansUpsertPendingInput = {
	items: MyScanUpsertInput[];
};

export type MyScansUpsertPendingResult = {
	syncedTicketHashes: string[];
};
