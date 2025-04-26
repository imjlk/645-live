<script lang="ts">
import {
	type BarcodeFormat,
	BarqodeDropzone,
	BarqodeStream,
	type DetectedBarcode,
} from "barqode";

let loading = $state(true);
let result = $state("");
let permissionDenied = $state(false);
let error = $state("");
let videoDevices = $state<MediaDeviceInfo[]>([]);
let selectedDeviceId = $state("");
let deviceInfos = $state<string[]>([]);

let uploaded = $state("");
let dragover = $state(false);

function onDetect(detectedCodes: DetectedBarcode[]) {
	console.log(detectedCodes.map((detectedCode) => detectedCode.rawValue));
}

function onDetectUploaded(detectedCodes: DetectedBarcode[]) {
	uploaded = detectedCodes
		.map((detectedCode) => detectedCode.rawValue)
		.join(", ");
}

function onDragover(isDraggingOver: boolean) {
	dragover = isDraggingOver;
}

function onError(err: { name: string; message: string }) {
	error = `[${err.name}]: `;

	if (err.name === "NotAllowedError") {
		permissionDenied = true;
		loading = false;
		error += "you need to grant camera access permission";
	} else if (err.name === "NotFoundError") {
		error += "no camera on this device";
	} else if (err.name === "NotSupportedError") {
		error += "secure context required (HTTPS, localhost)";
	} else if (err.name === "NotReadableError") {
		error += "is the camera already in use?";
	} else if (err.name === "OverconstrainedError") {
		error += "installed cameras are not suitable";
	} else if (err.name === "StreamApiNotSupportedError") {
		error += "Stream API is not supported in this browser";
	} else {
		error += err.message;
	}
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

		ctx.strokeStyle = "red";
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

async function onCameraOn() {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		deviceInfos = devices.map(
			(device) =>
				`${device.kind}: ${device.label || "Unknown"} (ID: ${device.deviceId.substring(0, 8)}...)`,
		);

		videoDevices = devices.filter((device) => device.kind === "videoinput");

		// 광각 렌즈 필터링 (광각 렌즈는 보통 이름에 'wide', 'ultra' 등의 키워드가 포함됨)
		const filteredDevices = videoDevices.filter(
			(device) =>
				!device.label.toLowerCase().includes("wide") &&
				!device.label.toLowerCase().includes("ultra"),
		);

		// 저장된 카메라 설정 불러오기
		const savedDeviceId = localStorage.getItem("preferredCameraId");

		if (
			savedDeviceId &&
			videoDevices.some((device) => device.deviceId === savedDeviceId)
		) {
			selectedDeviceId = savedDeviceId;
		} else if (filteredDevices.length > 0) {
			// 광각이 아닌 첫 번째 카메라 선택
			selectedDeviceId = filteredDevices[0].deviceId;
			localStorage.setItem("preferredCameraId", selectedDeviceId);
		} else if (videoDevices.length > 0) {
			// 모든 카메라가 광각인 경우 첫 번째 카메라 선택
			selectedDeviceId = videoDevices[0].deviceId;
			localStorage.setItem("preferredCameraId", selectedDeviceId);
		}

		loading = false;
	} catch (error) {
		console.error("카메라 장치 가져오기 실패:", error);
	}
}

function saveSelectedCamera() {
	if (selectedDeviceId) {
		localStorage.setItem("preferredCameraId", selectedDeviceId);
	}
}

function changeCamera() {
	saveSelectedCamera();
	// window.location.reload(); // 카메라 변경 시 페이지 새로고침
}

async function requestPermission() {
	try {
		// await getVideoDevices(); // 먼저 카메라 목록 가져오기

		const constraints = {
			video: selectedDeviceId
				? { deviceId: { exact: selectedDeviceId } }
				: true,
		};

		const result = await navigator.mediaDevices.getUserMedia(constraints);
		for (const track of result.getTracks()) {
			track.stop();
		}
		window.location.reload();
	} catch (error) {
		console.log("Permission request failed:", error);
	}
}
</script>
 
<div class="w-full aspect-square">
	{#if permissionDenied}
		<div class="text-center p-4 text-red-400">
			카메라 접근이 거부되었습니다.
			<!-- 이미 '차단'으로 설정된 경우에는 새 권한 요청이 자동으로 거부됨 -->
			<button 
				class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" 
				onclick={requestPermission}
			>
				카메라 권한 다시 요청하기
			</button>
		</div>
	{:else}
		<BarqodeStream 
			{onDetect} 
			{onCameraOn} 
			{onError} 
			{track}
			formats={["qr_code"]}
			constraints={selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}}
		>
			{#if loading}
				<div class="loading-indicator">로딩 중...</div>
			{/if}
		</BarqodeStream>
		
		{#if videoDevices.length > 0}
			<div class="camera-selector mt-4">
				<select 
					bind:value={selectedDeviceId} 
					onchange={changeCamera} 
					class="p-2 border rounded"
				>
					{#each videoDevices as device}
						<option value={device.deviceId}>
							{device.label || `카메라 ${videoDevices.indexOf(device) + 1}`}
						</option>
					{/each}
				</select>
			</div>
		{/if}
		
		<!-- Add device info display -->
		{#if deviceInfos.length > 0}
			<div class="device-info mt-4 p-3 bg-gray-100 rounded text-sm">
				<h3 class="font-bold mb-1">장치 정보:</h3>
				<ul class="list-disc pl-5">
					{#each deviceInfos as info}
						<li>{info}</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>

<div class="border border-white aspect-video w-full">
	<BarqodeDropzone onDetect={onDetectUploaded} {onDragover}>
		<p>Click to upload or drop an image here</p>
	</BarqodeDropzone>
</div>
 
Last detected: {uploaded}

