<script lang="ts">
import Header from "@/widgets/layout/Header.svelte";
import "./styles/app.css";
import LinkButton from "@/shared/ui/LinkButton.svelte";
import Footer from "@/widgets/layout/Footer.svelte";

let { children } = $props();
import { preparePageTransition } from "@/widgets/layout/page-transition";

preparePageTransition();
</script>

<div class="min-h-dvh flex flex-col max-w-7xl mx-auto">
<Header />

<div class="flex flex-1 items-center gap-4 px-0 flex-col sm:flex-row sm:items-stretch my-4 mx-3 xl:mx-0">
	<aside class="w-full sm:w-32 min-w-48 sm:flex-1 rounded-2xl bg-base-200">
		<ul class="flex flex-row sm:flex-col gap-4 overflow-scroll py-2 sm:py-4 px-3">
			<li><LinkButton class="btn-secondary btn-ghost rounded-full w-full" href="/login">Menu1</LinkButton></li>
			<li><LinkButton class="btn-secondary btn-ghost rounded-full w-full" href="/qr-scan">QR Scan</LinkButton></li>
			<li><LinkButton href="/login">Menu1</LinkButton></li>
		</ul>
	</aside>
	<main class="container mx-auto px-3 sm:px-0 flex-1 items-center sm:flex-4 rounded-2xl bg-base-200">
		{@render children()}
	</main>
</div>

<Footer />
</div>