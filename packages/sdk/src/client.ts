import type {
	ClientOptions,
	DrawSnapshot,
	DrawSnapshotRound,
	OpenApiDocument,
	PublicApiError,
	PublicAuthSummary,
	StatusDocument,
	StatsOverview,
} from "./types.js";

const DEFAULT_BASE_URL = "https://645.live";

export class Live645ApiError extends Error {
	status: number;
	code?: string;
	hint?: string;
	payload?: PublicApiError;

	constructor(
		status: number,
		message: string,
		options: {
			code?: string;
			hint?: string;
			payload?: PublicApiError;
		} = {},
	) {
		super(message);
		this.name = "Live645ApiError";
		this.status = status;
		this.code = options.code;
		this.hint = options.hint;
		this.payload = options.payload;
	}
}

export class Live645Client {
	readonly baseUrl: string;
	readonly fetchImpl: typeof fetch;

	constructor(options: ClientOptions = {}) {
		this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
		this.fetchImpl = options.fetch ?? fetch;
	}

	async getRecentDraws(): Promise<DrawSnapshot> {
		return this.requestJson<DrawSnapshot>("/api/lotto-draws-recent.json");
	}

	async getDraw(round: number): Promise<DrawSnapshotRound> {
		if (!Number.isInteger(round) || round < 1) {
			throw new TypeError("round must be a positive integer.");
		}

		return this.requestJson<DrawSnapshotRound>(`/api/lotto-draws/${round}.json`);
	}

	async getStatsOverview(): Promise<StatsOverview> {
		return this.requestJson<StatsOverview>("/api/stats/overview.json");
	}

	async getAuthProviders(): Promise<PublicAuthSummary> {
		return this.requestJson<PublicAuthSummary>("/api/auth/providers.json");
	}

	async getStatus(): Promise<StatusDocument> {
		return this.requestJson<StatusDocument>("/api/status.json");
	}

	async getOpenApiDocument(): Promise<OpenApiDocument> {
		return this.requestJson<OpenApiDocument>("/api/openapi.json");
	}

	url(pathname: string): string {
		return new URL(pathname, `${this.baseUrl}/`).toString();
	}

	private async requestJson<T>(pathname: string): Promise<T> {
		const response = await this.fetchImpl(this.url(pathname), {
			headers: {
				accept: "application/json",
			},
		});

		if (!response.ok) {
			throw await createApiError(response);
		}

		return (await response.json()) as T;
	}
}

export function create645LiveClient(options: ClientOptions = {}): Live645Client {
	return new Live645Client(options);
}

async function createApiError(response: Response): Promise<Live645ApiError> {
	const fallbackMessage = `${response.status} ${response.statusText}`.trim();

	try {
		const payload = (await response.json()) as PublicApiError;
		return new Live645ApiError(response.status, payload.message || fallbackMessage, {
			code: payload.code,
			hint: payload.hint,
			payload,
		});
	} catch {
		return new Live645ApiError(response.status, fallbackMessage);
	}
}

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, "");
}
