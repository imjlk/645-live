<script>
	import { generateTitle, generateSubtitle } from '$lib/templates/title-generator.js';
	
	// 샘플 데이터
	const sampleData = {
		round: 1150,
		date: "2024년 1월 27일",
		numbers: [7, 15, 23, 28, 34, 41],
		bonus: 9,
		jackpot_winners: 1,
		jackpot_amount: 2847382100,
		second_winners: 58,
		second_amount: 64537200,
		total_sales: 11389528000,
		auto_percentage: 87.2,
		manual_percentage: 12.8,
		has_jackpot: true,
		is_rollover: false,
		high_sales: true,
		consecutive_numbers: false,
		special_pattern: "",
		description: "제1150회 로또 645 당첨번호 발표 및 분석",
		keywords: '"로또", "당첨번호", "제1150회", "로또645", "복권"'
	};

	// 제목 생성
	const { title, category } = generateTitle(sampleData);
	const subtitle = generateSubtitle(sampleData, category);

	// 템플릿에 전달할 데이터 준비
	const templateData = {
		...sampleData,
		title,
		subtitle
	};
</script>

<svelte:head>
	<title>로또 뉴스 템플릿 미리보기 - 645.live</title>
	<meta name="description" content="mdsvex로 작성된 로또 뉴스 기사 템플릿 미리보기" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-4">📰 로또 뉴스 템플릿 미리보기</h1>
		<p class="text-base-content/70">
			mdsvex 템플릿이 실제로 어떻게 렌더링되는지 확인해보세요.
		</p>
	</div>

	<div class="grid gap-8 lg:grid-cols-2">
		<!-- 생성된 제목/부제목 미리보기 -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">🎯 생성된 제목</h2>
				<div class="space-y-4">
					<div>
						<div class="label">
							<span class="label-text font-semibold">메인 제목</span>
						</div>
						<div class="p-4 bg-base-100 rounded-lg">
							<p class="text-lg font-bold">{title}</p>
						</div>
					</div>
					
					<div>
						<div class="label">
							<span class="label-text font-semibold">부제목</span>
						</div>
						<div class="p-4 bg-base-100 rounded-lg">
							<p class="text-sm text-base-content/80">{subtitle}</p>
						</div>
					</div>

					<div>
						<div class="label">
							<span class="label-text font-semibold">카테고리</span>
						</div>
						<div class="badge badge-primary">{category}</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 샘플 데이터 -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">📊 샘플 데이터</h2>
				<div class="text-sm">
					<pre class="bg-base-100 p-4 rounded-lg overflow-auto">{JSON.stringify(sampleData, null, 2)}</pre>
				</div>
			</div>
		</div>
	</div>

	<div class="mt-8">
		<div class="alert alert-info">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
			</svg>
			<div>
				<h3 class="font-bold">mdsvex 파일로 렌더링하려면</h3>
				<p>아래 경로에 실제 .svx 파일을 생성해야 합니다:</p>
				<code class="bg-base-100 px-2 py-1 rounded mt-2 block">
					/src/routes/news/[round]/+page.svx
				</code>
			</div>
		</div>
	</div>

	<div class="mt-6 space-y-4">
		<a href="/news/sample" class="btn btn-primary">
			🔗 실제 mdsvex 렌더링 보기
		</a>
		
		<button 
			class="btn btn-outline"
			onclick={() => window.location.reload()}
		>
			🎲 새로운 제목 생성
		</button>
	</div>
</div>