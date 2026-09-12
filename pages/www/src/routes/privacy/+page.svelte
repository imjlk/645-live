<script lang="ts">
import { resolve } from "$app/paths";
import { absoluteUrl } from "$lib/seo/index.js";
import MetaTags from "$lib/seo/PageMeta.svelte";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";

const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "개인정보 처리방침", current: true },
];
const sections = [
	{ id: "collection", title: "처리 목적과 항목" },
	{ id: "scan-records", title: "QR과 스캔 기록" },
	{ id: "retention", title: "보관과 파기" },
	{ id: "providers", title: "외부 서비스와 국외 처리" },
	{ id: "cookies", title: "쿠키·광고·분석" },
	{ id: "rights", title: "내 정보에 대한 권리" },
	{ id: "children", title: "아동의 개인정보" },
	{ id: "security", title: "보호 조치" },
	{ id: "contact", title: "담당자와 구제 방법" },
	{ id: "changes", title: "방침 변경" },
];
</script>

<MetaTags
	title="개인정보 처리방침"
	titleTemplate="%s | 645.live"
	description="645.live의 회원가입 정보와 QR 스캔 기록을 수집·이용·보관하는 기준을 안내합니다. 국내 데이터 보관, 외부 서비스와 광고 쿠키, 회원 탈퇴 및 개인정보 열람·삭제 요청 방법과 개인정보 보호담당 연락처를 확인하세요."
	canonical={absoluteUrl("/privacy")}
	robots="index,follow"
/>

<div class="content-page privacy-page">
	<Breadcrumbs items={breadcrumbItems} />
	<header class="page-header">
		<p class="section-label">서비스 이용 안내</p>
		<h1>개인정보 처리방침</h1>
		<p>1990컴퍼니는 645.live에서 어떤 정보를 왜 처리하는지, 이용자가 이를 어떻게 관리할 수 있는지 안내합니다.</p>
		<p class="effective-date">시행일: <time datetime="2026-09-12">2026년 9월 12일</time></p>
	</header>

	<div class="privacy-summary">
		<p><strong>공개 정보는 가입 없이 볼 수 있습니다.</strong> 회원가입을 선택하면 로그인 정보와 계정에 저장한 스캔 기록을 처리합니다. 카메라 영상과 선택한 사진의 QR 인식은 이용자의 기기에서 이루어집니다.</p>
		<p>개인정보 문의·열람·삭제 요청: <a href="mailto:support@645.live">support@645.live</a> · <a href="tel:028771990">02-877-1990</a></p>
	</div>

	<nav class="privacy-contents" aria-label="개인정보 처리방침 목차">
		{#each sections as section, index (section.id)}
			<a href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a>
		{/each}
	</nav>

	<article class="policy-content">
		<section id="collection" aria-labelledby="collection-heading">
			<h2 id="collection-heading">1. 처리 목적과 개인정보 항목</h2>
			<p>645.live는 회원가입·로그인, 본인 계정의 스캔 기록 보관과 동기화, 이용 문의 처리에 필요한 정보를 처리합니다. 아래 회원 서비스의 필수 정보는 「개인정보 보호법」 제15조제1항제4호에 따른 서비스 계약 체결·이행을 근거로 처리합니다.</p>
			<dl class="data-list">
				<div><dt>이메일 회원가입 · 필수</dt><dd>이름 또는 닉네임, 이메일, 비밀번호. 계정 생성과 로그인을 위해 사용합니다. 비밀번호는 원문으로 저장하지 않고 복원이 어려운 해시값으로 저장합니다.</dd></div>
				<div><dt>소셜 로그인 · 해당 방법을 선택한 경우</dt><dd>로그인 화면에서 제공되는 Google·카카오·네이버의 계정 식별자, 제공자 정보, 이름 또는 닉네임, 이메일, 프로필 이미지, 로그인에 필요한 인증 토큰과 유효기간을 처리합니다. 제공받는 프로필 항목은 선택한 제공자와 해당 동의 화면에 따라 달라집니다. 소셜 계정의 비밀번호는 645.live가 전달받지 않습니다.</dd></div>
				<div><dt>계정과 로그인 과정에서 생성되는 정보</dt><dd>회원 식별자, 이메일 확인 상태, 가입·수정 시각, 로그인 세션 식별자와 만료 시각, IP 주소, 브라우저 정보. 로그인 유지와 계정 접근 확인에 사용합니다.</dd></div>
				<div><dt>회원 스캔 기록 · 스캔 기능을 이용한 경우</dt><dd>회원 식별자, QR 문자열, 티켓 구분값, 회차, 게임 수, 스캔·확인 시각, 당첨 확인 상태와 등수, 수령 기간, 결과 요약. 본인의 기록 조회, 당첨 결과 확인과 기기 간 동기화에 사용합니다.</dd></div>
				<div><dt>이용 문의 · 문의를 접수한 경우</dt><dd>이용자가 제공한 이름 또는 닉네임, 회신 연락처, 문의 내용과 처리 내역. 문의에 답변하고 요청한 조치를 처리하기 위해 사용합니다. 비밀번호와 신분증 전체 사본은 문의 내용에 포함하지 마세요.</dd></div>
			</dl>
			<p>주민등록번호, 결제수단, 계좌번호는 회원가입과 스캔 기록 저장을 위해 요구하지 않습니다. 가입에 필요한 정보를 제공하지 않으면 회원 기능은 이용할 수 없으나, 당첨 결과·통계·뉴스와 같은 공개 정보는 계속 볼 수 있습니다. 광고·분석 도구가 처리하는 정보는 <a href="#cookies">5항</a>에서 별도로 안내합니다.</p>
		</section>

		<section id="scan-records" aria-labelledby="scan-records-heading">
			<h2 id="scan-records-heading">2. QR 인식과 스캔 기록의 저장 위치</h2>
			<p>카메라 영상과 이용자가 선택한 사진은 브라우저에서 QR을 인식하는 데 사용합니다. 이 기능은 영상이나 사진 파일 자체를 서버에 업로드하지 않습니다. 인식된 <strong>QR 문자열은 서버로 전송</strong>하여 유효성을 확인하고 당첨 결과를 계산합니다. 카메라 권한은 브라우저의 사이트 권한 설정에서 언제든 철회할 수 있으며, 카메라를 허용하지 않아도 사진 선택 방식으로 확인할 수 있습니다.</p>
			<ul>
				<li><strong>이 기기의 기록:</strong> QR 문자열과 스캔 결과가 브라우저의 로컬 저장소에 저장됩니다. 같은 기기·브라우저를 사용하는 다른 사람이 기록을 볼 수 있으므로 공용 기기에서는 이용 후 기록과 사이트 데이터를 삭제해 주세요.</li>
				<li><strong>회원 기록:</strong> 로그인 상태에서 저장한 스캔 기록은 회원 계정과 연결해 국내 회원 데이터베이스에 저장하고, 로그인한 기기에서 다시 불러옵니다. 저장을 완료하지 못한 기록은 연결이 복구되거나 화면을 다시 열 때 동기화할 수 있습니다.</li>
				<li><strong>공개 스캔 집계:</strong> 회차와 선택 번호를 집계 서버로 보내 번호별 합산 통계를 만듭니다. 공개 화면에는 회원 식별자, 이메일, 개인별 QR 문자열을 표시하지 않습니다.</li>
			</ul>
			<p><strong>기기의 기록 삭제와 계정의 기록 삭제는 다릅니다.</strong> 브라우저에 저장된 기록만 지우면 서버에 저장된 회원 기록은 남아 다시 동기화될 수 있습니다. 로그아웃이나 카메라 권한 철회도 이미 저장한 회원 기록을 삭제하지 않습니다.</p>
		</section>

		<section id="retention" aria-labelledby="retention-heading">
			<h2 id="retention-heading">3. 보관기간과 파기</h2>
			<dl class="data-list">
				<div><dt>회원 정보와 회원 스캔 기록</dt><dd>회원 서비스를 이용하는 동안 보관하며, 회원 탈퇴 시 계정과 연결된 로그인 정보 및 회원 스캔 기록을 삭제합니다. 개인정보 삭제·처리정지 요청은 본인 확인 후 관계 법령에 따라 처리합니다.</dd></div>
				<div><dt>이 기기에 저장한 스캔 기록</dt><dd>스캔일을 기준으로 최근 7일, 최대 100건을 유지합니다. 기록을 읽거나 저장하는 시점에 만료 기록을 정리하므로, 사이트를 다시 열지 않은 기기에는 데이터가 남아 있을 수 있습니다. 즉시 삭제하려면 스캔 기록의 삭제 기능이나 브라우저의 사이트 데이터 삭제 기능을 사용하세요.</dd></div>
				<div><dt>로그인 쿠키</dt><dd>기본 유효기간은 7일이며, 서비스를 사용하는 동안 갱신될 수 있습니다. 로그아웃하면 현재 로그인에 사용하는 쿠키를 해제합니다. 쿠키의 유효기간과 서버의 보관·삭제 처리는 구분됩니다.</dd></div>
				<div><dt>접속 중인 이용자 수 집계</dt><dd>회원 식별자와 분리된 임의 접속 식별자, 브라우저 정보, 페이지 경로, 접속·최근 확인 시각을 처리합니다. 서버에서는 12분 동안 활동이 없는 기록을 정리 대상으로 삼아 요청 처리 시와 5분 간격의 정리 작업에서 삭제합니다. 기기에 저장된 접속 식별자는 사이트 데이터 삭제로 지울 수 있습니다.</dd></div>
				<div><dt>문의 내용과 처리 내역</dt><dd>문의 대응과 요청한 조치에 필요한 동안 처리하고 목적을 달성하면 파기합니다. 법령에 따라 별도 보존이 필요한 정보가 있으면 대상 항목, 보존 근거와 기간을 구분하여 안내합니다.</dd></div>
			</dl>
			<p>보관기간이 지나거나 처리 목적을 달성한 개인정보는 지체 없이 파기합니다. 전자적 정보는 데이터베이스와 저장소에서 삭제하며, 다른 법령에 따른 보존 의무가 있는 정보는 그 근거에 필요한 범위로 분리하여 보관합니다.</p>
			<p>탈퇴 후에도 이미 개인별 기록과 분리해 합산한 번호별 통계는 남을 수 있습니다. 탈퇴한 기기의 해당 계정 기록은 삭제하지만, 다른 기기에 남은 기록은 각 기기에서 삭제해 주세요. 외부 광고·분석 서비스의 데이터는 해당 서비스의 삭제 방법과 보관 기준이 적용됩니다.</p>
		</section>

		<section id="providers" aria-labelledby="providers-heading">
			<h2 id="providers-heading">4. 외부 서비스와 국외 처리</h2>
			<p>회원 데이터베이스와 TrailBase 집계 데이터의 저장 위치는 <strong>대한민국</strong>입니다. 웹사이트 전송과 로그인·API 요청 처리에는 Cloudflare를 사용하므로, 국내 데이터베이스에 저장한다는 사실이 모든 네트워크 처리가 국내에서만 이루어진다는 뜻은 아닙니다.</p>
			<dl class="data-list">
				<div><dt>Cloudflare, Inc. · 웹사이트 운영 인프라</dt><dd>웹페이지와 파일의 호스팅·전송, 웹 요청 처리, 회원 데이터베이스 연결, 비밀번호 검증 연산에 사용합니다. 웹 요청 시 IP 주소, 브라우저 정보, 요청 주소·헤더·쿠키와 해당 기능에 전달한 데이터가 처리됩니다. 로그인·회원 기능을 이용하면 이메일, 인증 정보, QR 기록 등 해당 요청의 내용도 처리됩니다. 웹사이트와 회원 기능을 제공하기 위한 처리 위탁이며, 요청 시 네트워크를 통해 전송합니다. Cloudflare의 글로벌 네트워크를 경유하거나 국외에서 처리될 수 있습니다. 사업자 개인정보 문의는 legal@cloudflare.com으로 할 수 있습니다. <a href="https://www.cloudflare.com/ko-kr/privacypolicy/" target="_blank" rel="noreferrer">Cloudflare 개인정보처리방침</a>에서 사업자의 처리 방식을 확인할 수 있습니다.</dd></div>
				<div><dt>소셜 로그인 제공자 · 이용자가 선택한 외부 계정</dt><dd>선택한 제공자가 이용자를 인증하고 허용된 프로필 정보를 645.live에 전달합니다. 제공자의 로그인 화면에서 수집·제공 항목을 확인할 수 있습니다. 제공자 자체의 정보 처리는 각 사업자의 방침을 따릅니다. <a href="https://policies.google.com/privacy?hl=ko" target="_blank" rel="noreferrer">Google</a> · <a href="https://www.kakao.com/policy/privacy" target="_blank" rel="noreferrer">카카오</a> · <a href="https://policy.naver.com/policy/privacy.html" target="_blank" rel="noreferrer">네이버</a></dd></div>
			</dl>
			<p>Google 광고·분석 도구와 사용을 종료한 Microsoft Clarity의 처리는 아래에서 별도로 설명합니다. 회원 데이터의 저장 업무와 외부 사업자가 자신의 광고·분석 목적으로 처리하는 업무를 구분합니다. 국외 처리에 관한 문의와 권리행사는 <a href="#contact">개인정보 보호담당</a>에게 접수할 수 있습니다.</p>
		</section>

		<section id="cookies" aria-labelledby="cookies-heading">
			<h2 id="cookies-heading">5. 쿠키·광고·분석 도구와 거부 방법</h2>
			<p>쿠키는 웹사이트가 브라우저에 저장하고 다시 전달받는 작은 정보입니다. 로컬 저장소는 같은 기기에서 설정과 기록을 다시 읽기 위해 사용하는 저장 공간입니다. 645.live는 로그인 유지, 선택한 화면 테마·카메라 기억, 접속 수 집계, 스캔 기록 보관에 이 기능을 사용합니다.</p>
			<h3>Google AdSense 광고</h3>
			<p>Google과 광고 파트너는 쿠키와 유사한 기술로 브라우저·기기 정보, 광고 노출·클릭, 웹사이트 방문 이력을 처리할 수 있습니다. 645.live와 다른 웹사이트의 이전 방문을 바탕으로 개인 맞춤 광고가 표시될 수 있습니다. 이러한 정보는 광고 제공·측정과 부정 이용 방지에 사용됩니다.</p>
			<p><a href="https://myadcenter.google.com/" target="_blank" rel="noreferrer">Google 내 광고 센터</a>에서 개인 맞춤 광고를 관리하거나 거부할 수 있습니다. Google 이외 사업자의 광고 쿠키는 <a href="https://optout.aboutads.info/" target="_blank" rel="noreferrer">광고 업계의 선택 도구</a>에서도 관리할 수 있습니다. 맞춤 광고를 거부해도 광고 자체가 모두 사라지는 것은 아닙니다. <a href="https://policies.google.com/technologies/partner-sites?hl=ko" target="_blank" rel="noreferrer">Google 파트너 사이트의 데이터 사용 안내</a></p>
			<h3>Google Analytics 이용 통계</h3>
			<p>방문 페이지, 기기·브라우저 정보, 페이지 이동과 기능 사용, 광고 영역 표시, 로딩·반응 성능을 측정해 서비스 이용 흐름을 개선합니다. 자체 분석 이벤트에 회원 식별자, 이메일, 비밀번호, QR 문자열과 개별 티켓 번호를 넣지 않습니다.</p>
			<p>Google의 사용자·이벤트 데이터 보관 기준은 <a href="https://support.google.com/analytics/answer/7667196?hl=ko" target="_blank" rel="noreferrer">데이터 보관 안내</a>를 따릅니다. 지원되는 브라우저에서는 <a href="https://tools.google.com/dlpage/gaoptout?hl=ko" target="_blank" rel="noreferrer">Google Analytics 차단 부가 기능</a>을 이용할 수 있습니다.</p>
			<h3>Microsoft Clarity 사용 종료</h3>
			<p>2026년 9월 12일 개정과 함께 Microsoft Clarity를 통한 화면 재생·클릭 분석 수집을 종료합니다. 이전에 수집된 데이터는 Microsoft의 보관 기준에 따라 처리될 수 있습니다. 현재 공개된 Clarity 기준은 일반 화면 재생 30일, 클릭·히트맵 데이터와 별도로 표시·즐겨찾기한 세션 9개월입니다.</p>
			<p>Microsoft는 수집한 이용 정보를 자사 제품 개선과 광고에 사용할 수 있습니다. <a href="https://privacy.microsoft.com/ko-kr/privacystatement" target="_blank" rel="noreferrer">Microsoft 개인정보처리방침</a>, <a href="https://account.microsoft.com/privacy/ad-settings" target="_blank" rel="noreferrer">Microsoft 광고 설정</a>, <a href="https://learn.microsoft.com/en-us/clarity/setup-and-installation/data-retention" target="_blank" rel="noreferrer">Clarity 보관 기준</a>을 확인하세요.</p>
			<h3>브라우저에서 직접 관리하기</h3>
			<ul>
				<li><strong>Chrome:</strong> 설정 → 개인정보 보호 및 보안에서 서드 파티 쿠키를 차단하거나 사이트 데이터를 삭제합니다.</li>
				<li><strong>Edge:</strong> 설정 → 개인정보, 검색 및 서비스에서 추적 방지를 설정하고 쿠키·사이트 데이터를 관리합니다.</li>
				<li><strong>Safari:</strong> 설정의 개인정보 보호 또는 Safari 설정에서 사이트 간 추적 방지와 웹사이트 데이터 관리를 이용합니다.</li>
			</ul>
			<p>메뉴 이름은 브라우저·기기 버전에 따라 달라질 수 있습니다. 쿠키를 모두 차단하거나 사이트 데이터를 삭제하면 로그인 상태, 테마 설정, 기기에만 보관한 스캔 기록이 사라지거나 일부 기능이 제한될 수 있습니다. 브라우저의 쿠키 차단만으로 서버에 이미 저장된 정보가 삭제되지는 않습니다.</p>
		</section>

		<section id="rights" aria-labelledby="rights-heading">
			<h2 id="rights-heading">6. 이용자의 권리와 행사 방법</h2>
			<p>이용자는 개인정보 열람, 정정·삭제, 처리정지와 동의 철회를 요청할 수 있습니다. 법정대리인이나 위임받은 대리인을 통해서도 행사할 수 있습니다. 요청한 사람이 본인 또는 적법한 대리인인지 확인한 뒤 관계 법령에서 정한 기간과 절차에 따라 처리합니다.</p>
			<ul>
				<li><a href={resolve("/my")}>내 기록</a>에서 계정에 저장된 스캔 기록을 확인할 수 있습니다.</li>
				<li>회원 탈퇴는 내 기록의 계정 관리에서 진행할 수 있습니다. 계정 보호를 위해 최근 로그인이나 비밀번호 확인이 필요할 수 있습니다.</li>
				<li>별도의 열람·정정·삭제·처리정지 요청은 <a href="mailto:support@645.live">support@645.live</a> 또는 <a href="tel:028771990">02-877-1990</a>으로 접수해 주세요.</li>
			</ul>
			<p>법령상 보존 의무 등으로 요청을 제한하거나 거절하는 경우에는 그 사유를 안내합니다. 개인정보 확인이 필요한 요청을 공개 GitHub 이슈나 공개 SNS 게시물에 올리지 마세요. 계정 비밀번호와 전체 QR 문자열을 공개할 필요는 없습니다.</p>
		</section>

		<section id="children" aria-labelledby="children-heading">
			<h2 id="children-heading">7. 만 14세 미만 아동의 개인정보</h2>
			<p>645.live 회원가입은 만 14세 이상을 대상으로 하며, 가입 과정에서 해당 여부를 확인합니다. 현재 만 14세 미만 아동의 회원가입을 위한 법정대리인 동의 절차는 제공하지 않습니다. 아동의 회원 정보가 처리된 사실을 확인하거나 법정대리인의 요청을 받으면 필요한 확인 후 삭제 등 적절한 조치를 합니다.</p>
		</section>

		<section id="security" aria-labelledby="security-heading">
			<h2 id="security-heading">8. 개인정보 보호 조치</h2>
			<p>비밀번호는 해시값으로 저장하고, 로그인 쿠키에는 브라우저 스크립트가 직접 읽지 못하도록 HttpOnly 속성을 적용합니다. 운영 서비스는 HTTPS 통신을 사용하며, 회원 스캔 기록 API는 로그인한 회원의 권한을 확인하여 해당 계정의 기록을 처리합니다.</p>
			<p>개인정보를 취급하는 범위와 권한을 필요한 수준으로 관리하고, 서비스 변경 시 개인정보 처리 항목과 외부 서비스 사용 내역을 함께 점검합니다.</p>
		</section>

		<section id="contact" aria-labelledby="contact-heading">
			<h2 id="contact-heading">9. 개인정보 보호담당과 권익침해 구제</h2>
			<dl class="contact-details">
				<div><dt>운영자</dt><dd>1990컴퍼니</dd></div>
				<div><dt>담당 부서</dt><dd>개인정보 보호담당</dd></div>
				<div><dt>담당자</dt><dd>김정래</dd></div>
				<div><dt>이메일</dt><dd><a href="mailto:support@645.live">support@645.live</a></dd></div>
				<div><dt>전화</dt><dd><a href="tel:028771990">02-877-1990</a></dd></div>
			</dl>
			<p>개인정보 처리에 관한 문의, 권리행사와 고충은 위 연락처로 접수할 수 있습니다. 외부 기관의 상담·분쟁조정이 필요한 경우 아래 기관을 이용할 수 있습니다.</p>
			<ul>
				<li><a href="https://privacy.kisa.or.kr/" target="_blank" rel="noreferrer">개인정보침해신고센터</a>: 국번 없이 <a href="tel:118">118</a></li>
				<li><a href="https://www.kopico.go.kr/" target="_blank" rel="noreferrer">개인정보분쟁조정위원회</a>: <a href="tel:18336972">1833-6972</a></li>
				<li><a href="https://www.privacy.go.kr/" target="_blank" rel="noreferrer">개인정보 포털</a>: 개인정보 보호 및 권리행사 안내</li>
			</ul>
		</section>

		<section id="changes" aria-labelledby="changes-heading">
			<h2 id="changes-heading">10. 처리방침 변경</h2>
			<p>이 방침은 2026년 9월 12일부터 적용합니다. 이번 개정에서는 운영자·담당자 연락처, 회원가입·QR 기록의 처리, 기기와 서버 기록의 차이, 외부 서비스, 쿠키 관리와 권리행사 방법을 구체화했습니다.</p>
			<p>법령이나 서비스의 처리 방식이 바뀌면 이 페이지에 변경 내용과 시행일을 공개합니다. 별도의 동의나 안내가 필요한 변경은 그 절차를 함께 진행합니다.</p>
			<p><a href={resolve("/privacy/2026-03-01")}>이전 개인정보 처리방침 보기 (2026년 3월 1일~9월 11일 적용)</a></p>
		</section>
	</article>
</div>

<style>
.privacy-page { max-width: 58rem; margin-inline: auto; }
.privacy-page .page-header { margin-top: 1.75rem; }
.privacy-page .page-header p { max-width: 44rem; }
.privacy-page .page-header .effective-date { font-size: .8125rem; margin-top: 1rem; }
.privacy-summary { margin-block: 1.75rem; padding: 1.25rem; border-left: 3px solid var(--color-primary); background: var(--color-base-200); font-size: .875rem; line-height: 1.8; }
.privacy-summary p + p { margin-top: .75rem; }
.privacy-summary a[href^="tel:"] { white-space: nowrap; }
.privacy-contents { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .25rem 1.5rem; padding-block: 1.25rem; border-block: 1px solid var(--color-base-300); }
.privacy-contents a { display: flex; gap: .75rem; padding-block: .5rem; font-size: .875rem; line-height: 1.5; text-decoration: none; }
.privacy-contents a span { color: var(--color-primary); font-variant-numeric: tabular-nums; }
.privacy-contents a:hover { color: var(--color-primary); }
.policy-content section { padding-block: 2rem; scroll-margin-top: 6rem; border-bottom: 1px solid var(--color-base-300); }
.policy-content section:last-child { border-bottom: 0; }
.policy-content h2 { font-size: 1.25rem; font-weight: 700; line-height: 1.5; margin-bottom: 1rem; letter-spacing: -.02em; }
.policy-content h3 { font-size: 1rem; font-weight: 650; margin-top: 1.5rem; margin-bottom: .625rem; }
.policy-content p, .policy-content li, .policy-content dd { font-size: .9375rem; line-height: 1.9; color: color-mix(in oklch, var(--color-base-content) 85%, transparent); overflow-wrap: anywhere; }
.policy-content p + p, .policy-content p + ul, .policy-content ul + p { margin-top: 1rem; }
.policy-content ul { padding-left: 1.25rem; list-style: disc; }
.policy-content li + li { margin-top: .625rem; }
.privacy-summary a, .policy-content a { color: var(--color-primary); text-decoration: underline; text-underline-offset: .2em; }
.data-list { margin-block: 1.25rem; }
.data-list > div { padding-block: 1rem; border-bottom: 1px solid var(--color-base-300); }
.data-list > div:first-child { padding-top: 0; }
.data-list > div:last-child { border-bottom: 0; }
.data-list dt { margin-bottom: .375rem; font-size: .9375rem; font-weight: 650; }
.contact-details { display: grid; gap: .75rem; margin-block: 1.25rem; }
.contact-details > div { display: grid; grid-template-columns: 6.25rem minmax(0, 1fr); gap: 1rem; align-items: baseline; }
.contact-details dt { font-size: .875rem; color: var(--color-muted-content); }
@media (max-width: 540px) { .privacy-contents { grid-template-columns: 1fr; gap: 0; } .policy-content section { padding-block: 1.75rem; } .privacy-summary { padding: 1rem; } }
</style>
