const DEFAULT_BASE_URL = "https://645.live";

type CommandName = "recent" | "draw" | "stats" | "auth" | "status" | "openapi" | "help";

type ParsedOptions = {
	command: CommandName;
	args: string[];
	baseUrl: string;
	json: boolean;
};

type DrawSnapshotRound = {
	round: number;
	drawDate: string;
	numbers: number[];
	bonusNumber: number;
	firstPrizeWinnerCount: number;
	claimDeadlineDate: string;
};

type DrawSnapshot = {
	latestRound: number;
	rounds: DrawSnapshotRound[];
};

type StatsOverview = {
	latestRound: number;
	totalRounds: number;
	topNumbers: Array<{
		number?: number;
		draw_count?: number;
	}>;
	summaries: {
		recent10: string;
		recent50: string;
		recent100: string;
		overall: string;
	};
};

type PublicAuthSummary = {
	emailPassword: {
		enabled: boolean;
	};
	socialProviders: Array<{
		id: string;
		label: string;
	}>;
	sessionMode: string;
	oauthDiscovery: string;
};

type StatusDocument = {
	status: string;
	timestamp: string;
	dependencies: Record<string, string>;
	issues: Array<{
		code: string;
		message: string;
	}>;
};

type OpenApiDocument = {
	info?: {
		title?: string;
		version?: string;
	};
	paths?: Record<string, unknown>;
};

type ErrorPayload = {
	message?: string;
	code?: string;
	hint?: string;
};

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
	try {
		const options = parseArgs(argv);

		switch (options.command) {
			case "recent":
				await runRecent(options);
				return 0;
			case "draw":
				await runDraw(options);
				return 0;
			case "stats":
				await runStats(options);
				return 0;
			case "auth":
				await runAuth(options);
				return 0;
			case "status":
				await runStatus(options);
				return 0;
			case "openapi":
				await runOpenApi(options);
				return 0;
			case "help":
				printHelp();
				return 0;
			default:
				printHelp();
				return 1;
		}
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(String(error));
		}
		return 1;
	}
}

async function runRecent(options: ParsedOptions) {
	const limit = readIntegerFlag(options.args, "--limit");
	const snapshot = await requestJson<DrawSnapshot>(options.baseUrl, "/api/lotto-draws-recent.json");
	const rounds = snapshot.rounds.slice(0, limit ?? 10);

	if (options.json) {
		printJson({
			...snapshot,
			rounds,
		});
		return;
	}

	console.log(`Latest round: ${snapshot.latestRound}`);
	for (const round of rounds) {
		console.log(
			`- #${round.round} ${round.drawDate} | ${round.numbers.join(", ")} + ${round.bonusNumber} | winners: ${round.firstPrizeWinnerCount} | claim until ${round.claimDeadlineDate}`,
		);
	}
}

async function runDraw(options: ParsedOptions) {
	const roundArg = options.args[0];
	const round = Number(roundArg);

	if (!Number.isInteger(round) || round < 1) {
		throw new Error("Usage: 645live draw <round>");
	}

	const draw = await requestJson<DrawSnapshotRound>(
		options.baseUrl,
		`/api/lotto-draws/${round}.json`,
	);

	if (options.json) {
		printJson(draw);
		return;
	}

	console.log(`Round #${draw.round}`);
	console.log(`Draw date: ${draw.drawDate}`);
	console.log(`Numbers: ${draw.numbers.join(", ")}`);
	console.log(`Bonus: ${draw.bonusNumber}`);
	console.log(`First-prize winners: ${draw.firstPrizeWinnerCount}`);
	console.log(`Claim deadline: ${draw.claimDeadlineDate}`);
}

async function runStats(options: ParsedOptions) {
	const stats = await requestJson<StatsOverview>(options.baseUrl, "/api/stats/overview.json");

	if (options.json) {
		printJson(stats);
		return;
	}

	console.log(`Latest round: ${stats.latestRound}`);
	console.log(`Total rounds: ${stats.totalRounds}`);
	console.log(
		`Top numbers: ${stats.topNumbers
			.map((item) =>
				typeof item.number === "number" && typeof item.draw_count === "number"
					? `${item.number} (${item.draw_count})`
					: null,
			)
			.filter(Boolean)
			.join(", ")}`,
	);
	console.log(`Recent 10: ${stats.summaries.recent10}`);
	console.log(`Recent 50: ${stats.summaries.recent50}`);
	console.log(`Recent 100: ${stats.summaries.recent100}`);
}

async function runAuth(options: ParsedOptions) {
	const auth = await requestJson<PublicAuthSummary>(options.baseUrl, "/api/auth/providers.json");

	if (options.json) {
		printJson(auth);
		return;
	}

	console.log(`Email/password: ${auth.emailPassword.enabled ? "enabled" : "disabled"}`);
	console.log(`Session mode: ${auth.sessionMode}`);
	console.log(`OAuth discovery: ${auth.oauthDiscovery}`);
	console.log(
		`Social providers: ${
			auth.socialProviders.length > 0
				? auth.socialProviders.map((provider) => provider.label).join(", ")
				: "none configured"
		}`,
	);
}

async function runStatus(options: ParsedOptions) {
	const status = await requestJson<StatusDocument>(options.baseUrl, "/api/status.json");

	if (options.json) {
		printJson(status);
		return;
	}

	console.log(`Status: ${status.status}`);
	console.log(`Checked at: ${status.timestamp}`);
	for (const [key, value] of Object.entries(status.dependencies)) {
		console.log(`- ${key}: ${value}`);
	}

	if (status.issues.length > 0) {
		console.log("Issues:");
		for (const issue of status.issues) {
			console.log(`- ${issue.code}: ${issue.message}`);
		}
	}
}

async function runOpenApi(options: ParsedOptions) {
	const document = await requestJson<OpenApiDocument>(options.baseUrl, "/api/openapi.json");

	if (options.json) {
		printJson(document);
		return;
	}

	const pathCount = document.paths ? Object.keys(document.paths).length : 0;
	console.log(`${document.info?.title ?? "645.live Public API"} (${document.info?.version ?? "unknown"})`);
	console.log(`Documented paths: ${pathCount}`);
	if (document.paths) {
		for (const pathname of Object.keys(document.paths)) {
			console.log(`- ${pathname}`);
		}
	}
}

function parseArgs(argv: string[]): ParsedOptions {
	const args = [...argv];
	let baseUrl = DEFAULT_BASE_URL;
	let json = false;

	for (let index = 0; index < args.length; index += 1) {
		const value = args[index];

		if (value === "--json") {
			json = true;
			args.splice(index, 1);
			index -= 1;
			continue;
		}

		if (value === "--base-url") {
			const nextValue = args[index + 1];
			if (!nextValue) {
				throw new Error("Missing value for --base-url");
			}

			baseUrl = normalizeBaseUrl(nextValue);
			args.splice(index, 2);
			index -= 1;
		}
	}

	const command = normalizeCommand(args.shift());
	return {
		command,
		args,
		baseUrl,
		json,
	};
}

function normalizeCommand(value: string | undefined): CommandName {
	switch (value) {
		case undefined:
		case "help":
		case "--help":
		case "-h":
			return "help";
		case "recent":
		case "draw":
		case "stats":
		case "auth":
		case "status":
		case "openapi":
			return value;
		default:
			throw new Error(`Unknown command: ${value}`);
	}
}

function readIntegerFlag(args: string[], flag: string): number | undefined {
	const index = args.indexOf(flag);
	if (index === -1) {
		return undefined;
	}

	const value = Number(args[index + 1]);
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(`Expected a positive integer after ${flag}`);
	}

	return value;
}

async function requestJson<T>(baseUrl: string, pathname: string): Promise<T> {
	const response = await fetch(new URL(pathname, `${baseUrl}/`), {
		headers: {
			accept: "application/json",
		},
	});

	if (!response.ok) {
		throw await createApiError(response);
	}

	return (await response.json()) as T;
}

async function createApiError(response: Response): Promise<Error> {
	const fallbackMessage = `${response.status} ${response.statusText}`.trim();

	try {
		const payload = (await response.json()) as ErrorPayload;
		const suffix = payload.hint ? ` Hint: ${payload.hint}` : "";
		return new Error(payload.message ? `${payload.message}${suffix}` : fallbackMessage);
	} catch {
		return new Error(fallbackMessage);
	}
}

function printHelp() {
	console.log(`645.live CLI

Usage:
  645live recent [--limit <n>] [--json] [--base-url <url>]
  645live draw <round> [--json] [--base-url <url>]
  645live stats [--json] [--base-url <url>]
  645live auth [--json] [--base-url <url>]
  645live status [--json] [--base-url <url>]
  645live openapi [--json] [--base-url <url>]
`);
}

function printJson(value: unknown) {
	console.log(JSON.stringify(value, null, 2));
}

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, "");
}
