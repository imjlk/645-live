<script lang="ts">
import { onMount } from "svelte";

type Preference = "system" | "light" | "dark";
let preference = $state<Preference>("system");
let ready = $state(false);
const storageKey = "645-theme";
function readPreference(): Preference {
	try {
		const value = localStorage.getItem(storageKey);
		return value === "dark" || value === "light" ? value : "system";
	} catch {
		return "system";
	}
}
function applyTheme() {
	const theme =
		preference === "system"
			? window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light"
			: preference;
	document.documentElement.dataset.theme = theme;
	const meta = document.querySelector<HTMLMetaElement>(
		'meta[name="theme-color"]',
	);
	if (meta) meta.content = theme === "dark" ? "#131c29" : "#ffffff";
}
function changeTheme(event: Event) {
	preference = (event.currentTarget as HTMLSelectElement).value as Preference;
	try {
		localStorage.setItem(storageKey, preference);
	} catch {
		/* Apply without persistence. */
	}
	applyTheme();
}
onMount(() => {
	preference = readPreference();
	applyTheme();
	ready = true;
	const media = window.matchMedia("(prefers-color-scheme: dark)");
	const handleSystem = () => {
		if (preference === "system") applyTheme();
	};
	const handleStorage = (event: StorageEvent) => {
		if (event.key === storageKey || event.key === null) {
			preference = readPreference();
			applyTheme();
		}
	};
	media.addEventListener("change", handleSystem);
	window.addEventListener("storage", handleStorage);
	return () => {
		media.removeEventListener("change", handleSystem);
		window.removeEventListener("storage", handleStorage);
	};
});
</script>
<label class="theme-select">
	<span class="sr-only">화면 테마</span>
	<select aria-label="화면 테마" value={preference} onchange={changeTheme} disabled={!ready}>
		<option value="system">기기 설정</option><option value="light">라이트</option><option value="dark">다크</option>
	</select>
</label>
<style>
	.theme-select select { min-height: 40px; max-width: 105px; border: 1px solid var(--color-base-300); border-radius: 0.5rem; padding: 0.4rem; background: var(--color-base-100); color: var(--text-muted); font-size: 0.8125rem; }
	@media (max-width: 767px) { .theme-select select { max-width: 98px; min-height: 44px; font-size: 0.875rem; } }
</style>
