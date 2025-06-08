<script lang="ts">
import {
	type BarcodeFormat,
	BarqodeDropzone,
	BarqodeStream,
	type DetectedBarcode,
} from "barqode";

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

// Camera States
let videoDevices = $state<MediaDeviceInfo[]>([]);
let selectedDeviceId = $state("");
let cameraFOVs = $state<Map<string, number>>(new Map());

// Detection Results
let lastDetected = $state("");
let uploaded = $state("");

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
	return fov ? `${label} (FOV: ${Math.round(fov)}°)` : label;
});

// ===== BARCODE DETECTION HANDLERS =====
function onDetect(detectedCodes: DetectedBarcode[]) {
	if (detectedCodes.length > 0) {
		lastDetected = detectedCodes[0].rawValue;
		console.log(detectedCodes.map((detectedCode) => detectedCode.rawValue));
	}
}

function onDetectUploaded(detectedCodes: DetectedBarcode[]) {
	uploaded = detectedCodes
		.map((detectedCode) => detectedCode.rawValue)
		.join(", ");
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
async function calculateFOV(deviceId: string): Promise<number> {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: {
				deviceId: { exact: deviceId },
				width: { ideal: 1920 },
				height: { ideal: 1080 },
			},
		});

		const track = stream.getVideoTracks()[0];
		const capabilities = track.getCapabilities?.() as
			| ExtendedMediaTrackCapabilities
			| undefined;
		const settings = track.getSettings() as ExtendedMediaTrackSettings;

		// Clean up stream
		track.stop();

		if (capabilities && settings && settings.width && settings.height) {
			// Try to get FOV from capabilities if available
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
				return fov;
			}

			// Fallback: estimate based on resolution ratio
			const aspectRatio = settings.width / settings.height;
			if (aspectRatio > 1.5) {
				return 100; // Likely wide-angle
			}
			if (aspectRatio < 1.2) {
				return 70; // Likely standard
			}
		}

		// Default fallback
		return 80;
	} catch (error) {
		console.warn(`FOV calculation failed for device ${deviceId}:`, error);
		return 80; // Default FOV
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

	// Camera selection priority logic
	const rearCameras = deviceFOVs.filter(
		({ device }) =>
			device.label.toLowerCase().includes("back") ||
			device.label.toLowerCase().includes("rear") ||
			device.label.toLowerCase().includes("환경"),
	);

	const nonWideDevices = deviceFOVs.filter(
		({ device, fov }) =>
			!device.label.toLowerCase().includes("wide") &&
			!device.label.toLowerCase().includes("ultra") &&
			!device.label.toLowerCase().includes("광각") &&
			fov <= 90,
	);

	const standardFOVDevices = deviceFOVs.filter(
		({ fov }) => fov >= 60 && fov <= 85,
	);

	// Priority selection
	const rearStandardDevices = rearCameras.filter(({ device }) =>
		standardFOVDevices.some((std) => std.device.deviceId === device.deviceId),
	);

	if (rearStandardDevices.length > 0) {
		return rearStandardDevices[0].device.deviceId;
	}

	const rearNonWideDevices = rearCameras.filter(({ device }) =>
		nonWideDevices.some((nw) => nw.device.deviceId === device.deviceId),
	);

	if (rearNonWideDevices.length > 0) {
		return rearNonWideDevices[0].device.deviceId;
	}

	if (standardFOVDevices.length > 0) {
		return standardFOVDevices[0].device.deviceId;
	}

	if (rearCameras.length > 0) {
		return rearCameras[0].device.deviceId;
	}

	if (nonWideDevices.length > 0) {
		return nonWideDevices[0].device.deviceId;
	}

	return devices.length > 0 ? devices[0].deviceId : "";
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
		console.log("Permission request failed:", error);
	}
}
</script>
 
<div class="w-full max-w-md mx-auto">
	<div class="aspect-square mb-4">
		{#if permissionDenied}
			<div class="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-100 rounded-lg">
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
			<label class="block text-sm font-medium text-gray-700 mb-2">카메라 선택</label>
			<select 
				bind:value={selectedDeviceId} 
				onchange={changeCamera} 
				class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			>
				{#each videoDevices as device}
					<option value={device.deviceId}>
						{device.label || `카메라 ${videoDevices.indexOf(device) + 1}`}
						{#if cameraFOVs.has(device.deviceId)}
							(FOV: {Math.round(cameraFOVs.get(device.deviceId) || 0)}°)
						{/if}
					</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if lastDetected}
		<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
			<p class="text-sm text-green-700 font-medium">마지막 스캔 결과:</p>
			<p class="text-green-800 break-all">{lastDetected}</p>
		</div>
	{/if}

	<div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors {dragover ? 'border-blue-500 bg-blue-50' : ''}">
		<BarqodeDropzone onDetect={onDetectUploaded} {onDragover}>
			<div class="text-gray-500">
				<svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
				</svg>
				<p class="text-sm">이미지 파일을 드래그하거나 클릭하여 업로드</p>
			</div>
		</BarqodeDropzone>
	</div>

	{#if uploaded}
		<div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
			<p class="text-sm text-blue-700 font-medium">업로드 이미지 스캔 결과:</p>
			<p class="text-blue-800 break-all">{uploaded}</p>
		</div>
	{/if}
</div>

