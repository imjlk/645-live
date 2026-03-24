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
  <div class="stats-nav-card__header">
    <div class="stats-nav-card__icon">{icon}</div>
    <span class="stats-nav-card__pulse" aria-hidden="true"></span>
  </div>
  <div class="stats-nav-card__body">
    <h3 class="stats-nav-card__title">{title}</h3>
    <p class="stats-nav-card__description">{description}</p>
  </div>
</a>

<style>
  .stats-nav-card {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at top right, color-mix(in oklab, oklch(var(--p)) 12%, transparent), transparent 48%),
      color-mix(in oklab, oklch(var(--b1)) 94%, white);
    border-radius: 1.25rem;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
    padding: 1rem;
    border: 1px solid oklch(var(--b3));
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.9rem;
    min-height: 9.75rem;
  }
  
  .stats-nav-card:hover {
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.1);
    transform: translateY(-3px);
    border-color: color-mix(in oklab, oklch(var(--p)) 26%, oklch(var(--b3)));
  }

  .stats-nav-card.active {
    border-color: oklch(var(--p));
    background:
      radial-gradient(circle at top right, color-mix(in oklab, oklch(var(--p)) 18%, transparent), transparent 46%),
      color-mix(in oklab, oklch(var(--b1)) 88%, oklch(var(--p)) 6%);
  }

  .stats-nav-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .stats-nav-card__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    background: color-mix(in oklab, oklch(var(--p)) 10%, white);
    font-size: 1.25rem;
    box-shadow: inset 0 0 0 1px color-mix(in oklab, oklch(var(--p)) 12%, oklch(var(--b3)));
  }

  .stats-nav-card__pulse {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 9999px;
    background: color-mix(in oklab, oklch(var(--p)) 72%, white);
    box-shadow: 0 0 0 0.28rem color-mix(in oklab, oklch(var(--p)) 10%, transparent);
  }

  .stats-nav-card__body {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .stats-nav-card__title {
    font-size: 0.98rem;
    font-weight: 700;
    line-height: 1.3;
    color: oklch(var(--bc));
  }

  .stats-nav-card__description {
    font-size: 0.79rem;
    line-height: 1.55;
    color: color-mix(in oklab, oklch(var(--bc)) 62%, white);
  }

  @media (max-width: 640px) {
    .stats-nav-card {
      min-height: auto;
      gap: 0.75rem;
    }
  }
</style>
