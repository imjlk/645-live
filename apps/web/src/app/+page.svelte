<script lang="ts">
import LottoBall from "@/features/lotto/components/LottoBall.svelte";
import LinkButton from "@/shared/ui/LinkButton.svelte";
</script>

<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-0 py-4 sm:p-4 gap-4">
	{#each Array.from({ length: 45 }) as _, index}
		<LinkButton class="aspect-square w-full min-h-30" href="/n/{index+1}">
			<LottoBall ballNumber={index+1} />
		</LinkButton>
	{/each}
</div>