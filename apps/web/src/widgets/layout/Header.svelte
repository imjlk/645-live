<script lang="ts">
import LinkButton from "@/shared/ui/LinkButton.svelte";
</script>

<header class="flex justify-between items-center px-4 py-2 bg-base-200">
	<div class="logo">
		<a class="link link-hover font-black" href="/">645 라이브</a>
	</div>
	<!-- TODO: 내 정보 이름 바꾸기 -->
	<LinkButton href="/my" class="btn-primary shadow-none">나의 645</LinkButton>
</header>