<script lang="ts">
import { resolve } from "$app/paths";

const links = [
	["/about", "서비스 소개"],
	["/data-sources", "데이터 출처"],
	["/editorial-policy", "편집 원칙"],
	["/guide", "이용 가이드"],
	["/docs", "API·연동 문서"],
	["/status", "서비스 상태"],
	["/contact", "문의"],
	["/privacy", "개인정보 처리방침"],
	["/terms-of-service", "이용약관"],
] as const;
</script>
<footer class="site-footer">
 <div class="footer-inner">
  <div><a class="footer-brand" href={resolve("/")}>645.live</a><p>공식 추첨 결과와 이용자 스캔을 구분하는 로또 정보 서비스</p><small>© {new Date().getFullYear()} 645.live</small></div>
  <nav aria-label="서비스 안내">{#each links as [href, label] (href)}<a href={resolve(href)}>{label}</a>{/each}</nav>
 </div>
</footer>
<style>
 .site-footer { border-top: 1px solid var(--color-base-300); margin-top: 1.5rem; background: var(--color-base-200); }
 .footer-inner { max-width: var(--page-max-width); margin-inline: auto; padding: 2rem var(--page-gutter); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2rem; }
 .footer-brand { font-weight: 800; font-size: 1.25rem; letter-spacing: -0.05em; }
 p { margin-block: 0.6rem; color: var(--text-muted); font-size: 0.8125rem; line-height: 1.7; }
 small { color: var(--text-muted); font-size: 0.75rem; }
 nav { display: flex; flex-wrap: wrap; align-content: start; justify-content: end; gap: 0.25rem 1.25rem; }
 nav a { color: var(--text-muted); font-size: 0.8125rem; display: inline-flex; align-items: center; min-height: 44px; padding-block: 0.5rem; }
 nav a:hover { text-decoration: underline; }
 @media (max-width: 767px) { .footer-inner { grid-template-columns: 1fr; gap: 1rem; } nav { justify-content: start; } }
</style>
