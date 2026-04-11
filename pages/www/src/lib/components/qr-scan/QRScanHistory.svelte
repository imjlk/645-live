<script lang="ts">
import { browser } from "$app/environment";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import { getLottoNumbersFromAPI } from "$lib/utils/lotto-common.js";
import { parseLottoQR } from "$lib/utils/lotto-parser.js";
import {
	type QRScanHistoryItem,
	getRelativeTimeString,
	qrScanHistory,
	qrScanHistoryV2,
	syncHistory,
} from "$lib/utils/qr-scan-history.js";

// State
let showModal = $state(false);
let historyItems = $state<QRScanHistoryItem[]>([]);
let todayScansCount = $state(0);
let syncStatus = $state<"idle" | "syncing" | "success" | "error">("idle");
let isLoggedIn = $state(false);
type ParsedGame = {
	round?: number;
	numbers: number[];
};

type WinningDrawPreview = {
	winningNumbers: number[];
	bonusNumber: number;
	drawDate: string;
};

let winningDrawsByRound = $state<Record<number, WinningDrawPreview | null>>({});
const parsedGamesByItemId = $derived.by(() => {
	const parsedGames: Record<string, ParsedGame[]> = {};

	for (const item of historyItems) {
		const games = parseLottoQR(item.qrData) ?? [];
		parsedGames[item.id] = games.map((game) => ({
			round: game.round,
			numbers: [...game.numbers].sort((a, b) => a - b),
		}));
	}

	return parsedGames;
});

// Check login status
function checkLoginStatus() {
	if (!browser) return;
	const userId = qrScanHistoryV2.getUserId();
	isLoggedIn = !!userId;
}

// Load history when component mounts
async function loadHistory() {
	if (!browser) return;
	try {
		checkLoginStatus();
		const refreshResult = await qrScanHistory.refreshPendingResults();
		if (refreshResult.updated > 0 && isLoggedIn) {
			void syncHistory();
		}
		const nextHistoryItems = await qrScanHistory.getHistory();
		historyItems = nextHistoryItems;
		await loadWinningDraws(nextHistoryItems);
		todayScansCount = await qrScanHistory.getTotalScansToday();
	} catch (error) {
		console.error("히스토리 로드 실패:", error);
		historyItems = [];
		todayScansCount = 0;
	}
}

// Open modal and load fresh data
function openHistory() {
	loadHistory();
	showModal = true;
}

export function openHistoryModal() {
	openHistory();
}

// Close modal
function closeModal() {
	showModal = false;
}

// Delete specific scan
async function deleteScan(id: string) {
	if (!browser) return;
	try {
		await qrScanHistory.removeScan(id);
		await loadHistory(); // Refresh list
	} catch (error) {
		console.error("스캔 삭제 실패:", error);
	}
}

// Clear all history
async function clearAllHistory() {
	if (!browser) return;
	if (confirm("정말로 모든 스캔 기록을 삭제하시겠습니까?")) {
		try {
			await qrScanHistory.clearHistory();
			await loadHistory();
		} catch (error) {
			console.error("전체 히스토리 삭제 실패:", error);
		}
	}
}

// Manual sync for logged in users
async function handleSync() {
	if (!browser || !isLoggedIn) return;

	syncStatus = "syncing";
	try {
		const result = await syncHistory();
		if (result.success) {
			syncStatus = "success";
			loadHistory(); // Refresh data after sync
			setTimeout(() => {
				syncStatus = "idle";
			}, 2000); // Reset status after 2s
		} else {
			syncStatus = "error";
			console.error("동기화 실패:", result.error);
			setTimeout(() => {
				syncStatus = "idle";
			}, 3000);
		}
	} catch (error) {
		syncStatus = "error";
		console.error("동기화 중 오류:", error);
		setTimeout(() => {
			syncStatus = "idle";
		}, 3000);
	}
}

// Get icon based on scan result
function getScanIcon(item: QRScanHistoryItem): string {
	if (item.resultStatus === "winner") {
		if (item.winningGrade === "1등" || item.winningGrade === "2등") {
			return "🎉";
		}
		return "🎊";
	}
	if (item.resultStatus === "expired") {
		return "⌛";
	}
	if (item.resultStatus === "unreleased") {
		return "⏳";
	}
	if (item.resultStatus === "unknown") {
		return "❔";
	}
	return "📄";
}

// Get background color based on scan result
function getScanBgColor(item: QRScanHistoryItem): string {
	if (item.resultStatus === "winner") {
		if (item.winningGrade === "1등" || item.winningGrade === "2등") {
			return "bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300 dark:from-yellow-950/70 dark:to-orange-950/70 dark:border-yellow-800";
		}
		return "bg-gradient-to-r from-green-50 to-blue-50 border-green-300 dark:from-green-950/60 dark:to-blue-950/60 dark:border-green-800";
	}
	if (item.resultStatus === "expired") {
		return "bg-gradient-to-r from-rose-50 to-orange-50 border-rose-300 dark:from-rose-950/60 dark:to-orange-950/60 dark:border-rose-800";
	}
	if (item.resultStatus === "unreleased") {
		return "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 dark:from-amber-950/60 dark:to-yellow-950/60 dark:border-amber-800";
	}
	if (item.resultStatus === "unknown") {
		return "bg-gradient-to-r from-slate-50 to-gray-100 border-slate-300 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700";
	}
	return "bg-base-100 border-base-300";
}

function getStatusBadge(item: QRScanHistoryItem): string | null {
	if (item.resultStatus === "winner" && item.winningGrade) {
		return item.winningGrade;
	}

	if (item.resultStatus === "expired") {
		return "기간 지남";
	}

	if (item.resultStatus === "unreleased") {
		return "미발표";
	}

	if (item.resultStatus === "unknown") {
		return "확인 필요";
	}

	return null;
}

// Format date for display
function formatScanDate(date: Date): string {
	return date.toLocaleDateString("ko-KR", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function isReleasedDraw(
	winningData: Awaited<ReturnType<typeof getLottoNumbersFromAPI>>,
): winningData is NonNullable<Awaited<ReturnType<typeof getLottoNumbersFromAPI>>> {
	if (!winningData) {
		return false;
	}

	return !(
		winningData.drwtNo1 === 0 &&
		winningData.drwtNo2 === 0 &&
		winningData.drwtNo3 === 0
	);
}

async function loadWinningDraws(items: QRScanHistoryItem[]) {
	const rounds = Array.from(
		new Set(
			items
				.filter(
					(item): item is QRScanHistoryItem & { round: number } =>
						typeof item.round === "number" &&
						item.round > 0 &&
						item.resultStatus !== "unreleased",
				)
				.map((item) => item.round),
		),
	);

	const missingRounds = rounds.filter((round) => !(round in winningDrawsByRound));
	if (missingRounds.length === 0) {
		return;
	}

	const fetchedEntries = await Promise.all(
		missingRounds.map(async (round) => {
			try {
				const winningData = await getLottoNumbersFromAPI(round);
				if (!isReleasedDraw(winningData)) {
					return [round, null] as const;
				}

				return [
					round,
					{
						winningNumbers: [
							winningData.drwtNo1,
							winningData.drwtNo2,
							winningData.drwtNo3,
							winningData.drwtNo4,
							winningData.drwtNo5,
							winningData.drwtNo6,
						],
						bonusNumber: winningData.bnusNo,
						drawDate: winningData.drwNoDate,
					},
				] as const;
			} catch (error) {
				console.error(`${round}회차 당첨 번호 로드 실패:`, error);
				return [round, null] as const;
			}
		}),
	);

	winningDrawsByRound = {
		...winningDrawsByRound,
		...Object.fromEntries(fetchedEntries),
	};
}

function getMatchCount(numbers: number[], winningDraw: WinningDrawPreview | null): number {
	if (!winningDraw) {
		return 0;
	}

	return numbers.filter((number) => winningDraw.winningNumbers.includes(number))
		.length;
}

function hasBonusMatch(
	numbers: number[],
	winningDraw: WinningDrawPreview | null,
): boolean {
	return winningDraw ? numbers.includes(winningDraw.bonusNumber) : false;
}

function getMatchSummary(
	numbers: number[],
	winningDraw: WinningDrawPreview | null,
): string | null {
	const matchCount = getMatchCount(numbers, winningDraw);
	const bonusMatch = hasBonusMatch(numbers, winningDraw);

	if (matchCount === 0 && !bonusMatch) {
		return null;
	}

	if (bonusMatch && matchCount > 0) {
		return `${matchCount}개 일치 + 보너스`;
	}

	if (bonusMatch) {
		return "보너스 일치";
	}

	return `${matchCount}개 일치`;
}

function getWinningDraw(round?: number): WinningDrawPreview | null {
	if (typeof round !== "number") {
		return null;
	}

	return winningDrawsByRound[round] ?? null;
}

function formatWinningDrawDate(drawDate: string): string {
	try {
		return new Date(drawDate).toLocaleDateString("ko-KR", {
			month: "short",
			day: "numeric",
		});
	} catch {
		return drawDate;
	}
}

// Load initial data when component is created
loadHistory();
</script>

<!-- Floating Action Button -->
<div class="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[9999]">
	<button
		class="btn btn-circle btn-primary btn-lg shadow-2xl hover:shadow-xl transition-all duration-200 group relative"
		onclick={openHistory}
		title="스캔 히스토리 보기"
		aria-label="스캔 히스토리 보기"
		style="z-index: 9999;"
	>
		<svg class="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
		</svg>
		
		<!-- Badge showing today's scan count -->
		{#if todayScansCount > 0}
			<div class="absolute -top-2 -left-2 bg-secondary text-secondary-content text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold z-10">
				{todayScansCount}
			</div>
		{/if}
	</button>
</div>

<!-- Modal -->
{#if showModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-2xl max-h-[50vh] p-0 bg-base-100 text-base-content shadow-2xl">
			<!-- Header -->
			<div class="sticky top-0 bg-base-100 border-b border-base-300 p-6 z-10 text-base-content">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="font-bold text-lg">QR 스캔 히스토리</h3>
						<p class="text-sm text-base-content/70">
							총 {historyItems.length}개 스캔 | 오늘 {todayScansCount}개
						</p>
					</div>
					<div class="flex gap-2">
						{#if isLoggedIn}
							<button 
								class="btn btn-ghost btn-sm"
								onclick={handleSync}
								disabled={syncStatus === 'syncing'}
								title="클라우드 동기화"
								aria-label="클라우드 동기화"
							>
								{#if syncStatus === 'syncing'}
									<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
									</svg>
								{:else if syncStatus === 'success'}
									<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
									</svg>
								{:else if syncStatus === 'error'}
									<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
									</svg>
								{:else}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
									</svg>
								{/if}
							</button>
						{/if}
						{#if historyItems.length > 0}
							<button 
								class="btn btn-ghost btn-sm"
								onclick={clearAllHistory}
								title="모든 기록 삭제"
								aria-label="모든 기록 삭제"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
								</svg>
							</button>
						{/if}
						<button 
							class="btn btn-ghost btn-sm"
							onclick={closeModal}
							aria-label="모달 닫기"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					</div>
				</div>
			</div>

			<!-- Content -->
			<div class="p-1 space-y-4 max-h-[35vh] overflow-y-auto">
				{#if historyItems.length === 0}
					<div class="text-center py-12">
						<div class="text-base-content/40 mb-4">
							<svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
							</svg>
						</div>
						<p class="text-base-content/60">아직 스캔한 QR 코드가 없습니다</p>
						<p class="text-sm text-base-content/40 mt-2">로또 QR 코드를 스캔하면 여기에 기록이 남습니다</p>
					</div>
				{:else}
					{#each historyItems as item (item.id)}
						{@const statusBadge = getStatusBadge(item)}
						{@const winningDraw = getWinningDraw(item.round)}
						{@const parsedGames = parsedGamesByItemId[item.id] ?? []}
						<div class="card border text-base-content {getScanBgColor(item)} transition-all hover:shadow-md mb-1">
							<div class="card-body p-2">
								<div class="flex items-start justify-between">
									<div class="flex items-start gap-3 flex-1">
										<div class="text-2xl mt-1">
											{getScanIcon(item)}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2 mb-1">
												<h4 class="font-semibold text-sm truncate text-base-content">
													{item.summary}
												</h4>
												{#if statusBadge}
													<div
														class="badge badge-sm"
														class:badge-success={item.resultStatus === "winner"}
														class:badge-error={item.resultStatus === "expired"}
														class:badge-warning={item.resultStatus === "unreleased"}
														class:badge-neutral={item.resultStatus === "unknown"}
													>
														{statusBadge}
													</div>
												{/if}
											</div>
											<div class="text-xs text-base-content/60 space-y-1">
												<p>
													<span class="font-medium">스캔 시간:</span>
													{formatScanDate(item.scannedAt)}
													<span class="text-base-content/40">
														({getRelativeTimeString(item.scannedAt)})
													</span>
												</p>
												{#if item.round}
													<p>
														<span class="font-medium">회차:</span>
														{item.round}회
														{#if item.gamesCount}
															| <span class="font-medium">게임:</span> {item.gamesCount}개
														{/if}
													</p>
												{/if}
												{#if parsedGames.length > 0}
													<div class="rounded-lg bg-base-200/90 p-2 text-xs dark:bg-base-300/20">
														{#if winningDraw}
															<div class="rounded-md border border-warning/30 bg-warning/10 p-2">
																<div class="flex items-center justify-between gap-2">
																	<div class="font-medium text-base-content/80">당첨 번호</div>
																	<div class="text-[11px] text-base-content/50">
																		{formatWinningDrawDate(winningDraw.drawDate)} 추첨
																	</div>
																</div>
																<div class="mt-1 flex flex-wrap items-center gap-1.5">
																	{#each winningDraw.winningNumbers as number (number)}
																		<SimpleBall number={number} isWinning={true} size="sm" />
																	{/each}
																	<span class="px-1 text-[11px] font-semibold text-base-content/60">
																		보너스
																	</span>
																	<SimpleBall number={winningDraw.bonusNumber} isBonus={true} size="sm" />
																</div>
															</div>
														{/if}

														<div class="mt-2 space-y-2">
															{#each parsedGames as game, index (`${item.id}-${index}`)}
																{@const matchSummary = getMatchSummary(game.numbers, winningDraw)}
																<div class="rounded-md bg-base-100/80 p-2">
																	<div class="flex items-center justify-between gap-2">
																		<div class="font-medium text-base-content/80">
																			{index + 1}게임
																		</div>
																		{#if matchSummary}
																			<div class="badge badge-outline badge-sm border-info/60 bg-info/10 font-bold text-info">
																				{matchSummary}
																			</div>
																		{/if}
																	</div>
																	<div class="mt-1 flex flex-wrap gap-1.5">
																		{#each game.numbers as number (`${item.id}-${index}-${number}`)}
																			<SimpleBall
																				number={number}
																				isWinning={winningDraw ? winningDraw.winningNumbers.includes(number) : false}
																				isBonus={winningDraw ? winningDraw.bonusNumber === number : false}
																				size="sm"
																			/>
																		{/each}
																	</div>
																</div>
															{/each}
														</div>
													</div>
												{/if}
											</div>
										</div>
									</div>
									<button 
										class="btn btn-ghost btn-xs text-base-content/70 opacity-60 hover:opacity-100 hover:text-base-content"
										onclick={() => deleteScan(item.id)}
										title="이 기록 삭제"
										aria-label="이 기록 삭제"
									>
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
										</svg>
									</button>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			{#if historyItems.length > 0}
				<div class="sticky bottom-0 bg-base-100 border-t border-base-300 p-4 text-base-content">
					<div class="flex justify-between items-center text-xs text-base-content/60">
						<span>로그인하지 않은 스캔 내역은 최대 1주일 동안 보관됩니다</span>
						<span>최대 100개까지 저장됩니다</span>
					</div>
				</div>
			{/if}
		</div>
		<div class="modal-backdrop" onclick={closeModal} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && closeModal()}></div>
	</div>
{/if}
