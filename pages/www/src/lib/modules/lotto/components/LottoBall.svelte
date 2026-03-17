<script lang="ts">
interface Props {
	ballNumber?: number;
	number?: number;
	initialValue?: number;
	class?: string;
	size?: "small" | "large";
	interactive?: boolean;
}

let {
	ballNumber,
	number,
	initialValue,
	class: className,
	size = "small",
	interactive = true,
	...rest
}: Props = $props();

// Use number prop if provided, otherwise use ballNumber
const displayNumber = $derived(number ?? ballNumber);

// Get ball color based on number ranges - lighter colors
function getBallColor(num: number): string {
	if (num <= 10) return "from-yellow-300 to-yellow-500 text-black";
	if (num <= 20) return "from-blue-300 to-blue-500 text-white";
	if (num <= 30) return "from-red-300 to-red-500 text-white";
	if (num <= 40) return "from-gray-300 to-gray-500 text-black";
	return "from-green-300 to-green-500 text-white";
}

// Get text size based on size prop
function getTextSize(size: string): string {
	return size === "large" ? "text-4xl md:text-5xl" : "text-lg md:text-xl";
}

// Get scan text size
function getScanTextSize(size: string): string {
	return size === "large" ? "text-sm md:text-base" : "text-xs";
}

// Get shine effect size
function getShineSize(size: string): string {
	return size === "large" ? "w-6 h-6 top-3 left-3" : "w-3 h-3 top-1.5 left-1.5";
}
</script>

<div 
	class="aspect-square lotto-ball w-full {className || ''}" 
	style:view-transition-name="ball-{displayNumber}"
	{...rest}
>
	<div class="relative w-full h-full p-1 {interactive ? 'group cursor-pointer' : ''}">
		<!-- Ball with gradient and shadow -->
		<div class="w-full h-full bg-gradient-to-br {getBallColor(displayNumber || 1)} rounded-full shadow-lg transform transition-all duration-300 {interactive ? 'group-hover:scale-105 group-hover:shadow-xl' : ''} relative overflow-hidden">
			<!-- Shine effect -->
			<div class="absolute {getShineSize(size)} bg-white/40 rounded-full blur-sm"></div>
			<!-- Number -->
			<div class="absolute inset-0 flex flex-col items-center justify-center p-1">
				<div class="{getTextSize(size)} font-bold drop-shadow-sm leading-none">{displayNumber}</div>
				{#if initialValue !== undefined}
					<div class="{getScanTextSize(size)} font-medium opacity-90 mt-1">스캔: {initialValue}</div>
				{/if}
			</div>
			<!-- Subtle inner border for depth -->
			<div class="absolute inset-1 rounded-full border border-white/20 pointer-events-none"></div>
		</div>
	</div>
</div>

<style>
	/* .lotto-ball {
		view-transition-name: ball;
	} */
</style>
