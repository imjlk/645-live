<script lang="ts">
	interface Props {
		numbers: number[];
		bonus: number;
		round: number;
	}
	
	let { numbers, bonus, round }: Props = $props();
</script>

<div class="card bg-gradient-to-r from-primary/20 to-secondary/20 shadow-lg">
	<div class="card-body">
		<h3 class="card-title text-center mb-4">제{round}회 당첨번호</h3>
		
		<div class="flex justify-center items-center gap-3 flex-wrap">
			<!-- Main Numbers -->
			{#each numbers as number}
				<div class="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-lg shadow-md">
					{number}
				</div>
			{/each}
			
			<!-- Plus Sign -->
			<div class="text-2xl font-bold text-base-content/70 mx-2">+</div>
			
			<!-- Bonus Number -->
			<div class="w-12 h-12 rounded-full bg-accent text-accent-content flex items-center justify-center font-bold text-lg shadow-md">
				{bonus}
			</div>
		</div>
		
		<div class="text-center text-sm text-base-content/70 mt-2">
			보너스
		</div>
	</div>
</div>