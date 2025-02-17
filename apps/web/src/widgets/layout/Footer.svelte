<script lang="ts">
import LinkButton from "@/shared/ui/LinkButton.svelte";
</script>

<footer class="flex flex-col md:flex-row justify-between items-center px-4 py-2 bg-base-content text-base-100 rounded-t-4xl pt-6 pb-12">
	<div>Footer Area</div>
	<div>
		<LinkButton href="/privacy" class="btn-ghost shadow-none">개인정보 처리방침</LinkButton>
		<LinkButton href="/terms-of-service" class="btn-ghost shadow-none">이용약관</LinkButton>
	</div>
</footer>