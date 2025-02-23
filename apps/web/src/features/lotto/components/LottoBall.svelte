<script lang="ts">
let { ballNumber, ...rest } = $props<{
	ballNumber: number;
}>();
</script>

<div class="stack aspect-square lotto-ball w-full" style:view-transition-name="ball-{ballNumber}">
	<div class="card rounded-full bg-base-200 text-center shadow-md">
		<div class="card-body">
			<div class="font-light">{ballNumber}</div>
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