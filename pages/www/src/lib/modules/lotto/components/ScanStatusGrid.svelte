<script lang="ts">
import { onMount, untrack } from "svelte";
import { resolve } from "$app/paths";
import ScreenReaderStatus from "$lib/components/ui/ScreenReaderStatus.svelte";
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";
import ValueIncrementEffect from "$lib/modules/lotto/components/ValueIncrementEffect.svelte";
import type { BallNumber } from "$lib/modules/lotto/types";
import {
	useBallValues,
	useConnectionStatus,
} from "$lib/trailbase/composables.svelte";
import { handleGridNavigation } from "$lib/utils/keyboard-navigation";

interface Props {
	initialRound: number;
	headlineRound?: number;
	latestRound?: number | null;
	latestRoundHasScanData?: boolean;
	latestPopulatedRound?: number | null;
	fallbackPreviewRound?: number | null;
	allowFallbackPreview?: boolean;
	enableNavigation?: boolean;
	showHeader?: boolean;
	forceClientRefresh?: boolean;
	gridColumns?: {
		mobile?: number;
		tablet?: number;
		desktop?: number;
		large?: number;
	};
	gridGap?: string;
	incrementEffectConfig?: {
		show: boolean;
		/** Optional message template, for example "+{delta}". */
		message?: string;
		color?: string;
	};
}

let {
	initialRound,
	headlineRound,
	latestRound,
	latestRoundHasScanData = true,
	latestPopulatedRound = null,
	fallbackPreviewRound = null,
	allowFallbackPreview = true,
	enableNavigation = true,
	showHeader = true,
	forceClientRefresh = false,
	gridColumns = { mobile: 5, tablet: 9, desktop: 9, large: 9 },
	gridGap = "",
	incrementEffectConfig = { show: true },
}: Props = $props();

const values = useBallValues();
const connection = useConnectionStatus();
let activeRound = $state<number | null>(null);
let showingFallbackPreview = $state(false);
let mounted = false;
let loadSequence = 0;
let previousForceRefresh = false;
let wasConnected = false;
let hasConnected = false;

const numbers = $derived<BallNumber[]>(
	Array.from({ length: 45 }, (_, index) => ({
		id: index + 1,
		value: values.ballValues[index + 1] ?? 0,
	})),
);
const headerRound = $derived(
	headlineRound ?? activeRound ?? initialRound ?? latestRound,
);
const previewRound = $derived(fallbackPreviewRound ?? latestPopulatedRound);
const isFallbackPreviewVisible = $derived(
	allowFallbackPreview &&
		showingFallbackPreview &&
		previewRound !== null &&
		values.currentRound === previewRound,
);
const displayedRound = $derived(
	isFallbackPreviewVisible ? values.currentRound : headerRound,
);
const hasSnapshot = $derived(
	values.lastSuccessfulLoad !== null &&
		values.currentRound === displayedRound &&
		!values.error,
);
const connectionLabel = $derived(
	values.loading
		? "집계 불러오는 중"
		: values.error
			? "집계 확인 필요"
			: connection.connected
				? "실시간 반영 중"
				: connection.connecting
					? "실시간 연결 중"
					: "실시간 연결 대기",
);
const updateMessage = $derived.by(() => {
	const updated = Object.entries(values.increments).filter(
		([number, delta]) => delta > 0 && values.recentlyUpdated[Number(number)],
	);
	if (updated.length === 0) return "";
	const changes = updated
		.slice(0, 6)
		.map(([number, delta]) => `${number}번 ${delta}회 증가`)
		.join(", ");
	const remaining =
		updated.length > 6 ? ` 외 ${updated.length - 6}개 번호` : "";
	return `${changes}${remaining}. QR 스캔 총 ${values.totalScans.toLocaleString()}회.`;
});

async function initializeData(round: number, forceRefresh: boolean) {
	const sequence = ++loadSequence;
	activeRound = round;
	previousForceRefresh = forceClientRefresh;
	showingFallbackPreview = false;
	values.setTargetRound(round);
	await values.loadInitialData(round, forceRefresh);
	if (!mounted || sequence !== loadSequence) return;

	if (
		allowFallbackPreview &&
		!latestRoundHasScanData &&
		previewRound &&
		previewRound !== round &&
		!values.error &&
		values.currentRound === round &&
		values.totalScans === 0
	) {
		showingFallbackPreview = true;
		await values.loadInitialData(previewRound, true);
	}
}

export function updateRound(newRound: number) {
	if (mounted && Number.isInteger(newRound) && newRound > 0) {
		void initializeData(newRound, true);
	}
}

function refreshData() {
	if (mounted) void initializeData(activeRound ?? initialRound, true);
}

function handleBallKeydown(event: KeyboardEvent, number: number) {
	if (
		event.defaultPrevented ||
		event.altKey ||
		event.ctrlKey ||
		event.metaKey ||
		event.shiftKey ||
		!enableNavigation
	)
		return;

	const link = event.currentTarget as HTMLAnchorElement;
	const grid = link.closest<HTMLElement>(".scan-number-grid");
	if (!grid) return;
	// Keep Enter and modified clicks native; arrow keys follow the rendered columns.
	if (event.key === "Enter") return;
	const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
	const nextIndex = handleGridNavigation(event, number - 1, {
		gridColumns: columns,
		maxItems: 45,
		onActivate: () => link.click(),
		onEscape: () => document.querySelector<HTMLElement>("main")?.focus(),
	});
	if (nextIndex !== null) {
		grid
			.querySelector<HTMLAnchorElement>(`[data-ball-number="${nextIndex + 1}"]`)
			?.focus();
	}
}

onMount(() => {
	mounted = true;
	values.setTargetRound(initialRound);
	// Subscribe before fetching so a scan arriving during the request is retained.
	const unsubscribeValues = values.subscribe();
	const unsubscribeConnection = connection.subscribe();
	void initializeData(initialRound, forceClientRefresh);
	let lastVisibilityRefresh = 0;
	const refreshWhenVisible = () => {
		if (document.visibilityState !== "visible" || values.loading) return;
		const now = Date.now();
		if (now - lastVisibilityRefresh < 1000) return;
		lastVisibilityRefresh = now;
		refreshData();
	};
	window.addEventListener("focus", refreshWhenVisible);
	document.addEventListener("visibilitychange", refreshWhenVisible);
	return () => {
		mounted = false;
		loadSequence += 1;
		window.removeEventListener("focus", refreshWhenVisible);
		document.removeEventListener("visibilitychange", refreshWhenVisible);
		unsubscribeValues();
		unsubscribeConnection();
		values.dispose();
	};
});

$effect(() => {
	const round = initialRound;
	const forceRefresh = forceClientRefresh;
	untrack(() => {
		if (
			mounted &&
			(round !== activeRound || forceRefresh !== previousForceRefresh)
		) {
			void initializeData(round, forceRefresh);
		}
	});
});

$effect(() => {
	const connected = connection.connected;
	untrack(() => {
		if (connected && hasConnected && !wasConnected) refreshData();
		if (connected) hasConnected = true;
		wasConnected = connected;
	});
});
</script>

<div class="scan-status">
	{#if showHeader}
		<div class="scan-grid-header">
			<div class="scan-grid-context">
				<span class="scan-round">{displayedRound}회 스캔 현황</span>
				<span class="connection-status" role="status">
					<span class="connection-dot" class:connected={connection.connected && !values.error} aria-hidden="true"></span>
					{connectionLabel}
				</span>
			</div>
			<p class="scan-total"><span>QR 스캔</span><strong data-scan-total>{hasSnapshot ? values.totalScans.toLocaleString() : "—"}</strong><span>회</span></p>
		</div>
	{/if}

	{#if values.error}
		<div class="scan-message error-message" role="status">
			<p>스캔 집계를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
			<button type="button" onclick={refreshData}>다시 불러오기</button>
		</div>
	{:else if isFallbackPreviewVisible}
		<p class="scan-message">{headerRound}회에 아직 등록된 스캔이 없어, 최근 기록이 있는 <strong>{displayedRound}회</strong>를 보여드립니다.</p>
	{:else if !values.loading && hasSnapshot && values.totalScans === 0}
		<p class="scan-message">아직 등록된 QR이 없어요. 첫 스캔으로 이번 회차 현황을 채워주세요.</p>
	{:else if hasSnapshot && !connection.connected && !values.loading}
		<p class="scan-message">표시된 집계는 마지막으로 확인한 값입니다. 연결되면 다시 갱신됩니다.</p>
	{/if}

	<div
		class="scan-number-grid {gridGap}"
		style={`--scan-mobile: ${gridColumns.mobile ?? 5}; --scan-tablet: ${gridColumns.tablet ?? 9}; --scan-desktop: ${gridColumns.desktop ?? 9}; --scan-large: ${gridColumns.large ?? 9};`}
		role="group"
		aria-label={`${displayedRound}회 번호별 스캔 집계`}
		aria-busy={values.loading}
	>
		{#each numbers as ball (ball.id)}
			{@const label = hasSnapshot ? `${ball.id}번, 번호 집계 ${ball.value.toLocaleString()}회` : `${ball.id}번, 집계 ${values.error ? "확인 필요" : "불러오는 중"}`}
			{#if enableNavigation}
				<a
					href={resolve("/n/[index]", { index: String(ball.id) })}
					class="ball-grid-item"
					aria-label={`${label}. 상세 보기`}
					data-ball-number={ball.id}
					onkeydown={(event) => handleBallKeydown(event, ball.id)}
				>
					{@render scanBall(ball)}
				</a>
			{:else}
				<div class="ball-grid-item" role="img" aria-label={label} data-ball-number={ball.id}>
					{@render scanBall(ball)}
				</div>
			{/if}
		{/each}
	</div>
	<p class="scan-caption">번호 아래는 해당 번호가 포함된 횟수입니다.{#if enableNavigation} 볼을 누르면 회차별 기록을 볼 수 있어요.{/if}</p>
</div>

{#snippet scanBall(ball: BallNumber)}
	{@const delta = values.increments[ball.id] ?? 0}
	{#if incrementEffectConfig.show}
		{#key ball.value}
			<ValueIncrementEffect
				show={hasSnapshot && values.recentlyUpdated[ball.id] && delta > 0}
				{delta}
				message={incrementEffectConfig.message}
				color={incrementEffectConfig.color}
			/>
		{/key}
	{/if}
	<LottoBall
		ballNumber={ball.id}
		initialValue={hasSnapshot ? ball.value : undefined}
		size="small"
		interactive={false}
		viewTransitionName={enableNavigation ? `ball-${ball.id}` : "none"}
	/>
{/snippet}

<ScreenReaderStatus message={updateMessage} liveMode="polite" />

<style>
	.scan-status { container: scan-status / inline-size; min-width: 0; }
	.scan-grid-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem 1.25rem; padding-block: .25rem 1rem; }
	.scan-grid-context { display: grid; gap: .25rem; }
	.scan-round { font-size: .875rem; font-weight: 700; }
	.connection-status { display: inline-flex; align-items: center; gap: .35rem; font-size: .6875rem; color: var(--text-muted); }
	.connection-dot { width: .375rem; height: .375rem; border-radius: 50%; background: var(--text-muted); }
	.connection-dot.connected { background: var(--color-success-content); }
	.scan-total { display: flex; align-items: baseline; gap: .3rem; font-size: .75rem; color: var(--text-muted); white-space: nowrap; }
	.scan-total strong { margin-left: .3rem; color: var(--color-base-content); font-size: 1.5rem; line-height: 1; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -.04em; }
	.scan-message { margin-bottom: 1rem; font-size: .8125rem; line-height: 1.6; color: var(--text-muted); }
	.error-message { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem 1rem; }
	.error-message button { min-height: 2.75rem; color: var(--color-primary); font-weight: 650; text-decoration: underline; text-underline-offset: .2em; cursor: pointer; }
	.scan-number-grid { display: grid; grid-template-columns: repeat(var(--scan-mobile, 5), minmax(0, 1fr)); column-gap: clamp(.25rem, 1.2cqi, .625rem); row-gap: .625rem; }
	.ball-grid-item { position: relative; display: block; justify-self: center; width: 100%; max-width: 4.5rem; aspect-ratio: 1; border-radius: 50%; text-decoration: none; transition: transform 160ms ease; }
	a.ball-grid-item:hover { transform: translateY(-2px); z-index: 1; }
	a.ball-grid-item:focus-visible, .error-message button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
	.scan-caption { margin-top: 1rem; font-size: .6875rem; line-height: 1.6; color: var(--text-muted); }
	@container scan-status (min-width: 36rem) { .scan-number-grid { grid-template-columns: repeat(var(--scan-tablet, 9), minmax(0, 1fr)); } }
	@container scan-status (min-width: 48rem) { .scan-number-grid { grid-template-columns: repeat(var(--scan-desktop, 9), minmax(0, 1fr)); } }
	@container scan-status (min-width: 64rem) { .scan-number-grid { grid-template-columns: repeat(var(--scan-large, 9), minmax(0, 1fr)); } }
	@media (prefers-reduced-motion: reduce) { .ball-grid-item { transition: none; } a.ball-grid-item:hover { transform: none; } }
</style>
