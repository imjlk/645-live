import {
	SITE_GITHUB,
	SITE_NAME,
	SITE_ORIGIN,
	SITE_TWITTER,
	absoluteUrl,
} from "$lib/seo/index.js";

export type AgentTable = {
	headers: string[];
	rows: string[][];
};

export type AgentLink = {
	label: string;
	href: string;
	description?: string;
};

export type AgentSection = {
	title: string;
	paragraphs?: string[];
	bullets?: string[];
	table?: AgentTable;
	links?: AgentLink[];
};

export type AgentPage = {
	key:
		| "home"
		| "agent-home"
		| "docs"
		| "compare"
		| "status"
		| "methodology"
		| "contact";
	eyebrow: string;
	title: string;
	description: string;
	intro: string[];
	sections: AgentSection[];
};

export type AgentSkillDefinition = {
	slug: "recent-draws" | "stats-overview" | "member-scans" | "qr-checking";
	name: string;
	type: "skill";
	description: string;
};

export const DISCOVERY_PATHS = {
	home: "/",
	docs: "/docs",
	developers: "/developers",
	compare: "/compare",
	status: "/status",
	methodology: "/methodology",
	contact: "/contact",
	pricing: "/pricing.md",
	llms: "/llms.txt",
	llmsFull: "/llms-full.txt",
	apiCatalog: "/.well-known/api-catalog",
	aiPlugin: "/.well-known/ai-plugin.json",
	agentManifest: "/.well-known/agent.json",
	agentCard: "/.well-known/agent-card.json",
	mcp: "/.well-known/mcp",
	mcpAlias: "/mcp",
	mcpServerCard: "/.well-known/mcp/server-card.json",
	agentSkillsIndex: "/.well-known/agent-skills/index.json",
	openApi: "/api/openapi.json",
	apiStatus: "/api/status.json",
	authProviders: "/api/auth/providers.json",
	recentDraws: "/api/lotto-draws-recent.json",
	statsOverview: "/api/stats/overview.json",
	rpc: "/rpc",
} as const;

export const AGENT_CAPABILITIES = [
	"Recent Lotto 6/45 draw snapshots with claim window dates.",
	"Statistics overview derived from TrailBase-backed number, bonus, odd/even, high/low, and pair analysis.",
	"Homepage and docs that support HTML, markdown negotiation, and an agent-specific view.",
	"Same-domain MCP and WebMCP tools for public reads plus signed-in member scan workflows.",
	"Signed-in member scan summary, list, and pending sync actions via the existing Better Auth session cookie flow.",
] as const;

export const AUTH_SUMMARY_LINES = [
	"Public read APIs do not require authentication.",
	"Member scan actions use the existing Better Auth session cookie on 645.live.",
	"Email/password login is available today. Configured social providers are surfaced at runtime from Better Auth settings.",
	"OAuth/OIDC discovery metadata is intentionally deferred to a later Better Auth implementation phase.",
] as const;

export const COMPARE_MATRIX: AgentTable = {
	headers: [
		"Category",
		"Official checker",
		"Random generator",
		"Statistics archive",
		"645.live",
	],
	rows: [
		[
			"Official draw verification",
			"Strong",
			"Limited",
			"Usually delayed",
			"Strong, with official draw snapshots and claim dates",
		],
		[
			"Real-time scan trend visibility",
			"None",
			"None",
			"Usually none",
			"Available through live scan and member scan surfaces",
		],
		[
			"Pattern analysis depth",
			"Basic",
			"Low",
			"Medium",
			"High across numbers, pairs, colors, odd/even, high/low, AC, and bonus",
		],
		[
			"Agent-readable discovery",
			"Rare",
			"Rare",
			"Rare",
			"Phase 1 adds llms, api-catalog, OpenAPI, MCP, WebMCP, and markdown negotiation",
		],
		[
			"Signed-in workflow support",
			"Usually browser-only",
			"No",
			"No",
			"Member scan summary and sync endpoints built on existing Better Auth + TrailBase workflows",
		],
	],
};

export const AGENT_SKILLS: AgentSkillDefinition[] = [
	{
		slug: "recent-draws",
		name: "Recent Draw Snapshots",
		type: "skill",
		description:
			"Fetch recent Korean Lotto 6/45 draw snapshots, payout windows, and machine-readable round data.",
	},
	{
		slug: "stats-overview",
		name: "Stats Overview",
		type: "skill",
		description:
			"Summarize 645.live's TrailBase-backed statistics hub, including hot numbers, pattern summaries, and freshness.",
	},
	{
		slug: "member-scans",
		name: "Member Scans",
		type: "skill",
		description:
			"Read or sync signed-in member scan data using the existing Better Auth session-cookie flow.",
	},
	{
		slug: "qr-checking",
		name: "QR Checking",
		type: "skill",
		description:
			"Explain and route users to the QR scan and ticket-checking workflows available on 645.live.",
	},
] as const;

function getCommonLinks(): AgentLink[] {
	return [
		{
			label: "Developer Docs",
			href: DISCOVERY_PATHS.docs,
			description: "Public API, auth, MCP, WebMCP, and quickstart guidance.",
		},
		{
			label: "OpenAPI",
			href: DISCOVERY_PATHS.openApi,
			description: "Machine-readable public REST surface for agents and SDKs.",
		},
		{
			label: "MCP Endpoint",
			href: DISCOVERY_PATHS.mcp,
			description: "Same-domain WebMCP/remote MCP endpoint for agent tool discovery.",
		},
		{
			label: "Methodology",
			href: DISCOVERY_PATHS.methodology,
			description: "Explains how official results and scan-derived insights are combined.",
		},
	];
}

export function getHomePageContent(): AgentPage {
	return {
		key: "home",
		eyebrow: "Korean Lotto 6/45 Intelligence",
		title: "645.live is a Korean Lotto 6/45 real-time scan, QR checking, and statistics platform.",
		description:
			"645.live helps people understand Korean Lotto 6/45 draws through official result snapshots, TrailBase-backed statistics, QR checking, and member scan workflows that are now being surfaced for AI agents as well as humans.",
		intro: [
			"645.live combines official Korean Lotto 6/45 draw data with site-native scan and analysis signals so users can move from raw results to interpretable patterns quickly. Instead of only showing the winning numbers, the site highlights recent draw snapshots, number frequency shifts, bonus number behavior, color and section balances, and scan-driven interest signals gathered through the existing TrailBase-backed application.",
			"For AI agents, the goal of this phase is discoverability and reliable execution. The homepage, docs, OpenAPI, llms files, API catalog, MCP endpoints, and WebMCP tools all describe the same product in the same terms: a Korean Lotto 6/45 statistics and QR checking product with public read APIs plus authenticated member scan workflows powered by Better Auth and TrailBase.",
		],
		sections: [
			{
				title: "What 645.live does",
				bullets: [
					"Shows recent Korean Lotto 6/45 draw snapshots with official winning numbers, bonus number, first-prize counts, and claim deadline dates.",
					"Provides number frequency analysis, pattern comparisons, and statistics across odd/even, high/low, colors, sections, pairs, bonus numbers, and AC values.",
					"Supports QR-based ticket checking and signed-in member scan history using the site's existing Better Auth and TrailBase workflow.",
					"Publishes machine-readable discovery surfaces for agents, including llms files, OpenAPI, API catalog, MCP, WebMCP, and markdown negotiation.",
				],
			},
			{
				title: "Agent-ready capabilities",
				table: {
					headers: ["Capability", "Surface", "Why it matters"],
					rows: [
						[
							"Recent draw lookup",
							"/api/lotto-draws-recent.json and /api/lotto-draws/[round].json",
							"Agents can fetch structured, current Korean Lotto 6/45 round data without scraping HTML.",
						],
						[
							"Statistics overview",
							"/stats, /api/stats/overview.json, MCP tools",
							"Agents can summarize frequency analysis and recent pattern shifts in a stable format.",
						],
						[
							"Authentication visibility",
							"/api/auth/providers.json and /docs",
							"Agents can understand which sign-in flows exist today before attempting member operations.",
						],
						[
							"Signed-in scan workflows",
							"/rpc and MCP member scan tools",
							"Agents can use the existing Better Auth session-cookie flow for member scan summary, list, and sync operations.",
						],
					],
				},
			},
			{
				title: "Start here",
				links: getCommonLinks(),
			},
		],
	};
}

export function getAgentHomePageContent(): AgentPage {
	return {
		key: "agent-home",
		eyebrow: "Agent Mode",
		title: "645.live agent view",
		description:
			"This view is optimized for AI agents. It lists product capabilities, public endpoints, authentication behavior, and discovery resources without the standard marketing or visual homepage shell.",
		intro: [
			"Use this page when you need a compact machine-oriented summary of 645.live. Public read operations are available without auth. Signed-in member scan actions reuse the site's existing Better Auth session cookie and TrailBase-backed services.",
		],
		sections: [
			{
				title: "Capabilities",
				bullets: [...AGENT_CAPABILITIES],
			},
			{
				title: "Authentication",
				bullets: [...AUTH_SUMMARY_LINES],
			},
			{
				title: "Endpoints and resources",
				table: {
					headers: ["Surface", "URL", "Purpose"],
					rows: [
						["Developer docs", absoluteUrl(DISCOVERY_PATHS.docs), "Human-readable API and integration guide"],
						["OpenAPI", absoluteUrl(DISCOVERY_PATHS.openApi), "Machine-readable REST description"],
						["API catalog", absoluteUrl(DISCOVERY_PATHS.apiCatalog), "RFC 9727 API discovery document"],
						["Recent draws", absoluteUrl(DISCOVERY_PATHS.recentDraws), "Latest Korean Lotto 6/45 snapshots"],
						["Stats overview", absoluteUrl(DISCOVERY_PATHS.statsOverview), "Summary of TrailBase-backed statistics"],
						["MCP endpoint", absoluteUrl(DISCOVERY_PATHS.mcp), "Remote MCP / WebMCP discovery"],
						["Status", absoluteUrl(DISCOVERY_PATHS.apiStatus), "Machine-readable health surface"],
					],
				},
			},
			{
				title: "Discovery documents",
				links: [
					{ label: "llms.txt", href: DISCOVERY_PATHS.llms },
					{ label: "llms-full.txt", href: DISCOVERY_PATHS.llmsFull },
					{ label: "Pricing", href: DISCOVERY_PATHS.pricing },
					{ label: "Agent Manifest", href: DISCOVERY_PATHS.agentManifest },
					{ label: "Agent Card", href: DISCOVERY_PATHS.agentCard },
					{ label: "MCP Server Card", href: DISCOVERY_PATHS.mcpServerCard },
					{ label: "Agent Skills Index", href: DISCOVERY_PATHS.agentSkillsIndex },
				],
			},
		],
	};
}

export function getDocsPageContent(): AgentPage {
	return {
		key: "docs",
		eyebrow: "Developer Docs",
		title: "Build with 645.live",
		description:
			"645.live exposes public Korean Lotto 6/45 read APIs, markdown-friendly docs, same-domain MCP discovery, and signed-in member scan workflows built on the site's existing Better Auth and TrailBase stack.",
		intro: [
			"Use the public REST API when you need stable machine-readable access to recent draw snapshots, statistics overviews, auth provider visibility, or site status. Use MCP when your agent platform already speaks MCP and you want the same core actions exposed as tools.",
			"The current auth model is intentionally simple. Public read APIs are anonymous. Member scan actions require the user's existing Better Auth session cookie. OAuth discovery endpoints are reserved for a later phase and are not published yet.",
		],
		sections: [
			{
				title: "Quickstart",
				bullets: [
					`Fetch recent draw data from ${absoluteUrl(DISCOVERY_PATHS.recentDraws)}.`,
					`Fetch high-level statistics from ${absoluteUrl(DISCOVERY_PATHS.statsOverview)}.`,
					`Inspect auth provider availability from ${absoluteUrl(DISCOVERY_PATHS.authProviders)} before sending a user to login.`,
					`Use ${absoluteUrl(DISCOVERY_PATHS.openApi)} to generate SDKs or function-calling schemas.`,
				],
			},
			{
				title: "Public REST API",
				table: {
					headers: ["Method", "Path", "Description"],
					rows: [
						["GET", DISCOVERY_PATHS.recentDraws, "Recent Korean Lotto 6/45 draw snapshots"],
						["GET", "/api/lotto-draws/{round}.json", "Structured snapshot for a single round"],
						["GET", DISCOVERY_PATHS.statsOverview, "Statistics hub summary from existing TrailBase-backed services"],
						["GET", DISCOVERY_PATHS.authProviders, "Runtime view of enabled Better Auth sign-in providers"],
						["GET", DISCOVERY_PATHS.apiStatus, "Machine-readable service status"],
						["GET", DISCOVERY_PATHS.openApi, "OpenAPI description for the public REST surface"],
					],
				},
			},
			{
				title: "MCP and WebMCP",
				paragraphs: [
					`Remote MCP discovery is available at ${absoluteUrl(DISCOVERY_PATHS.mcp)} with an alias at ${absoluteUrl(DISCOVERY_PATHS.mcpAlias)}. MCP Apps metadata uses ui:// resources so capable hosts can render lightweight UI surfaces for stats, draw details, and member scan data.`,
					"WebMCP is also registered in the browser when navigator.modelContext is available. The browser-facing tools mirror the same capability model as the remote MCP server and stay bound to the user's real session state.",
				],
			},
			{
				title: "Authentication behavior",
				bullets: [...AUTH_SUMMARY_LINES],
			},
			{
				title: "Errors and support",
				bullets: [
					"Public API errors return JSON with error, code, message, and hint fields instead of HTML fallback pages.",
					"Use /api/status.json when an agent needs a machine-readable health check before retrying.",
					"Use /contact for public support channels and implementation issue reporting.",
				],
			},
			{
				title: "Related resources",
				links: [
					{ label: "Agent View", href: "/?mode=agent", description: "Compact AI-oriented homepage variant" },
					{ label: "API Catalog", href: DISCOVERY_PATHS.apiCatalog, description: "RFC 9727 discovery document" },
					{ label: "Methodology", href: DISCOVERY_PATHS.methodology, description: "How official and scan-derived data are combined" },
					{ label: "Pricing", href: DISCOVERY_PATHS.pricing, description: "Machine-readable plan information" },
					{ label: "Contact", href: DISCOVERY_PATHS.contact, description: "Public support and issue-reporting channels" },
				],
			},
		],
	};
}

export function getComparePageContent(): AgentPage {
	return {
		key: "compare",
		eyebrow: "Positioning",
		title: "Why choose 645.live for Korean Lotto 6/45 analysis",
		description:
			"645.live is designed for people and agents who need more than a basic checker: it combines official result snapshots, TrailBase-backed scan trends, deep statistics, and machine-readable discovery surfaces in one product.",
		intro: [
			"Many lottery products fall into one narrow category. Some only verify winning numbers. Some only generate random tickets. Some only archive statistics without member workflows or modern agent discovery. 645.live aims to bridge those categories by combining official Korean Lotto 6/45 reference data, scan-derived interest signals, and an agent-friendly integration surface.",
		],
		sections: [
			{
				title: "Feature matrix",
				table: COMPARE_MATRIX,
			},
			{
				title: "Differentiators",
				bullets: [
					"TrailBase-backed scan and member flows coexist with public read APIs instead of being hidden behind browser-only UI.",
					"Recent draw snapshots include claim window dates and are easy for agents to fetch without scraping.",
					"The same product description is aligned across homepage metadata, docs, llms files, OpenAPI, MCP, and WebMCP.",
					"Stats pages are not just archives; they explain frequency analysis and pattern shifts across multiple analytical views.",
				],
			},
			{
				title: "Read more",
				links: [
					{ label: "Developer Docs", href: DISCOVERY_PATHS.docs },
					{ label: "Methodology", href: DISCOVERY_PATHS.methodology },
					{ label: "Guide", href: "/guide" },
				],
			},
		],
	};
}

export function getStatusPageContent(): AgentPage {
	return {
		key: "status",
		eyebrow: "Status",
		title: "645.live public surface status",
		description:
			"This page explains the health and intended usage of the public 645.live read surfaces that are relevant to AI agents and developer integrations.",
		intro: [
			"Public read surfaces include the recent draw snapshot API, the statistics overview API, the docs and markdown-negotiated pages, the RFC 9727 API catalog, and the same-domain MCP discovery endpoint. Member scan write actions remain authenticated and depend on the user's Better Auth session state.",
		],
		sections: [
			{
				title: "Surfaces monitored",
				bullets: [
					"Homepage and agent mode view",
					"Developer docs and markdown negotiation surfaces",
					"Recent draw and stats overview APIs",
					"Auth providers endpoint and Better Auth availability",
					"MCP discovery endpoint and MCP server card",
				],
			},
			{
				title: "Machine-readable status",
				links: [
					{
						label: "API Status JSON",
						href: DISCOVERY_PATHS.apiStatus,
						description: "Machine-readable status document for automated agents",
					},
				],
			},
		],
	};
}

export function getMethodologyPageContent(): AgentPage {
	return {
		key: "methodology",
		eyebrow: "Methodology",
		title: "How 645.live combines official Lotto 6/45 results with scan-derived insight",
		description:
			"645.live treats official Korean Lotto 6/45 draw results as the source of truth for winning data, while scan-derived data is used as an auxiliary signal for understanding user interest and short-term attention patterns.",
		intro: [
			"Official results remain the primary reference for winning numbers, bonus numbers, first-prize counts, and payout windows. These values are fetched from official public sources and normalized into the site's snapshot layer so they can be reused consistently across pages, APIs, and agent-facing tools.",
			"Scan-derived data is different. It represents what people scanned, checked, or revisited through 645.live's existing application workflow. That makes it useful for observing attention, interest, and member activity patterns, but it should never be mistaken for predictive or authoritative winning data.",
		],
		sections: [
			{
				title: "Data hierarchy",
				bullets: [
					"Official public Lotto 6/45 results are the source of truth for winning outcomes and claim windows.",
					"TrailBase-backed site data provides scan counts, member scan history, and derived analysis summaries.",
					"Editorial and agent-facing summaries should explain the difference between those two layers clearly.",
				],
			},
			{
				title: "How to interpret frequency analysis",
				paragraphs: [
					"Frequency analysis helps users compare how often numbers, sections, colors, or pairings have appeared across historical draws. It is useful for explanation and exploration, not for guaranteed prediction. 645.live therefore frames these statistics as historical and behavioral signals rather than deterministic advice.",
				],
			},
			{
				title: "Related pages",
				links: [
					{ label: "Stats Hub", href: "/stats" },
					{ label: "Guide", href: "/guide" },
					{ label: "Data Sources", href: "/data-sources" },
					{ label: "Editorial Policy", href: "/editorial-policy" },
				],
			},
		],
	};
}

export function getContactPageContent(): AgentPage {
	return {
		key: "contact",
		eyebrow: "Contact",
		title: "How to contact 645.live",
		description:
			"645.live currently handles support, issue reports, and integration questions through public web channels so agents and users can find a clear contact path.",
		intro: [
			"If you need help with public API discovery, MCP integration, data corrections, or product questions, start with the public contact channels listed below. Phase 1 keeps support contact lightweight and public rather than introducing a separate ticket portal.",
		],
		sections: [
			{
				title: "Support channels",
				links: [
					{
						label: "X",
						href: `https://x.com/${SITE_TWITTER.replace(/^@/, "")}`,
						description: "Public product updates and lightweight support contact.",
					},
					{
						label: "GitHub",
						href: SITE_GITHUB,
						description: "Repository, issue reporting, and implementation context.",
					},
				],
			},
			{
				title: "What to include",
				bullets: [
					"Which URL or endpoint you were using when the issue happened.",
					"Whether the issue affected the public API, docs, MCP, or signed-in member scan flow.",
					"The Lotto 6/45 round number or stats page involved, if relevant.",
				],
			},
		],
	};
}

export function getAllAgentPages(): AgentPage[] {
	return [
		getHomePageContent(),
		getAgentHomePageContent(),
		getDocsPageContent(),
		getComparePageContent(),
		getStatusPageContent(),
		getMethodologyPageContent(),
		getContactPageContent(),
	];
}

export function getAgentPageForRequest(url: URL): AgentPage | null {
	if (url.pathname === "/" && url.searchParams.get("mode") === "agent") {
		return getAgentHomePageContent();
	}

	if (url.pathname === "/") {
		return getHomePageContent();
	}

	if (url.pathname === DISCOVERY_PATHS.docs || url.pathname === DISCOVERY_PATHS.developers) {
		return getDocsPageContent();
	}

	if (url.pathname === DISCOVERY_PATHS.compare) {
		return getComparePageContent();
	}

	if (url.pathname === DISCOVERY_PATHS.status) {
		return getStatusPageContent();
	}

	if (url.pathname === DISCOVERY_PATHS.methodology) {
		return getMethodologyPageContent();
	}

	if (url.pathname === DISCOVERY_PATHS.contact) {
		return getContactPageContent();
	}

	return null;
}

export function serializeAgentPageMarkdown(page: AgentPage): string {
	const lines: string[] = [`# ${page.title}`, "", page.description, ""];

	for (const paragraph of page.intro) {
		lines.push(paragraph, "");
	}

	for (const section of page.sections) {
		lines.push(`## ${section.title}`, "");

		for (const paragraph of section.paragraphs ?? []) {
			lines.push(paragraph, "");
		}

		for (const bullet of section.bullets ?? []) {
			lines.push(`- ${bullet}`);
		}

		if ((section.bullets?.length ?? 0) > 0) {
			lines.push("");
		}

		if (section.table) {
			lines.push(
				`| ${section.table.headers.join(" | ")} |`,
				`| ${section.table.headers.map(() => "---").join(" | ")} |`,
			);

			for (const row of section.table.rows) {
				lines.push(`| ${row.join(" | ")} |`);
			}

			lines.push("");
		}

		for (const link of section.links ?? []) {
			const href = isAbsoluteHref(link.href) ? link.href : absoluteUrl(link.href);
			const suffix = link.description ? ` - ${link.description}` : "";
			lines.push(`- [${link.label}](${href})${suffix}`);
		}

		if ((section.links?.length ?? 0) > 0) {
			lines.push("");
		}
	}

	return lines.join("\n").trim();
}

export function estimateMarkdownTokens(markdown: string): number {
	return Math.max(1, Math.ceil(markdown.length / 4));
}

export function getLlmsText(): string {
	return [
		`# ${SITE_NAME}`,
		"",
		"645.live is a Korean Lotto 6/45 real-time scan, QR checking, and statistics platform.",
		"",
		"## Product overview",
		"- Official Lotto 6/45 draw snapshots with round date, winning numbers, bonus number, first-prize counts, and claim deadline dates.",
		"- TrailBase-backed statistics covering numbers, pairs, odd/even, high/low, colors, bonus numbers, sections, and AC values.",
		"- Signed-in member scan history and pending sync workflows built on Better Auth session cookies.",
		"",
		"## Use cases",
		"- Look up recent Korean Lotto 6/45 draw results.",
		"- Summarize historical frequency analysis and pattern shifts.",
		"- Explain how official winning data differs from scan-derived interest signals.",
		"- Guide a signed-in user through member scan summary or sync flows.",
		"",
		"## Public resources",
		`- [Docs](${absoluteUrl(DISCOVERY_PATHS.docs)})`,
		`- [OpenAPI](${absoluteUrl(DISCOVERY_PATHS.openApi)})`,
		`- [API catalog](${absoluteUrl(DISCOVERY_PATHS.apiCatalog)})`,
		`- [Status](${absoluteUrl(DISCOVERY_PATHS.apiStatus)})`,
		`- [MCP endpoint](${absoluteUrl(DISCOVERY_PATHS.mcp)})`,
		`- [MCP server card](${absoluteUrl(DISCOVERY_PATHS.mcpServerCard)})`,
		`- [Agent view](${absoluteUrl("/?mode=agent")})`,
		`- [Pricing](${absoluteUrl(DISCOVERY_PATHS.pricing)})`,
		`- [Contact](${absoluteUrl(DISCOVERY_PATHS.contact)})`,
		"",
		"## Authentication",
		"- Public read APIs do not require auth.",
		"- Member scan actions require the existing Better Auth session cookie.",
		"- OAuth discovery metadata is planned for a later phase and is not published yet.",
		"",
		"## Notes",
		"- Official result data is authoritative for winning outcomes.",
		"- Scan-derived data is auxiliary and reflects site activity or interest, not guaranteed prediction.",
	].join("\n");
}

export function getLlmsFullText(): string {
	const pages = [
		getAgentHomePageContent(),
		getDocsPageContent(),
		getComparePageContent(),
		getMethodologyPageContent(),
		getContactPageContent(),
	];

	return [
		getLlmsText(),
		"",
		"## Full documentation",
		"",
		...pages.map((page) => serializeAgentPageMarkdown(page)),
	].join("\n\n");
}

export function getPricingMarkdown(): string {
	return [
		"# 645.live pricing",
		"",
		"645.live currently operates as a free product for public read access and standard user workflows.",
		"",
		"| Plan | Price | Includes | Limits |",
		"| --- | --- | --- | --- |",
		"| Free | KRW 0 | Public recent draw API, stats overview, docs, llms files, and the standard site experience | Subject to normal application availability and future product policy changes |",
		"",
		"## Notes",
		"- Public read APIs are anonymous.",
		"- Member scan actions require the user's existing Better Auth session.",
		"- Dedicated paid tiers or service-account plans are not published in Phase 1.",
	].join("\n");
}

export function getAiPluginManifest() {
	return {
		schema_version: "v1",
		name_for_human: SITE_NAME,
		name_for_model: "live645",
		description_for_human:
			"Korean Lotto 6/45 draw snapshots, QR checking guidance, and statistics analysis.",
		description_for_model:
			"Use this for Korean Lotto 6/45 draw lookups, recent statistics summaries, auth provider discovery, and signed-in member scan workflows backed by Better Auth session cookies.",
		auth: {
			type: "none",
			note: "Public read APIs are anonymous. Signed-in member scan actions use the existing Better Auth session cookie flow.",
		},
		api: {
			type: "openapi",
			url: absoluteUrl(DISCOVERY_PATHS.openApi),
			is_user_authenticated: false,
		},
		logo_url: absoluteUrl("/assets/icons/icon-512.png"),
		legal_info_url: absoluteUrl("/terms-of-service"),
		contact: {
			github: SITE_GITHUB,
			x: `https://x.com/${SITE_TWITTER.replace(/^@/, "")}`,
		},
	};
}

export function getAgentManifest() {
	return {
		name: SITE_NAME,
		description:
			"Korean Lotto 6/45 draw snapshots, statistics analysis, QR checking guidance, and signed-in member scan workflows.",
		homepage_url: SITE_ORIGIN,
		documentation_url: absoluteUrl(DISCOVERY_PATHS.docs),
		api_catalog_url: absoluteUrl(DISCOVERY_PATHS.apiCatalog),
		openapi_url: absoluteUrl(DISCOVERY_PATHS.openApi),
		mcp_url: absoluteUrl(DISCOVERY_PATHS.mcp),
		capabilities: [...AGENT_CAPABILITIES],
		authentication: {
			public_read: "anonymous",
			member_actions: "better-auth session cookie",
			oauth_phase: "planned",
		},
	};
}

export function getAgentCard() {
	return {
		name: SITE_NAME,
		version: "1.0.0",
		description:
			"Agent-facing card for the 645.live Korean Lotto 6/45 discovery, API, and MCP surfaces.",
		url: SITE_ORIGIN,
		contact: {
			github: SITE_GITHUB,
			x: `https://x.com/${SITE_TWITTER.replace(/^@/, "")}`,
		},
		capabilities: [
			{
				id: "recent-draws",
				label: "Recent draw snapshots",
				endpoint: absoluteUrl(DISCOVERY_PATHS.recentDraws),
			},
			{
				id: "stats-overview",
				label: "Statistics overview",
				endpoint: absoluteUrl(DISCOVERY_PATHS.statsOverview),
			},
			{
				id: "mcp",
				label: "Remote MCP",
				endpoint: absoluteUrl(DISCOVERY_PATHS.mcp),
			},
		],
	};
}

export function getMcpServerCard() {
	return {
		name: `${SITE_NAME} MCP`,
		version: "1.0.0",
		description:
			"Same-domain MCP server for Korean Lotto 6/45 draw snapshots, statistics summaries, auth visibility, and member scan workflows.",
		serverUrl: absoluteUrl(DISCOVERY_PATHS.mcp),
		tools: [
			{
				name: "get_recent_draws",
				description: "Get recent Korean Lotto 6/45 draw snapshots with claim deadline data.",
			},
			{
				name: "get_draw",
				description: "Get a single Korean Lotto 6/45 draw snapshot by round number.",
			},
			{
				name: "get_stats_overview",
				description: "Get the public TrailBase-backed 645.live statistics overview.",
			},
			{
				name: "get_auth_options",
				description: "Get the current Better Auth-backed sign-in options that 645.live exposes publicly.",
			},
			{
				name: "get_status",
				description: "Get the machine-readable status document for the public 645.live agent surface.",
			},
			{
				name: "get_my_scan_summary",
				description: "Get the signed-in user's member scan summary using the existing Better Auth session cookie.",
			},
			{
				name: "list_my_scans",
				description: "List recent signed-in member scans using the existing Better Auth session cookie.",
			},
			{
				name: "upsert_pending_scans",
				description: "Persist pending member scans for the signed-in user through the existing Better Auth and TrailBase workflow.",
			},
		],
		serverInfo: {
			name: `${SITE_NAME} MCP`,
			version: "1.0.0",
			description:
				"Same-domain MCP server for Korean Lotto 6/45 draw snapshots, statistics summaries, auth visibility, and member scan workflows.",
			websiteUrl: SITE_ORIGIN,
		},
		transports: [
			{
				type: "streamable-http",
				url: absoluteUrl(DISCOVERY_PATHS.mcp),
			},
		],
		capabilities: {
			tools: [
				"get_recent_draws",
				"get_draw",
				"get_stats_overview",
				"get_auth_options",
				"get_status",
				"get_my_scan_summary",
				"list_my_scans",
				"upsert_pending_scans",
			],
			resources: [
				"ui://645live/stats-overview.html",
				"ui://645live/draw-details.html",
				"ui://645live/member-scans.html",
			],
		},
	};
}

export function getAgentSkillMarkdown(slug: AgentSkillDefinition["slug"]): string {
	const skill = AGENT_SKILLS.find((item) => item.slug === slug);
	if (!skill) {
		throw new Error(`Unknown agent skill: ${slug}`);
	}

		return [
			`# ${skill.name}`,
		"",
		skill.description,
		"",
		"## When to use",
		`- Use this skill when an agent needs ${skill.description.toLowerCase()}.`,
		"",
		"## Product context",
		"- 645.live is a Korean Lotto 6/45 real-time scan, QR checking, and statistics platform.",
		"- Public read APIs are anonymous.",
		"- Member scan actions require the existing Better Auth session cookie.",
		"",
		"## Useful links",
		`- Docs: ${absoluteUrl(DISCOVERY_PATHS.docs)}`,
		`- OpenAPI: ${absoluteUrl(DISCOVERY_PATHS.openApi)}`,
		`- API catalog: ${absoluteUrl(DISCOVERY_PATHS.apiCatalog)}`,
		`- MCP: ${absoluteUrl(DISCOVERY_PATHS.mcp)}`,
	].join("\n");
}

export function getSectionLlmsText(page: AgentPage): string {
	return [
		`# ${page.title}`,
		"",
		page.description,
		"",
		`- [Canonical page](${absoluteUrl(getPathForPage(page.key))})`,
		`- [Docs](${absoluteUrl(DISCOVERY_PATHS.docs)})`,
		`- [OpenAPI](${absoluteUrl(DISCOVERY_PATHS.openApi)})`,
		`- [MCP](${absoluteUrl(DISCOVERY_PATHS.mcp)})`,
		"",
		serializeAgentPageMarkdown(page),
	].join("\n");
}

export function getDiscoveryLinkHeaderTargets(pathname: string) {
	if (
		pathname !== DISCOVERY_PATHS.home &&
		pathname !== DISCOVERY_PATHS.docs &&
		pathname !== DISCOVERY_PATHS.developers &&
		pathname !== DISCOVERY_PATHS.compare &&
		pathname !== DISCOVERY_PATHS.status
	) {
		return [];
	}

	return [
		{ href: DISCOVERY_PATHS.apiCatalog, rel: "api-catalog" },
		{ href: DISCOVERY_PATHS.openApi, rel: "service-desc" },
		{ href: DISCOVERY_PATHS.docs, rel: "service-doc" },
		{ href: DISCOVERY_PATHS.apiStatus, rel: "status" },
	];
}

function isAbsoluteHref(value: string): boolean {
	return value.startsWith("http://") || value.startsWith("https://");
}

function getPathForPage(pageKey: AgentPage["key"]): string {
	switch (pageKey) {
		case "home":
			return DISCOVERY_PATHS.home;
		case "agent-home":
			return "/?mode=agent";
		case "docs":
			return DISCOVERY_PATHS.docs;
		case "compare":
			return DISCOVERY_PATHS.compare;
		case "status":
			return DISCOVERY_PATHS.status;
		case "methodology":
			return DISCOVERY_PATHS.methodology;
		case "contact":
			return DISCOVERY_PATHS.contact;
	}
}
