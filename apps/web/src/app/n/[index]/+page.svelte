<script lang="ts">
import LottoBall from "@/features/lotto/components/LottoBall.svelte";
import { page } from "$app/state";

const ballNumber = $derived(Number(page.params.index));
</script>

<div class="p-0 py-4 sm:p-4 grid-cols-2 grid">
	<LottoBall {ballNumber} />
</div>