<!-- @ts-nocheck -->
<script lang="ts">
// @ts-nocheck
/**
 * 스크린 리더용 상태 알림 컴포넌트
 * 실시간 업데이트 및 상태 변경을 스크린 리더에 전달
 */

interface Props {
	/** aria-live 속성 값 */
	liveMode?: "off" | "polite" | "assertive";
	/** 메시지가 변경될 때 전체를 다시 읽을지 여부 */
	atomic?: boolean;
	/** 전달할 메시지 */
	message?: string;
	/** 추가 CSS 클래스 */
	class?: string;
}

let {
	liveMode = "polite",
	atomic = true,
	message = "",
	class: className = "",
}: Props = $props();

// 메시지가 변경될 때마다 고유한 키 생성하여 강제 업데이트 - 무한 루프 방지
let messageKey = $state(0);
let lastMessage = "";

$effect(() => {
	// 메시지가 실제로 변경된 경우에만 키 업데이트 (중복 업데이트 방지)
	if (message && message !== lastMessage) {
		messageKey++;
		lastMessage = message;
	} else if (!message && lastMessage) {
		// 메시지가 빈 문자열로 변경된 경우
		lastMessage = "";
	}
});
</script>

<!-- 스크린 리더 전용 상태 알림 영역 -->
<div 
	class="sr-only {className}"
	role="status"
	aria-live={liveMode}
	aria-atomic={atomic}
	key={messageKey}
>
	{message}
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>