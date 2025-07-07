<script lang="ts">
interface Props {
	ballNumber?: number;
	number?: number;
	initialValue?: number;
	class?: string;
}

let {
	ballNumber,
	number,
	initialValue,
	class: className,
	...rest
}: Props = $props();

// Use number prop if provided, otherwise use ballNumber
const displayNumber = number ?? ballNumber;
</script>

<div 
	class="stack aspect-square lotto-ball w-full {className || ''}" 
	style:view-transition-name="ball-{displayNumber}"
	{...rest}
>
	<div class="card rounded-full bg-base-200 text-center shadow-md">
		<div class="card-body">
			<div class="font-light">{displayNumber}</div>
			{#if initialValue !== undefined}
				<div class="font-light">누적 스캔: {initialValue}</div>
			{/if}
		</div>
	</div>
	<div class="card rounded-full bg-base-200 text-center shadow">
		<div class="card-body">B</div>
	</div>
	<div class="card rounded-full bg-base-200 text-center shadow-sm">
		<div class="card-body">C</div>
	</div>
</div>

<style>
	.lotto-ball {
		view-transition-name: ball;
	}
</style>