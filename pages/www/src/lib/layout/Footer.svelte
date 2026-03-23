<script lang="ts">
import LinkButton from "$lib/ui/LinkButton.svelte";

let currentYear = $state(new Date().getFullYear());
</script>

<footer class="flex flex-col md:flex-row justify-between items-center px-4 py-2 bg-base-content text-base-100 rounded-t-4xl pt-6 pb-12">
	<div class="flex flex-col items-center md:items-start space-y-1">
		<div class="text-lg font-semibold">645.live</div>
		<div class="text-sm opacity-75">공식 발표와 자체 스캔 데이터를 함께 정리하는 로또 645 정보 서비스</div>
		<div class="text-xs opacity-60">© {currentYear} 645.live. All rights reserved.</div>
	</div>
	<div class="flex flex-wrap justify-center gap-1 md:justify-end">
		<LinkButton href="/about" class="btn-ghost shadow-none">소개</LinkButton>
		<LinkButton href="/editorial-policy" class="btn-ghost shadow-none">편집 원칙</LinkButton>
		<LinkButton href="/data-sources" class="btn-ghost shadow-none">데이터 출처</LinkButton>
		<LinkButton href="/privacy" class="btn-ghost shadow-none">개인정보 처리방침</LinkButton>
		<LinkButton href="/terms-of-service" class="btn-ghost shadow-none">이용약관</LinkButton>
	</div>
</footer>
