<script lang="ts">
interface Props {
	number: number;
	isWinning?: boolean;
	isBonus?: boolean;
	size?: "sm" | "md" | "lg";
	class?: string;
}

let {
	number,
	isWinning = false,
	isBonus = false,
	size = "md",
	class: className = "",
	...rest
}: Props = $props();

// Ball colors based on number ranges (similar to actual lotto colors)
function getBallColor(num: number): string {
	if (num >= 1 && num <= 10) return "bg-yellow-400 text-yellow-900";
	if (num >= 11 && num <= 20) return "bg-blue-400 text-blue-900";
	if (num >= 21 && num <= 30) return "bg-red-400 text-red-900";
	if (num >= 31 && num <= 40) return "bg-gray-400 text-gray-900";
	if (num >= 41 && num <= 45) return "bg-green-400 text-green-900";
	return "bg-gray-300 text-gray-700";
}

function getSizeClasses(size: string): string {
	switch (size) {
		case "sm":
			return "w-8 h-8 text-xs";
		case "lg":
			return "w-16 h-16 text-lg";
		default:
			return "w-12 h-12 text-sm";
	}
}

const ballColorClass = $derived(
	isWinning
		? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 ring-2 ring-yellow-400"
		: getBallColor(number),
);
const bonusClass = $derived(
	isBonus ? "ring-2 ring-orange-400 ring-offset-2" : "",
);
const sizeClass = $derived(getSizeClasses(size));
</script>

<div 
	class="flex items-center justify-center rounded-full font-bold shadow-md {ballColorClass} {bonusClass} {sizeClass} {className}"
	{...rest}
>
	{number}
</div>