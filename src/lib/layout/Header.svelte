<script lang="ts">
import LinkButton from "$lib/ui/LinkButton.svelte";
</script>

<header class="flex justify-between items-center px-4 py-2 bg-base-200 max-xl:mx-3 mt-3 rounded-full">
	<div class="logo">
		<a class="link link-hover font-black" href="/">645 라이브</a>
	</div>
	<!-- TODO: 내 정보 이름 바꾸기 -->
	<LinkButton href="/my" class="btn-primary rounded-full shadow-none">내 645</LinkButton>
</header>