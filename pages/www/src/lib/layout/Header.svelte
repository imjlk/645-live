<script lang="ts">
import { resolve } from "$app/paths";
import type { PublicSession } from "@645/shared";
import ActiveUsersIndicator from "$lib/components/ui/ActiveUsersIndicator.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";

let { session = null }: { session?: PublicSession | null } = $props();
</script>

	<header class="flex justify-between items-center px-4 py-2 bg-base-200 max-xl:mx-3 mt-3 rounded-full">
		<div class="logo">
			<a class="link link-hover font-black" href={resolve("/")}>645 라이브</a>
		</div>
	
	<div class="flex items-center gap-3">
		<!-- 실시간 접속자 수 표시 -->
		<ActiveUsersIndicator 
			compact={true} 
			showConnectionStatus={true}
			showPeakUsers={false}
		/>
		
		{#if session?.user?.id}
			<LinkButton href={resolve("/my")} class="btn-primary rounded-full shadow-none">내 645</LinkButton>
			<form method="POST" action={resolve("/sign-out")}>
				<button type="submit" class="btn btn-outline rounded-full shadow-none">로그아웃</button>
			</form>
		{:else}
			<LinkButton href={resolve("/login")} class="btn-primary rounded-full shadow-none">로그인</LinkButton>
		{/if}
	</div>
</header>
