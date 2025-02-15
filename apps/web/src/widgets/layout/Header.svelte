<script>
// import Button from "@/shared/ui/Button.svelte";
import LinkButton from "@/shared/ui/LinkButton.svelte";
</script>

<header class="flex justify-between items-center px-4 py-2 bg-white">
	<div class="logo">
		<a class="link link-hover" href="/">645 라이브</a>
	</div>
	<!-- TODO: 내 정보 이름 바꾸기 -->
	<LinkButton href="/account" class="btn-primary shadow-none">내 정보</LinkButton>
</header>