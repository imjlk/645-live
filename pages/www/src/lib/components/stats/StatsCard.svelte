<script lang="ts">
interface StatsCardProps {
	href: string;
	icon: string;
	title: string;
	description: string;
	active?: boolean;
}

let {
	href,
	icon,
	title,
	description,
	active = false,
}: StatsCardProps = $props();
</script>

<a {href} class="stats-nav-card {active ? 'active' : ''}">
  <div class="text-2xl mb-2">{icon}</div>
  <h3 class="font-semibold text-sm">{title}</h3>
  <p class="text-xs text-base-content/60">{description}</p>
</a>

<style>
  .stats-nav-card {
    background: oklch(var(--b1));
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    padding: 1rem;
    text-align: center;
    border: 1px solid oklch(var(--b3));
    transition: all 0.2s ease-in-out;
    display: block;
  }
  
  .stats-nav-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .stats-nav-card.active {
    border-color: oklch(var(--p));
    background: oklch(var(--p) / 0.05);
  }
</style>