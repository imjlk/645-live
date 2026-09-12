<script lang="ts">
import { resolve } from "$app/paths";
import { absoluteUrl, CONTACT_PATH, SITE_GITHUB } from "$lib/seo/index.js";
import MetaTags from "$lib/seo/PageMeta.svelte";
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";

const issuesUrl = `${SITE_GITHUB}/issues`;

const breadcrumbItems = [
	{ label: "홈", href: "/" },
	{ label: "문의", current: true },
];
</script>

<MetaTags
	title="문의·개인정보 요청"
	titleTemplate="%s | 645.live"
	description="645.live 이용 문의와 데이터 정정, 회원정보 열람·정정·삭제·처리정지 요청 방법을 안내합니다. 계정이나 스캔 기록이 포함된 문의는 지원 이메일로 보내고, 개인정보가 없는 오류는 공개 GitHub 이슈로 제보할 수 있습니다."
	canonical={absoluteUrl(CONTACT_PATH)}
	robots="index,follow"
/>

<div class="content-page contact-page">
	<Breadcrumbs items={breadcrumbItems} />
	<header class="page-header"><div><h1 class="page-title">문의·개인정보 요청</h1><p>서비스 이용 중 불편한 점이나 개인정보에 관한 요청을 보내주세요.</p></div></header>

	<div class="contact-columns">
		<section aria-labelledby="private-contact-heading">
			<span class="section-label">이용 문의·개인정보 요청</span>
			<h2 id="private-contact-heading">지원 이메일로 문의하기</h2>
			<p>회원정보나 스캔 기록에 관한 문의, 개인정보 열람·정정·삭제·처리정지 요청은 아래 이메일로 보내주세요. 요청 처리에 필요한 경우 본인 확인 방법을 별도로 안내합니다.</p>
			<a class="contact-email" href="mailto:support@645.live">support@645.live <span aria-hidden="true">↗</span></a>
			<dl class="contact-details"><div><dt>운영자</dt><dd>1990컴퍼니</dd></div><div><dt>개인정보보호 담당자</dt><dd>김정래</dd></div><div><dt>연락처</dt><dd><a href="tel:028771990">02-877-1990</a></dd></div></dl>
			<p class="contact-note">문의에는 문제가 생긴 페이지, 발생 시각, 필요한 조치를 적어주세요. 비밀번호나 주민등록번호는 보내지 마세요. QR 원문이나 화면 사진은 담당자가 확인에 필요한 범위를 안내한 경우에만 보내주세요.</p>
			<a class="text-link" href={resolve("/privacy")}>개인정보 처리방침 확인하기 →</a>
		</section>

		<section aria-labelledby="public-contact-heading">
			<span class="section-label">개인정보가 없는 오류 제보</span>
			<h2 id="public-contact-heading">GitHub 이슈로 제보하기</h2>
			<p>공개 페이지의 표시 오류, 로또 회차 데이터의 정정, API·문서의 오류는 공개 이슈로 알려주실 수 있습니다.</p>
			<a class="btn btn-outline" href={issuesUrl} rel="noreferrer" target="_blank">공개 이슈 작성하기 <span aria-hidden="true">↗</span></a>
			<p class="contact-note"><strong>GitHub 이슈는 누구나 볼 수 있습니다.</strong> 이메일 주소, 회원정보, QR 코드·원문, 개인 스캔 기록이나 화면 사진을 올리지 마세요. 이런 정보가 필요한 문의는 지원 이메일을 이용해주세요.</p>
			<h3>재현에 도움이 되는 정보</h3>
			<ul><li>개인정보가 없는 페이지 주소와 관련 회차</li><li>사용한 브라우저·기기와 문제 발생 시각</li><li>오류가 나타나는 순서와 기대한 결과</li></ul>
			<div class="contact-links"><a class="text-link" href={resolve("/docs")}>개발자 문서</a><a class="text-link" href={resolve("/status")}>서비스 상태</a><a class="text-link" href={resolve("/data-sources")}>데이터 출처</a></div>
		</section>
	</div>
</div>

<style>
.page-header { margin-top: .75rem; }
.contact-columns { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--section-space); }
.contact-columns > section { min-width: 0; padding-top: 1.5rem; border-top: 1px solid var(--color-base-300); }
h2 { font-size: var(--section-title-size); font-weight: 700; margin-block: .65rem 1rem; letter-spacing: -.025em; }
h3 { font-size: .95rem; font-weight: 650; margin-top: 1.5rem; }
p, li { font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); overflow-wrap: anywhere; color: var(--text-muted); }
.contact-email { display: inline-flex; align-items: center; gap: .8rem; margin-block: 1.25rem; color: var(--color-primary); font-size: clamp(1.3rem, 4vw, 1.65rem); font-weight: 700; min-height: 44px; overflow-wrap: anywhere; }
.contact-email:hover, .text-link:hover { text-decoration: underline; }
.contact-details { margin-block: .25rem 1.25rem; }
.contact-details > div { display: flex; flex-wrap: wrap; gap: .4rem 1.25rem; font-size: .875rem; padding-block: .5rem; }
.contact-details dt { min-width: 9rem; color: var(--text-muted); }
.contact-details dd { font-weight: 550; }
.contact-note { margin-block: 1.25rem; padding: 1rem; background: var(--color-base-200); border-radius: .65rem; font-size: .8125rem; }
.contact-note strong { color: var(--color-base-content); }
.btn { margin-top: 1.25rem; }
ul { list-style: disc; padding-left: 1.2rem; margin-top: .6rem; }
.contact-links { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; }
.text-link { display: inline-flex; align-items: center; min-height: 44px; color: var(--color-primary); font-size: .875rem; font-weight: 550; }
@media (min-width: 850px) { .contact-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--section-space); } }
</style>
