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

<div class="mt-4 sm:mt-6 lg:mt-8 {getThemeClass(theme)} rounded-lg p-3 sm:p-4 lg:p-6">
  <h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4 {getTitleClass(theme)}">
    {icon} {title}
  </h3>
  
  {#if description}
    <p class="text-xs sm:text-sm text-base-content/80 mb-4 leading-relaxed">
      {description}
    </p>
  {/if}
  
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
    {#each guides as guide}
      <div class="space-y-2">
        <h4 class="font-semibold mb-2 text-sm sm:text-base">{guide.title}</h4>
        <ul class="space-y-1 text-base-content/70">
          {#each guide.items as item}
            <li class="list-disc list-inside">{@html item}</li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</div>