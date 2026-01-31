<script lang="ts">
import ActiveUsersIndicator from "$lib/components/ui/ActiveUsersIndicator.svelte";
import LinkButton from "$lib/ui/LinkButton.svelte";
</script>

<header class="flex justify-between items-center px-4 py-2 bg-base-200 max-xl:mx-3 mt-3 rounded-full">
	<div class="logo">
		<a class="link link-hover font-black" href="/">645 라이브</a>
	</div>
	
	<div class="flex items-center gap-3">
		<!-- 실시간 접속자 수 표시 -->
		<ActiveUsersIndicator 
			compact={true} 
			showConnectionStatus={true}
			showPeakUsers={false}
		/>
		
		<LinkButton href="/my" class="btn-primary rounded-full shadow-none">프로필</LinkButton>
	</div>
</header>