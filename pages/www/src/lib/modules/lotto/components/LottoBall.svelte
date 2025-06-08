<script lang="ts">
let { ballNumber, initialValue, ...rest } = $props<{
	ballNumber: number;
	initialValue: number;
}>();
</script>

<div class="stack aspect-square lotto-ball w-full" style:view-transition-name="ball-{ballNumber}">
	<div class="card rounded-full bg-base-200 text-center shadow-md">
		<div class="card-body">
			<div class="font-light">{ballNumber}</div>
			<div class="font-light">누적 스캔: {initialValue}</div>
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