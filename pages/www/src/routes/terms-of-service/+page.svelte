<script lang="ts">
import { resolve } from "$app/paths";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";
import { absoluteUrl } from "$lib/seo/index.js";
import { MetaTags } from "svelte-meta-tags";

// Breadcrumbs 데이터
const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "서비스 이용약관", current: true },
];
</script>

<MetaTags
	title="서비스 이용약관"
	titleTemplate="%s | 645.live"
	description="645.live 서비스 이용 조건과 책임 범위를 안내합니다."
	canonical={absoluteUrl("/terms-of-service")}
	robots="index,follow"
/>

<div class="p-6 space-y-6">
	<!-- Breadcrumbs -->
	<Breadcrumbs items={breadcrumbItems} />

	<!-- 페이지 헤더 -->
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold text-primary">서비스 이용약관</h1>
		<p class="text-base-content/70">
			645.live 서비스 이용과 관련한 기본 조건을 안내합니다.
		</p>
	</div>

	<div class="card bg-base-100 shadow-sm">
		<div class="card-body">
			<div class="prose prose-sm sm:prose max-w-none">
				<p class="text-base-content/70">
					시행일: 2026년 3월 1일
				</p>

				<h2>제1조 (목적)</h2>
				<p>
					본 약관은 645.live(이하 "서비스")가 제공하는 로또 통계, 분석 콘텐츠, 관련 정보 서비스의 이용 조건 및 절차, 서비스와 이용자의 권리·의무 및 책임사항을 정함을 목적으로 합니다.
				</p>

				<h2>제2조 (서비스 성격)</h2>
				<ul>
					<li>서비스는 정보 제공을 목적으로 하며, 복권 판매 또는 구매를 중개하지 않습니다.</li>
					<li>서비스 내 데이터는 공식 발표 자료를 기반으로 수집·가공되며, 지연·정정이 발생할 수 있습니다.</li>
					<li>서비스는 당첨, 수익 또는 특정 결과를 보장하지 않습니다.</li>
				</ul>

				<h2>제3조 (약관의 게시 및 변경)</h2>
				<ul>
					<li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
					<li>서비스는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있습니다.</li>
					<li>중요한 변경은 시행일 전 사전 고지하며, 변경 후 서비스를 계속 이용하면 변경 약관에 동의한 것으로 봅니다.</li>
				</ul>

				<h2>제4조 (이용자의 의무)</h2>
				<ul>
					<li>서비스 또는 제3자의 권리를 침해하는 행위를 해서는 안 됩니다.</li>
					<li>자동화된 과도한 요청, 비정상 트래픽 유발, 서비스 운영 방해 행위를 해서는 안 됩니다.</li>
					<li>법령 또는 공서양속에 반하는 방식으로 서비스를 이용해서는 안 됩니다.</li>
				</ul>

				<h2>제5조 (지식재산권)</h2>
				<ul>
					<li>서비스의 UI, 분석 로직, 콘텐츠 편집물에 관한 권리는 서비스 또는 정당한 권리자에게 귀속됩니다.</li>
					<li>법령상 허용 범위를 초과한 무단 복제, 배포, 재가공, 상업적 이용은 금지됩니다.</li>
				</ul>

				<h2>제6조 (서비스 제공의 변경·중단)</h2>
				<ul>
					<li>서비스는 점검, 장애 대응, 정책 변경 등의 사유로 전부 또는 일부 기능을 변경·중단할 수 있습니다.</li>
					<li>중대한 변경이 있는 경우 사전 또는 사후에 공지합니다.</li>
				</ul>

				<h2>제7조 (책임의 제한)</h2>
				<ul>
					<li>서비스는 제공 정보의 정확성·완전성·최신성을 보장하기 위해 노력하나, 이를 절대적으로 보증하지 않습니다.</li>
					<li>이용자의 판단 또는 투자·구매 결정에 따른 손해에 대해 서비스는 법령상 허용 범위 내에서 책임을 제한합니다.</li>
					<li>천재지변, 통신 장애, 제3자 귀책 사유 등 서비스가 통제할 수 없는 사유로 발생한 손해에 대해 책임을 지지 않습니다.</li>
				</ul>

				<h2>제8조 (준거법 및 분쟁 해결)</h2>
				<p>
					본 약관은 대한민국 법령에 따릅니다. 서비스 이용과 관련하여 분쟁이 발생한 경우, 당사자는 성실히 협의하며 협의가 이루어지지 않을 때에는 관련 법령에 따른 관할 법원에 따릅니다.
				</p>

				<h2>제9조 (문의)</h2>
				<p>
					약관 및 서비스 이용 관련 문의는 <a href={resolve("/about")}>소개 페이지</a>에 안내된 공개 운영 채널을 통해 접수할 수 있습니다.
				</p>
			</div>
		</div>
	</div>
</div>
