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
    <p class="guide-section-shell__eyebrow {getTitleClass(theme)}">{icon} Insight Guide</p>
    <h3 class="guide-section-shell__title">{title}</h3>
    {#if description}
      <p class="guide-section-shell__description">{description}</p>
    {/if}
  </div>

  <div class="guide-section-shell__grid">
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
  .guide-section-shell {
    margin-top: 1.5rem;
    border-radius: 1.8rem;
    padding: 1rem;
    border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
  }

  .guide-section-shell__head {
    max-width: 48rem;
    margin-bottom: 1rem;
  }

  .guide-section-shell__eyebrow {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .guide-section-shell__title {
    margin-top: 0.4rem;
    font-size: clamp(1.15rem, 2vw, 1.6rem);
    line-height: 1.25;
    font-weight: 700;
    color: oklch(var(--bc));
  }

  .guide-section-shell__description {
    margin-top: 0.5rem;
    font-size: 0.92rem;
    line-height: 1.7;
    color: color-mix(in oklab, oklch(var(--bc)) 68%, white);
  }

  .guide-section-shell__grid {
    display: grid;
    gap: 0.85rem;
  }

  .guide-section-shell__card {
    border-radius: 1.25rem;
    background: color-mix(in oklab, oklch(var(--b1)) 92%, white);
    border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
    padding: 1rem;
  }

  .guide-section-shell__card-title {
    margin-bottom: 0.6rem;
    font-size: 1rem;
    font-weight: 700;
    color: oklch(var(--bc));
  }

  .guide-section-shell__list {
    display: grid;
    gap: 0.4rem;
    font-size: 0.9rem;
    line-height: 1.65;
    color: color-mix(in oklab, oklch(var(--bc)) 68%, white);
    padding-left: 1rem;
    list-style: disc;
  }

  @media (min-width: 1024px) {
    .guide-section-shell {
      padding: 1.3rem;
    }

    .guide-section-shell__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
