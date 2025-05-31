<script lang="ts">
import { page } from "$app/state";
import LottoBall from "$lib/modules/lotto/components/LottoBall.svelte";

const ballNumber = $derived(Number(page.params.index));
</script>

<div class="p-0 py-4 sm:p-4 grid-cols-2 grid">
	<LottoBall {ballNumber} initialValue={0} />
</div>