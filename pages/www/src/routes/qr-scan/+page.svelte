<!-- @ts-nocheck -->
<script lang="ts">
// @ts-nocheck
import { browser } from "$app/environment";
import { enhance } from "$app/forms";
import { env } from "$env/dynamic/public";
import QRScanHistory from "$lib/components/qr-scan/QRScanHistory.svelte";
import ScanStatusGrid from "$lib/modules/lotto/components/ScanStatusGrid.svelte";
import { syncMemberScanHistory } from "$lib/utils/member-scan-sync.js";
import {
	calculateExpectedLatestRound,
	getLatestLottoRoundFromAPI,
	getLottoNumbersFromAPI,
} from "$lib/utils/lotto-common.js";
import { parseLottoQR } from "$lib/utils/lotto-parser.js";
import {
	deriveScanResultStatus,
	generateScanSummary,
	qrScanHistory,
} from "$lib/utils/qr-scan-history.js";
import {
	type BarcodeFormat,
	BarqodeDropzone,
	BarqodeStream,
	type DetectedBarcode,
} from "barqode";
import { MetaTags } from "svelte-meta-tags";
import { Toaster, toast } from "svelte-sonner";
import type { ActionData, PageData } from "./$types";

// Props
const { data, form }: { data: PageData; form: ActionData } = $props();

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
let cameraFOVs = $state<Map<string, number | null>>(new Map());

// Detection Results
let lastDetected = $state("");
let isSubmittingForm = $state(false);

// Form element reference for programmatic submission
let scanForm: HTMLFormElement;
let qrDataInput: HTMLInputElement;

// Scan status grid reference for round updates
let scanStatusGrid = $state<ScanStatusGrid>();
let historyModal = $state();
let currentRound = $state(0); // QR 스캔 후에 실제 회차로 설정

// ===== LOTTO WINNING CHECK UTILITIES =====
interface WinningResult {
	isWinner: boolean;
	grade: string;
	matchCount: number;
	bonusMatch: boolean;
	prize: string;
	message: string;
}

/**
 * 로또 당첨 등급 확인
 */
function checkLottoWinning(
	userNumbers: number[],
	winningNumbers: number[],
	bonusNumber: number,
	firstPrizeAmount?: number,
): WinningResult {
	const matchCount = userNumbers.filter((num) =>
		winningNumbers.includes(num),
	).length;
	const bonusMatch = userNumbers.includes(bonusNumber);

	let grade = "";
	let prize = "";
	let message = "";
	let hasWin = false;

	if (matchCount === 6) {
		grade = "1등";
		prize = firstPrizeAmount ? `${firstPrizeAmount.toLocaleString()}원` : "";
		message = "🎉🎉🎉 1등 당첨!!! 대박!!! 🎉🎉🎉";
		hasWin = true;
	} else if (matchCount === 5 && bonusMatch) {
		grade = "2등";
		prize = "";
		message = "🎉🎉 2등 당첨!! 축하합니다! 🎉🎉";
		hasWin = true;
	} else if (matchCount === 5) {
		grade = "3등";
		prize = "";
		message = "🎉 3등 당첨! 축하합니다! 🎉";
		hasWin = true;
	} else if (matchCount === 4) {
		grade = "4등";
		prize = "";
		message = "🎊 4등 당첨! 🎊";
		hasWin = true;
	} else if (matchCount === 3) {
		grade = "5등";
		prize = "";
		message = "🎈 5등 당첨! 🎈";
		hasWin = true;
	}

	return {
		isWinner: hasWin,
		grade,
		matchCount,
		bonusMatch,
		prize,
		message,
	};
}

/**
 * QR 코드의 게임들을 최신 당첨 번호와 비교
 */
async function checkQRWinning(qrData: string): Promise<{
	isWinner: boolean;
	winningResults: WinningResult[];
	qrRound: number;
	isUnreleased?: boolean;
} | null> {
	try {
		// QR 코드 파싱하여 회차 정보 추출
		const games = parseLottoQR(qrData);
		if (!games || games.length === 0) {
			return null;
		}

		const qrRound = games[0].round;
		if (!qrRound) {
			return null;
		}

		// QR 회차의 당첨 번호 가져오기
		const winningData = await getLottoNumbersFromAPI(qrRound);
		if (!winningData) {
			console.error(`${qrRound}회차 당첨 번호 정보를 가져올 수 없습니다`);
			// 당첨 번호를 가져올 수 없으면 미발표 회차로 간주
			return {
				isWinner: false,
				winningResults: [],
				qrRound: qrRound,
				isUnreleased: true,
			};
		}

		// 당첨 번호가 모두 0이면 아직 발표되지 않은 회차
		if (
			winningData.drwtNo1 === 0 &&
			winningData.drwtNo2 === 0 &&
			winningData.drwtNo3 === 0
		) {
			return {
				isWinner: false,
				winningResults: [],
				qrRound: qrRound,
				isUnreleased: true,
			};
		}

		const winningNumbers = [
			winningData.drwtNo1,
			winningData.drwtNo2,
			winningData.drwtNo3,
			winningData.drwtNo4,
			winningData.drwtNo5,
			winningData.drwtNo6,
		];
		const bonusNumber = winningData.bnusNo;

		// 각 게임에 대해 당첨 확인
		const winningResults: WinningResult[] = [];
		let hasWinner = false;

		for (const game of games) {
			const result = checkLottoWinning(
				game.numbers,
				winningNumbers,
				bonusNumber,
				winningData.firstWinamnt,
			);
			winningResults.push(result);
			if (result.isWinner) {
				hasWinner = true;
			}
		}

		return {
			isWinner: hasWinner,
			winningResults,
			qrRound: qrRound,
		};
	} catch (error) {
		console.error("당첨 확인 중 오류:", error);
		return null;
	}
}

// ===== DERIVED STATES =====
let deviceInfos = $derived(
	videoDevices.map(
		(device) =>
			`${device.kind}: ${device.label || "Unknown"} (ID: ${device.deviceId.substring(0, 8)}...)`,
	),
);

let hasCameraSelection = $derived(
	videoDevices.length > 1 && !permissionDenied && !error,
);

let showCameraStream = $derived(!permissionDenied && !error);

let selectedCameraLabel = $derived(() => {
	const device = videoDevices.find((d) => d.deviceId === selectedDeviceId);
	if (!device) return "";

	const deviceIndex = videoDevices.indexOf(device) + 1;
	const label = device.label || `카메라 ${deviceIndex}`;
	const fov = cameraFOVs.get(device.deviceId);
	return fov !== null && fov !== undefined
		? `${label} (FOV: ${Math.round(fov)}°)`
		: label;
});

// ===== BARCODE DETECTION HANDLERS =====
async function onDetect(detectedCodes: DetectedBarcode[]) {
	if (detectedCodes.length > 0) {
		lastDetected = detectedCodes[0].rawValue;

		// 서버 액션을 통해 처리
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

		// 서버 액션을 통해 처리
		await submitQRData(qrData);
	}
}

// 현재 처리 중인 QR 데이터 추적 (중복 제출 방지)
let processingQRData = $state<string | null>(null);

// 최근 스캔한 QR 데이터들 (5초 쿨다운용)
let recentScannedQRs = $state(new Set<string>());

// QR 쿨다운 해제 함수
function clearQRCooldown(qrData: string) {
	setTimeout(() => {
		recentScannedQRs.delete(qrData);
		recentScannedQRs = new Set(recentScannedQRs); // 반응성을 위한 재할당
	}, 5000); // 5초 후 쿨다운 해제
}

// QR 데이터를 서버 액션으로 제출하는 함수
async function submitQRData(qrData: string) {
	try {
		// 이미 같은 QR 데이터를 처리 중인지 확인
		if (processingQRData === qrData) {
			console.log("이미 처리 중인 QR 데이터:", qrData);
			return;
		}

		// 5초 쿨다운 체크
		if (recentScannedQRs.has(qrData)) {
			toast.info("ℹ️ 잠시만 기다려주세요", {
				description: "같은 QR 코드는 5초 후에 다시 스캔할 수 있습니다.",
				duration: 3000,
			});
			return;
		}

		// 히스토리 기반 중복 스캔 확인 (브라우저 환경에서만)
		if (browser) {
			const isDupe = await qrScanHistory.isDuplicate(qrData);
			if (isDupe) {
				toast.info("ℹ️ 이미 스캔한 로또 용지입니다", {
					description: "이 로또 용지는 이미 스캔 내역에 저장되어 있습니다.",
					duration: 4000,
				});

				// 쿨다운 추가 (중복이지만 5초 후 다시 시도 가능)
				recentScannedQRs.add(qrData);
				recentScannedQRs = new Set(recentScannedQRs);
				clearQRCooldown(qrData);
				return;
			}
		}

		if (!scanForm || !qrDataInput) {
			console.error("Form elements not found");
			toast.error("❌ 폼 요소를 찾을 수 없습니다", {
				description: "페이지를 새로고침하고 다시 시도해주세요.",
			});
			return;
		}

		// 처리 시작 표시
		processingQRData = qrData;

		// 성공적인 스캔 시도 시 쿨다운 추가
		recentScannedQRs.add(qrData);
		recentScannedQRs = new Set(recentScannedQRs);
		clearQRCooldown(qrData);

		// 숨겨진 input에 QR 데이터 설정
		qrDataInput.value = qrData;

		// 폼 제출
		isSubmittingForm = true;
		scanForm.requestSubmit();
	} catch (error) {
		console.error("Form submission error:", error);
		toast.error("❌ 폼 제출 실패", {
			description: "폼 제출 중 오류가 발생했습니다.",
		});
		isSubmittingForm = false;
		processingQRData = null;
	}
}

// Form 결과 처리
let lastProcessedFormId: string | null = null;

$effect(() => {
	if (form) {
		// 중복 처리 방지 (form ID로 체크)
		const currentFormId = `${form.success ? "success" : "error"}-${JSON.stringify(form.data || form.error)}`;
		if (lastProcessedFormId === currentFormId) {
			return;
		}
		lastProcessedFormId = currentFormId;

		isSubmittingForm = false;
		processingQRData = null; // 처리 완료 표시

		if (form.success) {
			// Process successful form submission

			const qrData = form.data?.qrData;
			const scanRecord = form.data?.scanRecord;
			const memberSyncState = form.data?.memberSyncState;
			const alreadyScanned = form.data?.alreadyScanned === true;

			const resolvedRound = scanRecord?.round;
			if (resolvedRound) {
				if (currentRound === 0 || resolvedRound !== currentRound) {
					console.log(`QR 회차 설정: ${currentRound} → ${resolvedRound}`);
					currentRound = resolvedRound;
					if (scanStatusGrid) {
						scanStatusGrid.updateRound(resolvedRound);
					}
				}
			}

			if (browser && qrData && scanRecord) {
				void (async () => {
					try {
						await qrScanHistory.upsertScan({
							...scanRecord,
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
						if (
							error instanceof Error &&
							error.message.includes("이미 스캔한")
						) {
							console.log("중복 스캔 방지됨:", qrData);
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
						description: alreadyScanned
							? `${scanRecord.round}회차 기존 티켓을 다시 확인했습니다. 발표 후 상태가 바뀌면 자동으로 갱신됩니다.`
							: `${scanRecord.round}회차 ${scanRecord.gamesCount}개 게임 저장됨. 로그인 후 당첨 발표 시 자동으로 알림을 받을 수 있습니다.`,
						duration: 6000,
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

					const prizeText = highestGrade.prize
						? ` (${highestGrade.prize})`
						: "";

					toast.success(highestGrade.message, {
						description: `${scanRecord.round}회차 ${alreadyScanned ? "기존 티켓 재확인" : "당첨 확인"} - ${highestGrade.grade}${prizeText} | 총 ${scanRecord.gamesCount}개 게임 중 ${winners.length}개 당첨`,
						duration:
							highestGrade.grade === "1등" || highestGrade.grade === "2등"
								? 15000
								: 10000,
						richColors: true,
						...(highestGrade.grade === "1등" ||
						highestGrade.grade === "2등"
							? {
									style:
										"background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; border: 2px solid #d97706;",
								}
							: {}),
					});

					winners.forEach((winner, index) => {
						setTimeout(
							() => {
								const winnerPrizeText = winner.prize
									? ` (${winner.prize})`
									: "";
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
						description: `${scanRecord.round}회차 ${alreadyScanned ? "기존 티켓 재확인" : "당첨 확인 완료"} - 당첨 없음 | ${scanRecord.gamesCount}개 게임 처리됨`,
						duration: 5000,
					});
				}
			} else {
				toast.success("✅ QR 스캔 성공!", {
					description: `${form.data?.gamesCount}개 게임 처리됨`,
					duration: 5000,
				});
			}
		} else if (form.error) {
			// 에러 메시지에 따라 다른 토스트 표시
			if (form.error.includes("이미 스캔") || "isDuplicate" in form) {
				toast.info("ℹ️ 이미 스캔한 로또 용지입니다", {
					description: "중복된 QR 코드는 다시 처리되지 않습니다.",
					duration: 4000,
				});
			} else {
				toast.error("❌ 스캔 실패", {
					description: form.error,
					duration: 6000,
				});
			}
		}
	}
});

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
		cameraFOVs.set(device.deviceId, fov);
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
</script>

<MetaTags
	title="로또 QR 코드 스캔 - 당첨 확인 및 번호 기록"
	description="📱 로또 QR 스캔으로 즉시 당첨 확인! 카메라만 갖다대면 당첨여부가 바로 나와요. 번호 기록까지 자동으로!"
	canonical="https://645.live/qr-scan"
	keywords={["로또QR스캔", "로또당첨확인", "로또스캔", "QR코드스캔", "로또번호확인", "당첨조회", "로또체크", "645스캔"]}
	openGraph={{
		title: "로또 QR 코드 스캔 - 당첨 확인",
		description: "📱 로또 QR 스캔으로 즉시 당첨 확인! 카메라만 갖다대면 당첨여부가 바로 나와요.",
		url: "https://645.live/qr-scan",
		type: "website",
		siteName: "645.live",
		images: [
			{
				url: `https://645.live/og?title=${encodeURIComponent('로또 QR 스캔')}&description=${encodeURIComponent('즉시 당첨 확인')}`,
				width: 1200,
				height: 630,
				alt: "로또 QR 코드 스캔"
			}
		]
	}}
	twitter={{
		cardType: "summary_large_image",
		title: "로또 QR 코드 스캔 - 당첨 확인",
		description: "📱 로또 QR 스캔으로 즉시 당첨 확인! 카메라만 갖다대면 당첨여부가 바로 나와요.",
		image: `https://645.live/og?title=${encodeURIComponent('로또 QR 스캔')}&description=${encodeURIComponent('즉시 당첨 확인')}`,
		imageAlt: "로또 QR 코드 스캔"
	}}
	additionalMetaTags={[
		{
			name: "author",
			content: "645.live"
		}
	]}
/>

<!-- Toaster 컴포넌트 추가 -->
<Toaster 
	position="top-center" 
	richColors 
	closeButton 
	duration={5000}
	toastOptions={{
		style: 'background: white; color: black; border: 1px solid #e5e7eb;',
		classes: {
			toast: 'shadow-lg',
			title: 'font-medium',
			description: 'text-sm opacity-75'
		}
	}}
/>

<!-- QR 데이터를 서버 액션으로 전송하는 폼 -->
<form 
	bind:this={scanForm}
	method="POST" 
	action="?/scan" 
	use:enhance={() => {
		return async ({ update }) => {
			await update();
		};
	}}
	class="hidden"
>
	<input bind:this={qrDataInput} type="hidden" name="qrData" />
</form>

<!-- Page Header -->
<div class="w-full max-w-7xl mx-auto mt-4 min-sm:px-4 mb-8">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="text-2xl lg:text-3xl font-bold text-base-content mb-2">
				로또 QR 코드 스캔
			</h1>
			<p class="text-base-content/70 text-xs">
				카메라로 QR 코드를 스캔하여 즉시 당첨 확인 및 번호 기록
			</p>
		</div>

		<button
			class="btn btn-outline btn-sm sm:btn-md gap-2 self-start sm:self-auto rounded-full border-base-300 bg-base-100/90 shadow-sm hover:shadow-md"
			type="button"
			onclick={() => historyModal?.openHistoryModal?.()}
			aria-label="스캔 내역 모달 열기"
		>
			<svg
				class="h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6"
				></path>
			</svg>
			<span>스캔 내역 보기</span>
		</button>
	</div>
</div>

<!-- Desktop: Two column layout, Mobile: Single column with QR scanner on top -->
<div class="w-full max-w-7xl mx-auto">
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- QR Scanner Column (Left on desktop, Top on mobile) -->
		<div class="order-1 lg:order-1">
			<div class="w-full max-w-md mx-auto lg:max-w-none min-sm:px-4">
	<div class="aspect-square my-4">
		{#if permissionDenied}
			<div class="h-full flex flex-col items-center justify-center text-center p-6 bg-base-200 rounded-lg">
				<div class="text-red-500 mb-4">
					<svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"></path>
					</svg>
					<p class="text-sm">카메라 접근이 거부되었습니다</p>
				</div>
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					onclick={requestPermission}
				>
					카메라 권한 다시 요청하기
				</button>
			</div>
		{:else if error}
			<div class="h-full flex items-center justify-center text-center p-6 bg-red-50 rounded-lg">
				<div class="text-red-600">
					<p class="text-sm">{error}</p>
				</div>
			</div>
		{:else if showCameraStream}
			<BarqodeStream 
				{onDetect} 
				{onCameraOn} 
				{onError} 
				{track}
				formats={["qr_code"]}
				constraints={selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}}
			>
				{#if loading}
					<div class="h-full flex items-center justify-center bg-gray-900 rounded-lg">
						<div class="text-white text-center">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
							<p class="text-sm">카메라 로딩 중...</p>
						</div>
					</div>
				{/if}
			</BarqodeStream>
		{/if}
	</div>
	
	{#if hasCameraSelection}
		<div class="mb-4">
			<label for="camera-select" class="block text-sm font-medium text-base-content mb-2">
				카메라 선택
				<span class="text-xs text-base-content/60 font-normal ml-1">
					(일반 카메라 추천, 광각은 QR 스캔 어려움)
				</span>
			</label>
			<select 
				id="camera-select"
				bind:value={selectedDeviceId} 
				onchange={changeCamera} 
				class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			>
				{#each videoDevices as device (device.deviceId)}
					{@const fov = cameraFOVs.get(device.deviceId)}
					{@const isWideAngle = 
						device.label.toLowerCase().includes("wide") ||
						device.label.toLowerCase().includes("ultra") ||
						device.label.toLowerCase().includes("광각") ||
						device.label.toLowerCase().includes("0.5x") ||
						device.label.toLowerCase().includes("0.6x") ||
						(fov !== null && fov >= 95)
					}
					<option value={device.deviceId}>
						{device.label || `카메라 ${videoDevices.indexOf(device) + 1}`}
						{#if fov !== null && fov !== undefined}
							(FOV: {Math.round(fov)}°)
						{/if}
						{#if isWideAngle}
							⚠️ QR 스캔 부적합
						{/if}
					</option>
				{/each}
			</select>
		</div>
	{/if}


	{#if isSubmittingForm}
		<div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
			<p class="text-sm text-yellow-700 font-medium">⏳ QR 데이터 처리 및 당첨 확인 중...</p>
		</div>
	{/if}

	<div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors {dragover ? 'border-blue-500 bg-blue-50' : ''}">
		<BarqodeDropzone onDetect={onDetectUploaded} {onDragover}>
			<div class="text-base-content/60">
				<svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
				</svg>
				<p class="text-sm">이미지 파일을 드래그하거나 클릭하여 업로드</p>
			</div>
		</BarqodeDropzone>
	</div>
			</div>
		</div>

		<!-- Scan Status Grid Column (Right on desktop, Bottom on mobile) -->
		<div class="order-2 lg:order-2">
			<div class="mb-6">
				<h2 class="text-xl font-bold text-base-content mb-4 min-sm:px-4">
					회차별 스캔 현황
				</h2>
				<ScanStatusGrid 
					bind:this={scanStatusGrid}
					initialRound={currentRound || calculateExpectedLatestRound()}
					latestRound={(data as any).latestRound}
					enableNavigation={false}
					showHeader={true}
					{...{
						gridColumns: {
							mobile: 5,
							tablet: 5,
							desktop: 5,
							large: 5
						},
						gridGap: "gap-3",
						incrementEffectConfig: {
							show: true,
							message: "+1",
							color: "text-green-600 dark:text-green-400"
						}
					}}
				/>
			</div>
		</div>
	</div>
</div>

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
<QRScanHistory bind:this={historyModal} />
