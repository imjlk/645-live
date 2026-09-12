<script lang="ts">
interface GuideItem {
	title: string;
	items: string[];
}

interface GuideSectionProps {
	title: string;
	icon?: string;
	description?: string;
	guides: GuideItem[];
	columns?: 1 | 2;
	theme?:
		| "info"
		| "primary"
		| "secondary"
		| "accent"
		| "success"
		| "warning"
		| "error";
}

let {
	title,
	icon = "📊",
	description,
	guides,
	columns = 2,
	theme = "info",
}: GuideSectionProps = $props();

const getThemeClass = (themeName: string): string => {
	const themeMap: Record<string, string> = {
		info: "bg-blue-50 dark:bg-blue-900/20",
		primary: "bg-primary/5",
		secondary: "bg-secondary/5",
		accent: "bg-accent/5",
		success: "bg-green-50 dark:bg-green-900/20",
		warning: "bg-yellow-50 dark:bg-yellow-900/20",
		error: "bg-red-50 dark:bg-red-900/20",
	};
	return themeMap[themeName] || themeMap.info;
};

const getTitleClass = (themeName: string): string => {
	const titleMap: Record<string, string> = {
		info: "text-blue-600 dark:text-blue-400",
		primary: "text-primary",
		secondary: "text-secondary",
		accent: "text-accent",
		success: "text-green-600 dark:text-green-400",
		warning: "text-yellow-600 dark:text-yellow-400",
		error: "text-red-600 dark:text-red-400",
	};
	return titleMap[themeName] || titleMap.info;
};
</script>

<section class="guide-section-shell {getThemeClass(theme)}">
  <div class="guide-section-shell__head">
    <p class="guide-section-shell__eyebrow {getTitleClass(theme)}">{icon} 읽는 법</p>
    <h3 class="guide-section-shell__title">{title}</h3>
    {#if description}
      <p class="guide-section-shell__description">{description}</p>
    {/if}
  </div>

  <div class="guide-section-shell__grid" class:guide-section-shell__grid--two-columns={columns === 2}>
    {#each guides as guide (guide.title)}
      <div class="guide-section-shell__card">
        <h4 class="guide-section-shell__card-title">{guide.title}</h4>
        <ul class="guide-section-shell__list">
          {#each guide.items as item (`${guide.title}-${item}`)}
            <li>{@html item}</li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</section>

<style>
  .guide-section-shell { min-width: 0; padding: clamp(1rem, 2.5vw, 1.5rem); border-radius: 0.65rem; background: var(--color-base-200); }
  .guide-section-shell__head { max-width: var(--reading-width); margin-bottom: 1rem; }
  .guide-section-shell__eyebrow { font-size: 0.8125rem; font-weight: 650; color: var(--color-primary); }
  .guide-section-shell__title { margin-top: 0.3rem; font-size: var(--section-title-size); line-height: 1.4; font-weight: 750; letter-spacing: -0.02em; color: var(--color-base-content); }
  .guide-section-shell__description { margin-top: 0.5rem; font-size: var(--body-copy-size); line-height: var(--body-copy-line-height); color: color-mix(in oklab, var(--color-base-content) 75%, transparent); }
  .guide-section-shell__grid { display: grid; gap: 1.25rem; }
  .guide-section-shell__card-title { margin-bottom: 0.6rem; font-size: 0.9375rem; font-weight: 650; color: var(--color-base-content); }
  .guide-section-shell__list { display: grid; gap: 0.4rem; padding-left: 1rem; list-style: disc; font-size: 0.875rem; line-height: 1.65; color: color-mix(in oklab, var(--color-base-content) 75%, transparent); }
  @media (min-width: 768px) { .guide-section-shell__grid--two-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
