<script lang="ts">
import type { ComponentProps } from "svelte";
import { MetaTags } from "svelte-meta-tags";
import { getGenericOgImage, SITE_NAME } from "./index";

let {
	title,
	description,
	canonical,
	openGraph,
	twitter,
	...rest
}: ComponentProps<typeof MetaTags> = $props();
const image = $derived(
	getGenericOgImage({
		title: title || SITE_NAME,
		description,
		layout: "minimal",
		theme: "dark",
	}),
);
</script>
<MetaTags {title} {description} {canonical} {...rest}
	openGraph={{ type: "website", title, description, url: canonical, siteName: SITE_NAME, locale: "ko_KR", images: [image], ...openGraph }}
	twitter={{ cardType: "summary_large_image", title, description, image: image.url, imageAlt: image.alt, ...twitter }} />
