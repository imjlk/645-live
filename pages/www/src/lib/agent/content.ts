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
	"공개 조회 API는 별도 인증 없이 사용할 수 있습니다.",
	"회원 스캔 관련 작업은 645.live의 기존 Better Auth 세션 쿠키를 사용합니다.",
	"현재 이메일/비밀번호 로그인을 지원하며, 소셜 로그인 제공자는 Better Auth 설정에 따라 런타임에 노출됩니다.",
	"OAuth/OIDC 디스커버리 메타데이터는 추후 Better Auth 확장 단계에서 도입될 예정입니다.",
] as const;

export const COMPARE_MATRIX: AgentTable = {
	headers: [
		"항목",
		"공식 확인 서비스",
		"번호 생성기",
		"통계 아카이브",
		"645.live",
	],
	rows: [
		[
			"공식 당첨 결과 확인",
			"강함",
			"제한적",
			"대체로 지연",
			"공식 추첨 스냅샷과 수령 기한까지 함께 제공",
		],
		[
			"실시간 스캔 흐름 가시성",
			"없음",
			"없음",
			"대체로 없음",
			"실시간 스캔 및 회원 스캔 화면에서 확인 가능",
		],
		[
			"패턴 분석 깊이",
			"기본",
			"낮음",
			"중간",
			"번호·쌍·색상·홀짝·고저·AC·보너스까지 폭넓게 제공",
		],
		[
			"에이전트 친화적 디스커버리",
			"드묾",
			"드묾",
			"드묾",
			"llms, api-catalog, OpenAPI, MCP, WebMCP, 마크다운 협상 제공",
		],
		[
			"로그인 사용자 흐름 지원",
			"대체로 브라우저 전용",
			"없음",
			"없음",
			"기존 Better Auth + TrailBase 기반 회원 스캔 요약·동기화 지원",
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
			label: "개발자 문서",
			href: DISCOVERY_PATHS.docs,
			description: "공개 API, 인증, MCP, WebMCP, 빠른 시작 안내를 제공합니다.",
		},
		{
			label: "OpenAPI",
			href: DISCOVERY_PATHS.openApi,
			description: "기계가 읽을 수 있는 공개 REST 인터페이스 문서입니다.",
		},
		{
			label: "MCP 엔드포인트",
			href: DISCOVERY_PATHS.mcp,
			description: "같은 도메인에서 제공하는 WebMCP/원격 MCP 탐색 엔드포인트입니다.",
		},
		{
			label: "운영 기준",
			href: DISCOVERY_PATHS.methodology,
			description: "공식 결과와 스캔 파생 신호를 어떻게 함께 보여주는지 설명합니다.",
		},
	];
}

export function getHomePageContent(): AgentPage {
	return {
		key: "home",
		eyebrow: "로또 6/45 통계 인사이트",
		title: "645.live는 로또 6/45 실시간 스캔, QR 확인, 통계를 한곳에서 보는 플랫폼입니다.",
		description:
			"645.live는 공식 결과 스냅샷, TrailBase 기반 통계, QR 당첨 확인, 회원 스캔 흐름을 통해 로또 6/45 데이터를 더 쉽게 이해할 수 있도록 돕습니다.",
		intro: [
			"645.live는 공식 로또 6/45 추첨 데이터와 사이트 안에서 쌓이는 스캔·분석 신호를 함께 보여줘서, 사용자가 단순 결과 확인을 넘어 흐름과 패턴까지 빠르게 읽을 수 있게 구성되어 있습니다. 최신 회차 스냅샷, 번호 출현 변화, 보너스 번호 흐름, 색상·구간 균형, 스캔 기반 관심 신호까지 한 화면에서 이어집니다.",
			"일반 사용자에게는 실시간 스캔과 통계 허브를, 연동이 필요한 사용자에게는 공개 조회 API와 문서를 함께 제공합니다. 같은 제품 설명이 홈페이지, 문서, OpenAPI, API 카탈로그, MCP 엔드포인트 전반에서 일관되게 이어지도록 정리했습니다.",
		],
		sections: [
			{
				title: "645.live에서 할 수 있는 일",
				bullets: [
					"최신 로또 6/45 회차의 공식 당첨번호, 보너스 번호, 1등 당첨자 수, 수령 기한 정보를 한눈에 보여줍니다.",
					"번호 출현 빈도, 패턴 비교, 홀짝·고저·색상·구간·쌍·보너스·AC 통계를 함께 제공합니다.",
					"QR 기반 티켓 확인과 로그인 회원의 스캔 이력 확인·동기화 흐름을 지원합니다.",
					"공개 조회 API, OpenAPI, API 카탈로그, MCP, WebMCP 같은 기계 판독용 탐색 표면도 함께 제공합니다.",
				],
			},
			{
				title: "연동 관점에서 볼 수 있는 기능",
				table: {
					headers: ["기능", "경로", "의미"],
					rows: [
						[
							"최근 회차 조회",
							"/api/lotto-draws-recent.json and /api/lotto-draws/[round].json",
							"HTML을 직접 파싱하지 않아도 최신 로또 6/45 회차 데이터를 구조화된 형태로 가져올 수 있습니다.",
						],
						[
							"통계 개요",
							"/stats, /api/stats/overview.json, MCP tools",
							"출현 빈도와 최근 패턴 변화를 안정적인 형식으로 요약할 수 있습니다.",
						],
						[
							"인증 정보 확인",
							"/api/auth/providers.json and /docs",
							"회원 기능을 시도하기 전에 현재 어떤 로그인 흐름을 제공하는지 확인할 수 있습니다.",
						],
						[
							"로그인 회원 스캔 흐름",
							"/rpc and MCP member scan tools",
							"기존 Better Auth 세션 쿠키 흐름을 이용해 회원 스캔 요약, 목록, 동기화 작업을 수행할 수 있습니다.",
						],
					],
				},
			},
			{
				title: "바로 가기",
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
		eyebrow: "개발자 문서",
		title: "645.live 연동 가이드",
		description:
			"645.live는 공개 로또 6/45 조회 API, 마크다운 대응 문서, 같은 도메인 MCP 탐색, 기존 Better Auth와 TrailBase 기반 회원 스캔 흐름을 제공합니다.",
		intro: [
			"최근 회차 스냅샷, 통계 개요, 로그인 제공자 정보, 서비스 상태를 안정적인 기계 판독 형식으로 가져오려면 공개 REST API를 사용하면 됩니다. MCP를 이미 지원하는 에이전트 플랫폼이라면 같은 핵심 기능을 도구 형태로 노출하는 MCP 엔드포인트를 사용할 수 있습니다.",
			"현재 인증 모델은 단순하게 유지되어 있습니다. 공개 조회 API는 익명으로 사용할 수 있고, 회원 스캔 작업은 사용자의 기존 Better Auth 세션 쿠키가 필요합니다. OAuth 디스커버리 엔드포인트는 추후 단계에서 도입될 예정이며 아직 공개되지 않았습니다.",
		],
		sections: [
			{
				title: "빠른 시작",
				bullets: [
					`${absoluteUrl(DISCOVERY_PATHS.recentDraws)}에서 최근 회차 데이터를 조회합니다.`,
					`${absoluteUrl(DISCOVERY_PATHS.statsOverview)}에서 상위 통계 요약을 가져옵니다.`,
					`사용자를 로그인으로 보내기 전에 ${absoluteUrl(DISCOVERY_PATHS.authProviders)}에서 현재 로그인 제공자를 확인합니다.`,
					`${absoluteUrl(DISCOVERY_PATHS.openApi)}를 사용해 SDK나 함수 호출 스키마를 생성합니다.`,
				],
			},
			{
				title: "공개 REST API",
				table: {
					headers: ["메서드", "경로", "설명"],
					rows: [
						["GET", DISCOVERY_PATHS.recentDraws, "최근 로또 6/45 회차 스냅샷"],
						["GET", "/api/lotto-draws/{round}.json", "단일 회차 구조화 스냅샷"],
						["GET", DISCOVERY_PATHS.statsOverview, "기존 TrailBase 기반 서비스에서 만든 통계 허브 요약"],
						["GET", DISCOVERY_PATHS.authProviders, "현재 활성화된 Better Auth 로그인 제공자 목록"],
						["GET", DISCOVERY_PATHS.apiStatus, "기계 판독용 서비스 상태 문서"],
						["GET", DISCOVERY_PATHS.openApi, "공개 REST 인터페이스용 OpenAPI 설명서"],
					],
				},
			},
			{
				title: "MCP와 WebMCP",
				paragraphs: [
					`원격 MCP 탐색은 ${absoluteUrl(DISCOVERY_PATHS.mcp)}에서 제공되며 ${absoluteUrl(DISCOVERY_PATHS.mcpAlias)} 별칭도 함께 지원합니다. MCP Apps 메타데이터는 ui:// 리소스를 사용해, 지원하는 호스트에서 통계·회차 상세·회원 스캔 데이터를 가벼운 UI 표면으로 렌더링할 수 있습니다.`,
					"navigator.modelContext를 사용할 수 있는 브라우저에서는 WebMCP도 함께 등록됩니다. 브라우저 쪽 도구는 원격 MCP 서버와 같은 기능 모델을 따르며, 사용자의 실제 세션 상태와 연결됩니다.",
				],
			},
			{
				title: "인증 동작",
				bullets: [...AUTH_SUMMARY_LINES],
			},
			{
				title: "오류와 지원",
				bullets: [
					"공개 API 오류는 HTML 대체 페이지 대신 error, code, message, hint 필드를 가진 JSON으로 반환됩니다.",
					"자동화 도구가 재시도 전에 상태를 확인해야 한다면 /api/status.json을 사용합니다.",
					"공개 지원 채널과 구현 이슈 제보는 /contact를 사용합니다.",
				],
			},
			{
				title: "관련 자료",
				links: [
					{ label: "에이전트 보기", href: "/?mode=agent", description: "AI 중심 요약 화면" },
					{ label: "API 카탈로그", href: DISCOVERY_PATHS.apiCatalog, description: "RFC 9727 디스커버리 문서" },
					{ label: "운영 기준", href: DISCOVERY_PATHS.methodology, description: "공식 결과와 스캔 파생 데이터를 함께 해석하는 방식" },
					{ label: "요금 정보", href: DISCOVERY_PATHS.pricing, description: "기계 판독용 플랜 정보" },
					{ label: "문의", href: DISCOVERY_PATHS.contact, description: "공개 지원 채널과 이슈 제보 경로" },
				],
			},
		],
	};
}

export function getComparePageContent(): AgentPage {
	return {
		key: "compare",
		eyebrow: "차별점",
		title: "왜 645.live로 로또 6/45를 분석하나",
		description:
			"645.live는 단순 당첨 확인을 넘어 공식 결과 스냅샷, TrailBase 기반 스캔 흐름, 깊이 있는 통계, 기계 판독용 디스커버리 표면을 한 제품 안에 함께 담고 있습니다.",
		intro: [
			"로또 서비스는 보통 한 가지 역할에만 집중되는 경우가 많습니다. 어떤 곳은 당첨번호 확인만 제공하고, 어떤 곳은 번호 생성만 지원하며, 어떤 곳은 통계를 쌓아두기만 하고 회원 흐름이나 현대적인 연동 표면은 제공하지 않습니다. 645.live는 공식 로또 6/45 기준 데이터, 스캔 기반 관심 신호, 연동 친화적 표면을 함께 묶어 그 사이를 연결하려고 합니다.",
		],
		sections: [
			{
				title: "기능 비교표",
				table: COMPARE_MATRIX,
			},
			{
				title: "645.live의 차별점",
				bullets: [
					"TrailBase 기반 스캔·회원 흐름이 브라우저 전용 화면 뒤에 숨지 않고, 공개 조회 API와 함께 공존합니다.",
					"최근 회차 스냅샷에는 수령 기한까지 포함돼 있어, 스크래핑 없이도 필요한 데이터를 바로 가져올 수 있습니다.",
					"홈페이지 메타데이터, 문서, llms 파일, OpenAPI, MCP, WebMCP 전반에서 같은 제품 설명을 유지합니다.",
					"통계 페이지는 단순 아카이브가 아니라, 여러 분석 축을 통해 출현 빈도와 패턴 변화를 해설합니다.",
				],
			},
			{
				title: "더 읽어보기",
				links: [
					{ label: "개발자 문서", href: DISCOVERY_PATHS.docs },
					{ label: "운영 기준", href: DISCOVERY_PATHS.methodology },
					{ label: "가이드", href: "/guide" },
				],
			},
		],
	};
}

export function getStatusPageContent(): AgentPage {
	return {
		key: "status",
		eyebrow: "상태",
		title: "645.live 공개 표면 상태",
		description:
			"이 페이지는 645.live의 공개 조회 표면이 현재 어떤 상태인지와, 개발자 연동 관점에서 어떤 용도로 쓰이는지 설명합니다.",
		intro: [
			"공개 조회 표면에는 최근 회차 스냅샷 API, 통계 개요 API, 마크다운 협상 문서, RFC 9727 API 카탈로그, 같은 도메인 MCP 탐색 엔드포인트가 포함됩니다. 회원 스캔 쓰기 작업은 계속 인증이 필요하며 사용자의 Better Auth 세션 상태에 따라 동작합니다.",
		],
		sections: [
			{
				title: "모니터링 대상 표면",
				bullets: [
					"홈페이지와 에이전트 모드 화면",
					"개발자 문서와 마크다운 협상 표면",
					"최근 회차 및 통계 개요 API",
					"로그인 제공자 엔드포인트와 Better Auth 가용성",
					"MCP 탐색 엔드포인트와 MCP 서버 카드",
				],
			},
			{
				title: "기계 판독용 상태 문서",
				links: [
					{
						label: "API 상태 JSON",
						href: DISCOVERY_PATHS.apiStatus,
						description: "자동화 도구가 읽을 수 있는 상태 문서입니다.",
					},
				],
			},
		],
	};
}

export function getMethodologyPageContent(): AgentPage {
	return {
		key: "methodology",
		eyebrow: "운영 기준",
		title: "645.live는 공식 로또 6/45 결과와 스캔 파생 신호를 어떻게 함께 보여주나",
		description:
			"645.live는 공식 로또 6/45 추첨 결과를 당첨 정보의 기준으로 삼고, 스캔 파생 데이터는 사용자 관심과 단기 주목 흐름을 이해하기 위한 보조 신호로 사용합니다.",
		intro: [
			"당첨번호, 보너스 번호, 1등 당첨자 수, 수령 기한 같은 값은 공식 결과를 최우선 기준으로 사용합니다. 이 값들은 공식 공개 소스에서 가져와 사이트의 스냅샷 계층으로 정규화한 뒤, 페이지·API·에이전트 도구 전반에서 일관되게 재사용합니다.",
			"스캔 파생 데이터는 성격이 다릅니다. 이는 사용자가 645.live에서 무엇을 스캔하고 확인하고 다시 열어봤는지를 보여주는 흐름입니다. 따라서 관심도와 회원 활동 패턴을 읽는 데는 유용하지만, 예측용 당첨 데이터나 공식 결과처럼 해석해서는 안 됩니다.",
		],
		sections: [
			{
				title: "데이터 우선순위",
				bullets: [
					"공식 공개 로또 6/45 결과는 당첨 여부와 수령 기한의 기준 데이터입니다.",
					"TrailBase 기반 사이트 데이터는 스캔 횟수, 회원 스캔 이력, 파생 분석 요약을 제공합니다.",
					"에디토리얼 요약과 연동용 설명에서는 이 두 계층의 차이를 명확히 구분해야 합니다.",
				],
			},
			{
				title: "출현 빈도 분석을 해석하는 방법",
				paragraphs: [
					"출현 빈도 분석은 번호, 구간, 색상, 번호쌍이 과거 회차에서 얼마나 자주 나왔는지 비교하는 데 도움을 줍니다. 설명과 탐색에는 유용하지만, 확정적인 예측 도구는 아닙니다. 645.live는 그래서 이 통계를 정답형 조언이 아니라 과거 기반·행동 기반 신호로 설명합니다.",
				],
			},
			{
				title: "관련 페이지",
				links: [
					{ label: "통계 허브", href: "/stats" },
					{ label: "가이드", href: "/guide" },
					{ label: "데이터 출처", href: "/data-sources" },
					{ label: "편집 정책", href: "/editorial-policy" },
				],
			},
		],
	};
}

export function getContactPageContent(): AgentPage {
	return {
		key: "contact",
		eyebrow: "문의",
		title: "645.live 문의 방법",
		description:
			"645.live는 지원, 이슈 제보, 연동 문의를 공개 웹 채널로 받고 있으며, 사용자와 에이전트가 모두 같은 문의 경로를 찾을 수 있도록 운영합니다.",
		intro: [
			"공개 API 탐색, MCP 연동, 데이터 수정 요청, 제품 문의가 필요하다면 아래 공개 채널부터 이용하면 됩니다. 현재 단계에서는 별도 티켓 포털 대신 가볍고 공개적인 문의 흐름을 유지하고 있습니다.",
		],
		sections: [
			{
				title: "지원 채널",
				links: [
					{
						label: "X",
						href: `https://x.com/${SITE_TWITTER.replace(/^@/, "")}`,
						description: "제품 공지와 간단한 문의 응답을 위한 공개 채널입니다.",
					},
					{
						label: "GitHub",
						href: SITE_GITHUB,
						description: "저장소 확인, 이슈 제보, 구현 맥락 공유에 적합합니다.",
					},
				],
			},
			{
				title: "함께 보내면 좋은 정보",
				bullets: [
					"문제가 발생한 페이지 URL 또는 엔드포인트 경로",
					"공개 API, 문서, MCP, 로그인 회원 스캔 중 어느 흐름에서 발생했는지",
					"관련된 로또 6/45 회차 번호나 통계 페이지가 있다면 함께 첨부",
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
