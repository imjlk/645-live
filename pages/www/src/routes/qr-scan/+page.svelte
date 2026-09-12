<!-- @ts-nocheck -->
<script lang="ts">
// @ts-nocheck

import {
	type BarcodeFormat,
	BarqodeDropzone,
	BarqodeStream,
	type DetectedBarcode,
} from "barqode";
import { onMount } from "svelte";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { JsonLd, MetaTags } from "svelte-meta-tags";
import { Toaster, toast } from "svelte-sonner";
import { browser } from "$app/environment";
import { resolve } from "$app/paths";
import { page } from "$app/state";
import { useBrowserSession } from "$lib/auth/session.svelte";
import QRScanHistory from "$lib/components/qr-scan/QRScanHistory.svelte";
import SimpleBall from "$lib/components/SimpleBall.svelte";
import ScanStatusGrid from "$lib/modules/lotto/components/ScanStatusGrid.svelte";
import { getGenericOgImage, getGenericOgUrl } from "$lib/seo";
import type { QrScanResponse } from "$lib/server/qr-scan-service";
import type { ScanRecordPayload } from "$lib/server/scan-record";
import { trackEvent } from "$lib/utils/analytics";
import { calculateExpectedLatestRound } from "$lib/utils/lotto-common.js";
import { parseLottoQR } from "$lib/utils/lotto-parser.js";
import { syncMemberScanHistory } from "$lib/utils/member-scan-sync.js";
import {
	generateTicketHash,
	qrScanHistory,
} from "$lib/utils/qr-scan-history.js";

const auth = useBrowserSession();
const entryPoint = $derived(
	browser && page.url.searchParams.get("from") === "home-live"
		? "home_live"
		: "qr_page",
);
const sessionOwner = $derived(
	auth.status === "anonymous"
		? null
		: auth.status === "authenticated"
			? auth.session?.user.id
			: undefined,
);

// ===== TYPE DEFINITIONS =====
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
	horizontalViewAngle?: number;
	focusDistance?: {
		min: number;
		max: number;
	};
}

interface ExtendedMediaTrackSettings extends MediaTrackSettings {
	width: number;
	height: number;
}

// ===== STATE VARIABLES =====
// UI States
let loading = $state(true);
let permissionDenied = $state(false);
let error = $state("");
let dragover = $state(false);
// UI modal for permission guidance
let showPermissionModal = $state(false);

// Camera States
let videoDevices = $state<MediaDeviceInfo[]>([]);
let selectedDeviceId = $state("");

// Detection Results
let lastDetected = $state("");
let isSubmitting = $state(false);

let scanError = $state("");
let resultNotice = $state("");
let latestRound = $state<number | null>(null);
let activeRequest: AbortController | null = null;

// Scan status grid reference for round updates
let scanStatusGrid = $state<ScanStatusGrid>();
let historyModal = $state();
let latestScanData = $state<ScanRecordPayload | null>(null);
let latestScanOwner = $state<string | null | undefined>(undefined);
const latestScan = $derived(
	latestScanOwner !== undefined &&
		((auth.status === "anonymous" && latestScanOwner === null) ||
			(auth.status === "authenticated" &&
				latestScanOwner === auth.session?.user.id))
		? latestScanData
		: null,
);
let latestGames = $state<number[][]>([]);
let activeScanSource = $state<"camera" | "image">("camera");
let showScanStats = $state(false);
const resultLabel = $derived(
	latestScan?.resultStatus === "winner"
		? `${latestScan.winningGrade ?? ""} 당첨`
		: latestScan?.resultStatus === "unreleased"
			? "추첨 발표 전"
			: latestScan?.resultStatus === "expired"
				? "수령 기간 지남"
				: latestScan?.resultStatus === "unknown"
					? "결과 확인 필요"
					: "당첨 없음",
);
const pageDescription =
	"로또 용지의 QR 코드를 카메라로 스캔하거나 사진을 선택해 회차와 당첨 여부를 확인하세요. 발표 전 티켓과 이전 스캔 내역도 확인할 수 있으며, 로그인하면 스캔 기록을 계정에 저장해 다시 볼 수 있습니다.";
let currentRound = $state(0); // QR 스캔 후에 실제 회차로 설정

const qrScanFaqs = [
	{
		question: "로또 QR 스캔은 어떻게 사용하나요?",
		answer:
			"카메라 권한을 허용한 뒤 로또 용지의 QR 코드를 화면에 비추면 당첨 확인과 저장이 순서대로 진행됩니다. 카메라 대신 이미지 업로드로도 QR을 읽을 수 있습니다.",
	},
	{
		question: "어떤 정보가 저장되나요?",
		answer:
			"스캔한 티켓의 회차, 게임 수, 당첨 상태 요약, 스캔 시각 같은 확인용 정보가 저장됩니다. 로그인한 경우에는 내 스캔 내역과 함께 관리될 수 있습니다.",
	},
	{
		question: "여러 QR 코드를 한 번에 비추면 되나요?",
		answer:
			"스캔 정확도를 높이려면 한 번에 한 장씩 비추는 것이 좋습니다. 여러 QR이 동시에 보이면 원하는 티켓이 아닌 다른 코드가 먼저 인식될 수 있습니다.",
	},
	{
		question: "어떤 환경에서 잘 동작하나요?",
		answer:
			"밝은 조명과 흔들림이 적은 환경에서 가장 안정적입니다. 모바일 브라우저의 후면 카메라를 쓰면 인식률이 더 좋습니다.",
	},
];

// ===== DERIVED STATES =====
let hasCameraSelection = $derived(
	videoDevices.length > 1 && !permissionDenied && !error,
);

let showCameraStream = $derived(!permissionDenied && !error);

// ===== BARCODE DETECTION HANDLERS =====
async function onDetect(detectedCodes: DetectedBarcode[]) {
	if (detectedCodes.length > 0) {
		lastDetected = detectedCodes[0].rawValue;

		// 스캔 API를 통해 처리
		await submitQRData(lastDetected);
	}
}

async function onDetectUploaded(detectedCodes: DetectedBarcode[]) {
	// 업로드된 이미지에서도 로또 QR 코드 파싱 및 처리
	if (detectedCodes.length > 0) {
		const qrData = detectedCodes[0].rawValue;

		toast.info("📷 이미지에서 QR 코드 감지됨", {
			description: "QR 코드를 처리하고 있습니다...",
			duration: 3000,
		});

		// 스캔 API를 통해 처리
		await submitQRData(qrData, "image");
	}
}

// 현재 처리 중인 QR 데이터 추적 (중복 제출 방지)
let processingQRData = $state<string | null>(null);

const QR_SCAN_COOLDOWN_MS = 500;
const HISTORY_REFRESH_INTERVAL_MS = 30_000;

// 최근 처리한 티켓 해시들 (짧은 재감지 쿨다운용)
const recentScannedTicketHashes = new SvelteSet<string>();

// 현재 세션에서 저장 완료된 티켓 해시들
const sessionStoredTicketHashes = new SvelteSet<string>();

// 같은 이유의 토스트를 짧은 시간 안에 중복 표시하지 않기 위한 캐시
const recentToastKeys = new SvelteMap<string, number>();
const TOAST_DEDUP_MS = QR_SCAN_COOLDOWN_MS;
const PROCESSING_TOAST_DEDUP_MS = 800;
let lastHistoryRefreshAt = 0;
let historyRefreshInFlight: Promise<number> | null = null;

function shouldShowToast(key: string, dedupMs = TOAST_DEDUP_MS) {
	const now = Date.now();
	const lastShownAt = recentToastKeys.get(key) ?? 0;

	if (now - lastShownAt < dedupMs) {
		return false;
	}

	recentToastKeys.set(key, now);
	return true;
}

function rememberRecentTicket(ticketHash: string) {
	recentScannedTicketHashes.add(ticketHash);
	clearQRCooldown(ticketHash);
}

function storedTicketKey(ticketHash: string) {
	return JSON.stringify([sessionOwner, ticketHash]);
}

function markStoredTicket(ticketHash: string) {
	if (sessionOwner !== undefined)
		sessionStoredTicketHashes.add(storedTicketKey(ticketHash));
}

function notifyStoredDuplicate(ticketHash: string) {
	const toastKey = `stored-duplicate-${ticketHash}`;
	if (!shouldShowToast(toastKey)) {
		return;
	}

	toast.info("ℹ️ 이미 스캔한 로또 용지입니다", {
		description: "저장된 스캔 내역과 일치하는 티켓입니다.",
		duration: 4000,
	});
}

function notifyCooldownDuplicate(ticketHash: string) {
	const toastKey = `cooldown-${ticketHash}`;
	if (!shouldShowToast(toastKey)) {
		return;
	}

	toast.info("ℹ️ 방금 처리한 로또 용지입니다", {
		description:
			"카메라가 같은 QR를 다시 읽고 있습니다. 잠시만 두면 다음 스캔으로 넘어갑니다.",
		duration: 1500,
	});
}

function notifyProcessingDuplicate(ticketHash: string) {
	const toastKey = `processing-${ticketHash}`;
	if (!shouldShowToast(toastKey, PROCESSING_TOAST_DEDUP_MS)) {
		return;
	}

	toast.info("⏳ 같은 QR 코드를 처리 중입니다", {
		description: "처리가 끝나면 저장 상태를 기준으로 다시 안내합니다.",
		duration: 2500,
	});
}

// QR 쿨다운 해제 함수
function clearQRCooldown(ticketHash: string) {
	setTimeout(() => {
		recentScannedTicketHashes.delete(ticketHash);
	}, QR_SCAN_COOLDOWN_MS);
}

async function refreshStoredScanResults(
	options: { notify?: boolean; force?: boolean } = {},
) {
	if (!browser) {
		return 0;
	}

	const { notify = false, force = false } = options;
	const now = Date.now();

	if (!force && now - lastHistoryRefreshAt < HISTORY_REFRESH_INTERVAL_MS) {
		return 0;
	}

	if (historyRefreshInFlight) {
		return historyRefreshInFlight;
	}

	lastHistoryRefreshAt = now;
	historyRefreshInFlight = (async () => {
		try {
			const result = await qrScanHistory.refreshPendingResults();

			if (result.updated > 0) {
				if (qrScanHistory.getUserId()) {
					void syncMemberScanHistory();
				}

				if (notify) {
					toast.success("🔄 저장된 스캔 결과를 갱신했습니다", {
						description: `발표가 완료된 ${result.updated}개 티켓을 최신 당첨 결과로 다시 확인했습니다.`,
						duration: 5000,
					});
				}
			}

			return result.updated;
		} catch (refreshError) {
			console.error("저장된 스캔 결과 갱신 실패:", refreshError);
			return 0;
		} finally {
			historyRefreshInFlight = null;
		}
	})();

	return historyRefreshInFlight;
}

// Decoding stays in the browser; validation, aggregation and member writes use the API.
async function submitQRData(
	qrData: string,
	source: "camera" | "image" = "camera",
) {
	const ticketHash = generateTicketHash(qrData);
	if (processingQRData) {
		notifyProcessingDuplicate(ticketHash);
		return;
	}
	if (recentScannedTicketHashes.has(ticketHash)) {
		notifyCooldownDuplicate(ticketHash);
		return;
	}
	if (
		sessionOwner !== undefined &&
		sessionStoredTicketHashes.has(storedTicketKey(ticketHash))
	) {
		rememberRecentTicket(ticketHash);
		notifyStoredDuplicate(ticketHash);
		return;
	}

	// Reserve the request before asynchronous local-history lookup to avoid parallel writes.
	processingQRData = qrData;
	try {
		const historyOwner = sessionOwner;
		if (
			historyOwner !== undefined &&
			(await qrScanHistory.isDuplicate(qrData)) &&
			historyOwner === sessionOwner
		) {
			markStoredTicket(ticketHash);
			rememberRecentTicket(ticketHash);
			notifyStoredDuplicate(ticketHash);
			return;
		}
		const games = parseLottoQR(qrData);
		if (
			!games?.length ||
			games.some((game) => new Set(game.numbers).size !== 6)
		) {
			scanError =
				"유효한 로또 QR 코드가 아닙니다. 용지의 QR을 다시 확인해주세요.";
			toast.error("스캔 실패", { description: scanError });
			rememberRecentTicket(ticketHash);
			return;
		}
		activeScanSource = source;
		isSubmitting = true;
		scanError = "";
		resultNotice = "";
		rememberRecentTicket(ticketHash);
		activeRequest = new AbortController();
		const timeout = setTimeout(() => activeRequest?.abort(), 30_000);
		try {
			const response = await fetch(resolve("/api/qr-scan"), {
				method: "POST",
				credentials: "same-origin",
				headers: {
					"Content-Type": "application/json",
					...(sessionOwner !== undefined
						? { "x-645-member-id": sessionOwner ?? "" }
						: {}),
				},
				body: JSON.stringify({ qrData }),
				signal: activeRequest.signal,
			});
			const result = (await response.json()) as QrScanResponse;
			if (!result || typeof result !== "object") {
				throw new Error(
					"스캔 응답을 확인하지 못했어요. 잠시 후 다시 시도해주세요.",
				);
			}
			if (!response.ok || !result.success) {
				if (response.status === 409) await auth.refresh();
				throw new Error(
					"error" in result
						? result.error
						: "스캔을 저장하지 못했어요. 다시 시도해주세요.",
				);
			}
			await handleScanResult(result);
		} finally {
			clearTimeout(timeout);
		}
	} catch (requestError) {
		scanError =
			requestError instanceof Error && requestError.name === "AbortError"
				? "요청 시간이 초과되었습니다. 연결 상태를 확인하고 다시 시도해주세요."
				: requestError instanceof Error &&
						!(
							requestError instanceof TypeError ||
							requestError instanceof SyntaxError
						)
					? requestError.message
					: "스캔 서비스에 연결하지 못했어요. 연결 상태를 확인하고 다시 시도해주세요.";
		toast.error("스캔 실패", { description: scanError, duration: 6000 });
	} finally {
		isSubmitting = false;
		processingQRData = null;
		activeRequest = null;
	}
}

async function handleScanResult(
	result: Extract<QrScanResponse, { success: true }>,
) {
	const responseOwner = result.data.memberUserId ?? null;
	if (auth.status === "loading" || auth.status === "error")
		await auth.refresh();
	const currentOwner = auth.session?.user.id ?? null;
	if (
		(auth.status !== "anonymous" && auth.status !== "authenticated") ||
		currentOwner !== responseOwner
	) {
		toast.info("로그인 상태가 바뀌었습니다", {
			description:
				"다른 계정에 기록이 저장되지 않도록 멈췄어요. 현재 계정에서 다시 확인해주세요.",
		});
		return;
	}
	latestScanOwner = responseOwner;
	resultNotice = result.data.alreadyScanned
		? "이미 저장된 티켓의 결과를 다시 확인했습니다."
		: "";
	const qrData = result.data?.qrData;
	const scanRecord = result.data?.scanRecord;
	const memberSyncState = result.data?.memberSyncState;
	if (scanRecord) {
		latestScanData = scanRecord;
		latestGames = (parseLottoQR(qrData ?? "") ?? []).map((game) =>
			[...game.numbers].sort((a, b) => a - b),
		);
		trackEvent("qr_scan_complete", {
			source: activeScanSource,
			entry_point: entryPoint,
			new_registration: !result.data.alreadyScanned,
			count: scanRecord.gamesCount ?? 0,
			status: scanRecord.resultStatus ?? "unknown",
		});
	}
	const ticketHash =
		scanRecord?.ticketHash ||
		(qrData
			? generateTicketHash(qrData, scanRecord?.round, scanRecord?.gamesCount)
			: null);

	const resolvedRound = scanRecord?.round;
	if (resolvedRound) {
		if (currentRound === 0 || resolvedRound !== currentRound) {
			currentRound = resolvedRound;
			if (scanStatusGrid) {
				scanStatusGrid.updateRound(resolvedRound);
			}
		}
	}

	if (ticketHash) {
		markStoredTicket(ticketHash);
	}

	if (browser && qrData && scanRecord) {
		void (async () => {
			try {
				await qrScanHistory.upsertScan({
					...scanRecord,
					userId: responseOwner ?? undefined,
					syncStatus:
						memberSyncState === "synced"
							? "synced"
							: memberSyncState === "pending"
								? "pending"
								: "local",
					isWinner: scanRecord.resultStatus === "winner",
				});

				if (memberSyncState === "pending") {
					void syncMemberScanHistory();
				}
			} catch (error) {
				if (error instanceof Error && error.message.includes("이미 스캔한")) {
					// The local provider may already have the same ticket.
				} else {
					console.error("히스토리 저장 실패:", error);
				}
			}
		})();
	}

	if (scanRecord) {
		if (scanRecord.isExpired) {
			toast.warning("⌛ 수령 기간이 지난 티켓입니다", {
				description: `${scanRecord.round}회차는 당첨금 수령 기한이 지나 결과 대신 만료 상태로 기록했습니다.`,
				duration: 7000,
			});
		} else if (scanRecord.isUnreleased) {
			toast.success("✅ 로또 스캔 저장 완료!", {
				description: `${scanRecord.round}회차 ${scanRecord.gamesCount}개 게임 저장됨. 발표 후 이 페이지에 다시 방문하면 결과를 확인할 수 있습니다.`,
				duration: 6000,
			});
		} else if (scanRecord.resultStatus === "unknown") {
			toast.info("티켓을 저장했어요. 결과 확인이 필요합니다", {
				description:
					"당첨 결과를 불러오지 못했어요. 잠시 후 스캔 내역에서 다시 확인해주세요.",
			});
		} else if (scanRecord.isWinner) {
			const winners = scanRecord.winningResults.filter(
				(result) => result.isWinner,
			);
			const highestGrade = winners.reduce((highest, current) => {
				const gradeOrder = {
					"1등": 1,
					"2등": 2,
					"3등": 3,
					"4등": 4,
					"5등": 5,
				};
				return gradeOrder[current.grade as keyof typeof gradeOrder] <
					gradeOrder[highest.grade as keyof typeof gradeOrder]
					? current
					: highest;
			});

			const prizeText = highestGrade.prize ? ` (${highestGrade.prize})` : "";

			toast.success(highestGrade.message, {
				description: `${scanRecord.round}회차 당첨 확인 - ${highestGrade.grade}${prizeText} | 총 ${scanRecord.gamesCount}개 게임 중 ${winners.length}개 당첨`,
				duration:
					highestGrade.grade === "1등" || highestGrade.grade === "2등"
						? 15000
						: 10000,
				richColors: true,
				...(highestGrade.grade === "1등" || highestGrade.grade === "2등"
					? {
							style:
								"background: var(--color-base-100); color: var(--color-base-content); border: 1px solid var(--color-success);",
						}
					: {}),
			});

			winners.forEach((winner, index) => {
				setTimeout(
					() => {
						const winnerPrizeText = winner.prize ? ` (${winner.prize})` : "";
						toast.info(`🎯 당첨 게임 ${index + 1}`, {
							description: `${winner.grade} - ${winner.matchCount}개 번호 일치${winner.bonusMatch ? " + 보너스" : ""}${winnerPrizeText}`,
							duration: 8000,
						});
					},
					(index + 1) * 1000,
				);
			});
		} else {
			toast.success("✅ QR 스캔 성공!", {
				description: `${scanRecord.round}회차 당첨 확인 완료 - 당첨 없음 | ${scanRecord.gamesCount}개 게임 처리됨`,
				duration: 5000,
			});
		}
	} else {
		toast.success("✅ QR 스캔 성공!", {
			description: `${result.data?.gamesCount}개 게임 처리됨`,
			duration: 5000,
		});
	}
}

function onDragover(isDraggingOver: boolean) {
	dragover = isDraggingOver;
}

function track(
	detectedCodes: {
		cornerPoints: { x: number; y: number }[];
		boundingBox: DOMRectReadOnly;
		rawValue: string;
		format: Exclude<BarcodeFormat, "linear_codes" | "matrix_codes">;
	}[],
	ctx: CanvasRenderingContext2D,
) {
	for (const detectedCode of detectedCodes) {
		const [firstPoint, ...otherPoints] = detectedCode.cornerPoints;

		if (!firstPoint) continue;

		ctx.strokeStyle = "#00ff00";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(firstPoint.x, firstPoint.y);

		for (const { x, y } of otherPoints) {
			ctx.lineTo(x, y);
		}

		ctx.lineTo(firstPoint.x, firstPoint.y);
		ctx.closePath();
		ctx.stroke();
	}
}

// ===== ERROR HANDLING =====
function onError(err: { name: string; message: string }) {
	error = `[${err.name}]: `;

	if (err.name === "NotAllowedError") {
		permissionDenied = true;
		loading = false;
		error += "카메라 접근 권한이 필요합니다";
	} else if (err.name === "NotFoundError") {
		error += "이 기기에서 카메라를 찾을 수 없습니다";
	} else if (err.name === "NotSupportedError") {
		error += "보안 연결이 필요합니다 (HTTPS, localhost)";
	} else if (err.name === "NotReadableError") {
		error += "카메라가 이미 사용 중입니다";
	} else if (err.name === "OverconstrainedError") {
		error += "설치된 카메라가 요구사항에 맞지 않습니다";
	} else if (err.name === "StreamApiNotSupportedError") {
		error += "이 브라우저에서는 Stream API를 지원하지 않습니다";
	} else {
		error += err.message;
	}
}

// ===== CAMERA UTILITIES =====
async function calculateFOV(deviceId: string): Promise<number | null> {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: {
				deviceId: { exact: deviceId },
				width: { ideal: 1920 },
				height: { ideal: 1080 },
			},
		});

		const track = stream.getVideoTracks()[0];
		if (!track) return null;

		const capabilities = track.getCapabilities?.() as
			| ExtendedMediaTrackCapabilities
			| undefined;
		const settings = track.getSettings() as ExtendedMediaTrackSettings;

		// Clean up stream
		track.stop();

		if (capabilities && settings && settings.width && settings.height) {
			// Try to get FOV from capabilities if available (가장 정확한 방법)
			if (capabilities.horizontalViewAngle) {
				return capabilities.horizontalViewAngle;
			}

			// Calculate approximate FOV based on focal length and sensor size
			if (capabilities.focusDistance?.min) {
				// Estimate FOV using resolution and typical mobile camera sensor sizes
				const estimatedSensorDiagonal = 7.0; // mm, typical mobile camera sensor
				const focalLength = capabilities.focusDistance.min; // mm

				const fov =
					2 *
					Math.atan(estimatedSensorDiagonal / (2 * focalLength)) *
					(180 / Math.PI);

				// 합리적인 범위 체크 (20-150도)
				if (fov >= 20 && fov <= 150) {
					return fov;
				}
			}
		}

		// FOV를 정확히 측정할 수 없는 경우 null 반환
		return null;
	} catch (error) {
		console.warn(`FOV calculation failed for device ${deviceId}:`, error);
		return null;
	}
}

async function getPreferredCamera(devices: MediaDeviceInfo[]): Promise<string> {
	// Calculate FOV for all devices
	const fovPromises = devices.map(async (device) => {
		const fov = await calculateFOV(device.deviceId);
		return { device, fov };
	});

	const deviceFOVs = await Promise.all(fovPromises);

	// 광각 카메라 필터링 (QR 스캔에 적합하지 않음)
	const wideAngleKeywords = [
		"wide",
		"ultra",
		"광각",
		"초광각",
		"ultrawide",
		"0.5x",
		"0.6x",
		"telephoto",
		"macro",
		"zoom",
	];

	const isWideAngleCamera = (device: MediaDeviceInfo, fov: number | null) => {
		const label = device.label.toLowerCase();

		// 레이블에 광각 키워드가 포함된 경우
		if (wideAngleKeywords.some((keyword) => label.includes(keyword))) {
			return true;
		}

		// FOV가 95도 이상인 경우 (광각으로 간주)
		if (fov !== null && fov >= 95) {
			return true;
		}

		return false;
	};

	// QR 스캔에 적합한 카메라 필터링
	const qrSuitableDevices = deviceFOVs.filter(
		({ device, fov }) => !isWideAngleCamera(device, fov),
	);

	// 후면 카메라 중 QR 스캔에 적합한 것들
	const rearQRSuitableDevices = qrSuitableDevices.filter(
		({ device }) =>
			device.label.toLowerCase().includes("back") ||
			device.label.toLowerCase().includes("rear") ||
			device.label.toLowerCase().includes("환경") ||
			device.label.toLowerCase().includes("main"),
	);

	// 표준 FOV 범위 (60-85도) 카메라
	const standardFOVDevices = qrSuitableDevices.filter(
		({ fov }) => fov !== null && fov >= 60 && fov <= 85,
	);

	// 우선순위별 선택
	console.log("카메라 선택 디버깅:", {
		totalDevices: devices.length,
		qrSuitableDevices: qrSuitableDevices.length,
		rearQRSuitableDevices: rearQRSuitableDevices.length,
		standardFOVDevices: standardFOVDevices.length,
	});

	// 1순위: 후면 + 표준 FOV + QR 적합
	const rearStandardDevices = rearQRSuitableDevices.filter(({ device }) =>
		standardFOVDevices.some((std) => std.device.deviceId === device.deviceId),
	);

	if (rearStandardDevices.length > 0) {
		console.log(
			"선택된 카메라: 후면 표준 FOV",
			rearStandardDevices[0]?.device.label,
		);
		return rearStandardDevices[0]?.device.deviceId || "";
	}

	// 2순위: 후면 + QR 적합
	if (rearQRSuitableDevices.length > 0) {
		console.log(
			"선택된 카메라: 후면 QR 적합",
			rearQRSuitableDevices[0]?.device.label,
		);
		return rearQRSuitableDevices[0]?.device.deviceId || "";
	}

	// 3순위: 표준 FOV (전면 포함)
	if (standardFOVDevices.length > 0) {
		console.log("선택된 카메라: 표준 FOV", standardFOVDevices[0]?.device.label);
		return standardFOVDevices[0]?.device.deviceId || "";
	}

	// 4순위: QR 적합한 모든 카메라
	if (qrSuitableDevices.length > 0) {
		console.log("선택된 카메라: QR 적합", qrSuitableDevices[0]?.device.label);
		return qrSuitableDevices[0]?.device.deviceId || "";
	}

	// 최후: 첫 번째 사용 가능한 카메라 (광각이라도)
	if (devices.length > 0) {
		console.log("선택된 카메라: 기본 (광각일 수 있음)", devices[0]?.label);
		return devices[0]?.deviceId || "";
	}

	return "";
}

// ===== CAMERA MANAGEMENT =====
async function onCameraOn() {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		videoDevices = devices.filter((device) => device.kind === "videoinput");

		// Load saved camera preference
		const savedDeviceId = localStorage.getItem("preferredCameraId");

		if (
			savedDeviceId &&
			videoDevices.some((device) => device.deviceId === savedDeviceId)
		) {
			selectedDeviceId = savedDeviceId;
		} else {
			// Auto-select optimal camera
			selectedDeviceId = await getPreferredCamera(videoDevices);
			if (selectedDeviceId) {
				localStorage.setItem("preferredCameraId", selectedDeviceId);
			}
		}

		loading = false;
	} catch (error) {
		console.error("카메라 장치 가져오기 실패:", error);
		loading = false;
	}
}

function saveSelectedCamera() {
	if (selectedDeviceId) {
		localStorage.setItem("preferredCameraId", selectedDeviceId);
	}
}

function changeCamera() {
	saveSelectedCamera();
	window.location.reload();
}

// ===== PERMISSION HANDLING =====
async function requestPermission() {
	try {
		const constraints = {
			video: selectedDeviceId
				? { deviceId: { exact: selectedDeviceId } }
				: true,
		};

		const result = await navigator.mediaDevices.getUserMedia(constraints);
		for (const track of result.getTracks()) {
			track.stop();
		}
		permissionDenied = false;
		window.location.reload();
	} catch (error) {
		// Show guidance modal for enabling camera in browser settings
		showPermissionModal = true;
	}
}

onMount(() => {
	// Latest-draw data does not block camera initialization or the prerendered help content.
	const roundRequest = new AbortController();
	void fetch(resolve("/api/lotto-draws-recent.json"), {
		signal: roundRequest.signal,
	})
		.then((response) => (response.ok ? response.json() : null))
		.then((snapshot) => {
			if (Number.isInteger(snapshot?.latestRound) && snapshot.latestRound > 0) {
				latestRound = snapshot.latestRound;
			}
		})
		.catch(() => {});
	void refreshStoredScanResults({ notify: true, force: true });

	const handleFocus = () => {
		void refreshStoredScanResults();
	};
	const handleOnline = () => {
		void refreshStoredScanResults({ force: true });
	};
	const handleVisibilityChange = () => {
		if (document.visibilityState === "visible") {
			void refreshStoredScanResults();
		}
	};

	window.addEventListener("focus", handleFocus);
	window.addEventListener("online", handleOnline);
	document.addEventListener("visibilitychange", handleVisibilityChange);

	return () => {
		roundRequest.abort();
		activeRequest?.abort();
		window.removeEventListener("focus", handleFocus);
		window.removeEventListener("online", handleOnline);
		document.removeEventListener("visibilitychange", handleVisibilityChange);
	};
});
</script>

<MetaTags
	title="로또 QR 스캔 | QR 코드로 당첨 확인하고 스캔 내역 저장"
	description={pageDescription}
	canonical="https://645.live/qr-scan"
	keywords={["로또QR스캔", "로또당첨확인", "로또스캔", "QR코드스캔", "로또번호확인", "당첨조회", "로또체크", "645스캔"]}
	openGraph={{
		title: "로또 QR 스캔 | QR 코드로 당첨 확인",
		description: pageDescription,
		url: "https://645.live/qr-scan",
		type: "website",
		siteName: "645.live",
		images: [
			getGenericOgImage({
				title: "로또 QR 스캔",
				description: "QR로 내 번호를 확인하고, 실시간 스캔 현황을 함께 보세요.",
				alt: "로또 QR 코드 스캔",
			}),
		]
	}}
	twitter={{
		cardType: "summary_large_image",
		title: "로또 QR 스캔 | QR 코드로 당첨 확인",
		description: pageDescription,
		image: getGenericOgUrl({
			title: "로또 QR 스캔",
			description: "QR로 내 번호를 확인하고, 실시간 스캔 현황을 함께 보세요.",
		}),
		imageAlt: "로또 QR 코드 스캔"
	}}
	additionalMetaTags={[
		{
			name: "author",
			content: "645.live"
		}
	]}
/>

<JsonLd
	schema={{
		"@context": "https://schema.org",
		"@type": "HowTo",
		name: "로또 QR 스캔으로 당첨 확인하는 방법",
		description: "카메라 권한 허용부터 QR 인식, 저장된 스캔 결과 확인까지 로또 QR 스캔 사용 방법을 안내합니다.",
		image: getGenericOgUrl({
			title: "로또 QR 스캔",
			description: "QR로 내 번호를 확인하고, 실시간 스캔 현황을 함께 보세요.",
		}),
		totalTime: "PT1M",
		step: [
			{
				"@type": "HowToStep",
				name: "카메라 권한 허용",
				text: "브라우저에서 카메라 접근 권한을 허용하고 QR이 잘 보이도록 화면을 준비합니다.",
			},
			{
				"@type": "HowToStep",
				name: "QR 코드 인식 또는 이미지 업로드",
				text: "로또 용지의 QR 코드를 카메라에 비추거나 이미지 파일을 업로드해 코드를 읽습니다.",
			},
			{
				"@type": "HowToStep",
				name: "당첨 확인 및 저장된 결과 확인",
				text: "당첨 여부와 회차 정보가 표시되면 스캔 내역에 저장된 결과를 다시 확인할 수 있습니다.",
			},
		],
	}}
/>

<!-- Toaster 컴포넌트 추가 -->
<Toaster 
	position="bottom-center" 
	richColors 
	closeButton 
	duration={5000}
	offset={{ top: 24, left: 24, right: 24, bottom: 104 }}
	mobileOffset={{ top: 16, left: 16, right: 16, bottom: 112 }}
	toastOptions={{
		style: 'background: var(--color-base-100); color: var(--color-base-content); border: 1px solid var(--color-base-300);',
		classes: {
			toast: 'shadow-lg',
			title: 'font-medium',
			description: 'text-sm opacity-75'
		}
	}}
/>



<div class="content-page qr-page">
	<header class="page-header"><div><h1>QR로 당첨 확인</h1><p>용지의 QR을 비추거나 사진을 선택하세요.</p></div><button class="btn btn-outline" onclick={() => historyModal?.openHistoryModal?.()}>스캔 내역 보기</button></header>
	<div class="scanner-workspace" data-nosnippet>
		<section aria-labelledby="camera-heading">
			<h2 id="camera-heading" class="sr-only">카메라로 QR 확인</h2>
			<div class="camera-surface">
				{#if permissionDenied}
					<div class="camera-message"><h3>카메라 사용 권한이 필요해요</h3><p>브라우저에서 카메라를 허용하거나 아래에서 용지 사진을 선택해주세요.</p><button class="btn btn-primary" onclick={requestPermission}>카메라 권한 다시 요청</button></div>
				{:else if error}
					<div class="camera-message"><h3>카메라를 사용할 수 없어요</h3><p>{error}</p><p>아래에서 사진을 선택해 QR을 확인할 수 있습니다.</p></div>
				{:else if showCameraStream}
					<BarqodeStream {onDetect} {onCameraOn} {onError} {track} formats={["qr_code"]} constraints={selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}} />
					{#if loading}<div class="camera-message camera-loading" role="status"><span class="loading loading-spinner loading-md"></span><p>카메라 연결 중…<br />브라우저의 카메라 권한을 허용해주세요.</p></div>{/if}
				{/if}
			</div>
			{#if hasCameraSelection}<div class="camera-selector"><label for="camera-select">사용할 카메라</label><select id="camera-select" class="select" bind:value={selectedDeviceId} onchange={changeCamera}>{#each videoDevices as device (device.deviceId)}<option value={device.deviceId}>{device.label || `카메라 ${videoDevices.indexOf(device) + 1}`}</option>{/each}</select><p>잘 인식되지 않으면 광각 대신 일반 후면 카메라를 선택하세요.</p></div>{/if}
			{#if isSubmitting}<p class="processing-message" role="status"><span class="loading loading-spinner loading-xs"></span>QR을 읽고 당첨 결과를 확인하는 중…</p>{/if}
			<div class="photo-dropzone" class:dragover><BarqodeDropzone onDetect={onDetectUploaded} {onDragover}><div><strong>사진에서 QR 확인</strong><p>사진을 선택하거나 이곳에 끌어다 놓으세요.</p></div></BarqodeDropzone></div>
			<p class="camera-hint">QR이 선명하게 보이도록 한 장씩 비춰주세요.</p>
		</section>
		<section class="scan-result" aria-labelledby="scan-result-heading" aria-busy={isSubmitting}>
			<div class="section-heading"><h2 id="scan-result-heading">확인 결과</h2>{#if latestScan?.round}<span class="result-round">제{latestScan.round}회</span>{/if}</div>
			{#if scanError}<p class="scan-error" role="alert">{scanError}</p>{/if}
			{#if resultNotice}<p class="result-note" role="status">{resultNotice}</p>{/if}
			{#if latestScan}
				<p class="result-status" class:winning={latestScan.resultStatus === "winner"} aria-live="polite">{resultLabel}</p><p class="result-summary">{latestScan.summary}</p>
				{#if latestScan.resultStatus === "unreleased"}<p class="result-note">발표 후 다시 방문하면 저장된 티켓의 결과를 확인할 수 있어요.</p>{:else if latestScan.resultStatus === "unknown"}<p class="result-note">현재 당첨 결과를 확인하지 못했어요. 잠시 후 스캔 내역에서 다시 확인해주세요.</p>{/if}
				<ol class="scanned-games">{#each latestGames as numbers, index (`${latestScan.ticketHash}-${index}`)}{@const gameResult = latestScan.winningResults[index]}<li><div class="game-heading"><span>{index + 1}게임</span>{#if gameResult}<strong>{gameResult.isWinner ? gameResult.grade : `${gameResult.matchCount}개 일치`}{gameResult.bonusMatch ? " · 보너스" : ""}</strong>{/if}</div><div class="scanned-balls">{#each numbers as number (number)}<SimpleBall {number} size="sm" />{/each}</div></li>{/each}</ol>
				<div class="result-actions"><a class="btn btn-primary" href={resolve(`/?scanRound=${latestScan.round}#live-scans`)} onclick={() => trackEvent("qr_scan_live_view", { entry_point: entryPoint })}>이 회차 실시간 현황 보기 →</a><button class="btn btn-outline" onclick={() => historyModal?.openHistoryModal?.()}>저장된 스캔 내역 보기</button></div>
			{:else}<div class="result-empty"><div class="result-placeholder" aria-hidden="true">6 / 45</div><p>QR을 확인하면 회차와 게임별 결과가 여기에 표시됩니다.</p><ol><li>카메라에 용지 QR을 비추거나 사진을 선택하세요.</li><li>당첨 결과를 확인하고 스캔 내역에서 다시 볼 수 있어요.</li></ol></div>{/if}
		</section>
	</div>
	<details class="scan-statistics" bind:open={showScanStats}><summary><span>회차별 QR 스캔 집계</span><span class="summary-note">사이트 등록 데이터</span></summary><p class="section-note">이 사이트에 등록된 스캔의 번호별 집계입니다. 내 티켓의 당첨 결과와는 별개입니다.</p>{#if showScanStats}<ScanStatusGrid bind:this={scanStatusGrid} initialRound={currentRound || calculateExpectedLatestRound()} {latestRound} enableNavigation={false} showHeader={true} gridColumns={{ mobile: 5, tablet: 9, desktop: 9, large: 9 }} gridGap="gap-3" />{/if}</details>
	<section class="qr-guide" aria-labelledby="qr-guide-heading"><h2 id="qr-guide-heading">QR 확인 도움말</h2><div>{#each qrScanFaqs as item (item.question)}<details><summary>{item.question}</summary><p>{item.answer}</p></details>{/each}</div><a href={resolve("/generator")} class="next-link">원하는 조건으로 번호 만들기 <span aria-hidden="true">→</span></a></section>
</div>

<style>
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.page-header > div { min-width: 0; flex: 1 1 20rem; }
.page-header .btn, .camera-selector .select { min-height: 2.75rem; }
:global([data-sonner-toaster]) { z-index: 80 !important; }
.result-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.25rem; }
.result-actions .btn { min-height: 48px; }
.scanner-workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--section-space); }
.scanner-workspace > section { min-width: 0; }
.camera-surface { position: relative; aspect-ratio: 1; background: var(--color-base-200); overflow: hidden; border-radius: 1rem; isolation: isolate; }
.camera-surface :global(video) { width: 100%; height: 100%; object-fit: cover; }
.camera-message { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 1rem; height: 100%; padding: 1.25rem; color: var(--color-base-content); }
.camera-loading { position: absolute; inset: 0; pointer-events: none; background: var(--color-base-200); }
.camera-message h3 { font-size: 1rem; font-weight: 650; }
.camera-message p { font-size: .875rem; line-height: 1.7; max-width: 25rem; color: color-mix(in oklch, var(--color-base-content) 70%, transparent); }
.camera-selector { margin-top: 1rem; }
.camera-selector label { display: block; margin-bottom: .4rem; font-size: .8rem; font-weight: 600; }
.camera-selector .select { width: 100%; min-width: 0; }
.camera-selector p, .camera-hint { font-size: .75rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); margin-top: .5rem; line-height: 1.7; }
.photo-dropzone { margin-top: .85rem; padding: 1.1rem; border: 1px dashed var(--color-base-300); border-radius: .75rem; text-align: center; cursor: pointer; transition: border-color .15s, background .15s; }
.photo-dropzone:hover, .photo-dropzone.dragover { border-color: var(--color-primary); background: color-mix(in oklch, var(--color-primary) 5%, transparent); }
.photo-dropzone strong { font-size: .9rem; font-weight: 650; color: var(--color-primary); }
.photo-dropzone p { margin-top: .4rem; font-size: .8rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }
.processing-message { display: flex; align-items: center; gap: .65rem; font-size: .8rem; background: var(--color-base-200); border-radius: .5rem; padding: .8rem; margin-top: 1rem; }
.scan-result { padding: 1.5rem 0; border-block: 1px solid var(--color-base-300); }
.result-round { font-size: .85rem; font-weight: 650; }
.result-status { font-size: 1.8rem; font-weight: 750; margin-top: 1.25rem; letter-spacing: -.04em; }
.result-status.winning { color: var(--color-success-content); }
.scan-error { margin-top: 1rem; padding: .85rem; background: var(--color-error); color: var(--color-error-content); border-radius: .5rem; font-size: .875rem; line-height: 1.7; }
.result-summary, .result-note { margin-top: .5rem; font-size: .85rem; line-height: 1.7; color: color-mix(in oklch, var(--color-base-content) 70%, transparent); }
.scanned-games { list-style: none; padding: 0; margin-top: 1.25rem; }
.scanned-games li { padding-block: 1rem; border-bottom: 1px solid var(--color-base-300); }
.game-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; font-size: .75rem; margin-bottom: .6rem; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); }
.game-heading strong { color: var(--color-base-content); font-weight: 600; }
.scanned-balls { display: flex; gap: clamp(.4rem, 1.5vw, .6rem); }
.result-empty { padding: 1.5rem 0 .5rem; }
.result-placeholder { color: color-mix(in oklch, var(--color-base-content) 18%, transparent); font-size: 2.75rem; font-weight: 750; letter-spacing: -.06em; }
.result-empty p, .result-empty ol { font-size: .875rem; line-height: 1.8; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); margin-top: .75rem; }
.result-empty ol { list-style: decimal; padding-left: 1.15rem; }
.result-empty li + li { margin-top: .5rem; }
.scan-statistics { margin-top: 1.5rem; border-block: 1px solid var(--color-base-300); }
.scan-statistics > summary { display: flex; flex-wrap: wrap; gap: .5rem 1rem; align-items: center; padding-block: 1.1rem; cursor: pointer; font-weight: 650; font-size: .9rem; }
.scan-statistics > summary::after { content: "+"; margin-left: auto; font-size: 1.2rem; font-weight: 400; }
.scan-statistics[open] > summary::after { content: "−"; }
.summary-note { font-size: .75rem; font-weight: 400; color: color-mix(in oklch, var(--color-base-content) 60%, transparent); }
.section-note { font-size: .8rem; line-height: 1.7; color: color-mix(in oklch, var(--color-base-content) 65%, transparent); padding-bottom: 1rem; }
.qr-guide { margin-top: var(--section-space); }
.qr-guide h2 { font-size: var(--section-title-size); font-weight: 700; margin-bottom: 1rem; }
.qr-guide details { border-bottom: 1px solid var(--color-base-300); }
.qr-guide summary { padding: 1rem 0; font-size: .9rem; font-weight: 550; cursor: pointer; }
.qr-guide details p { max-width: var(--reading-width); font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); color: color-mix(in oklch, var(--color-base-content) 65%, transparent); padding-bottom: 1rem; }
.next-link { display: inline-flex; gap: 1rem; align-items: center; min-height: 44px; color: var(--color-primary); font-size: .9rem; font-weight: 600; margin-top: 1rem; }
@media(min-width: 768px) { .scanner-workspace { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .scan-result { padding: 0 0 0 1.5rem; border-block: 0; border-left: 1px solid var(--color-base-300); } .result-empty { padding-top: 2rem; } }
@media(min-width: 1024px) { .scan-result { padding-left: 2rem; } }
@media(prefers-reduced-motion: reduce) { .photo-dropzone { transition: none; } }
</style>

{#if showPermissionModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg">카메라 권한 허용 안내</h3>
      <p class="py-4">브라우저 설정에서 이 사이트에 대한 카메라 접근 권한을 허용해 주세요.<br>
      Safari: Safari 메뉴 → 설정 → 웹 사이트 → 카메라에서 허용<br>
      (또는 Chrome/Firefox의 경우 권한 재설정 후 다시 시도해 주세요)</p>
      <div class="modal-action">
        <button class="btn" onclick={() => showPermissionModal = false}>닫기</button>
      </div>
    </div>
  </div>
{/if}

<!-- QR Scan History Component -->
{#key auth.session?.user.id ?? auth.status}
<QRScanHistory bind:this={historyModal} floating={false} />
{/key}
