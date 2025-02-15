<script lang="ts">
import Header from "@/widgets/layout/Header.svelte";
import "./styles/app.css";

let { children } = $props();
</script>

<div class="min-h-screen">
	<Header />
	<main class="container mx-auto px-4">
		{@render children()}
	</main>
</div>
