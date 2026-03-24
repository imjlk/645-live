<script lang="ts">
interface TableColumn {
	key: string;
	title: string;
	class?: string;
	sticky?: boolean;
	minWidth?: string;
	render?: (value: any, row: any) => any;
}

interface StatsTableProps {
	columns: TableColumn[];
	data: any[];
	zebra?: boolean;
	title?: string;
}

let { columns, data, zebra = true, title }: StatsTableProps = $props();
</script>

<section class="stats-table-shell">
  {#if title}
    <div class="stats-table-shell__head">
      <p class="stats-table-shell__eyebrow">Detailed Table</p>
      <h2 class="stats-table-shell__title">{title}</h2>
    </div>
  {/if}

  <div class="stats-table-shell__scroll">
    <table class="table w-full {zebra ? 'table-zebra' : ''}">
      <thead>
        <tr>
          {#each columns as column}
            <th
              class="text-xs sm:text-sm {column.class || ''} {column.sticky ? 'sticky left-0 bg-base-100 z-10' : ''}"
              style={column.minWidth ? `min-width: ${column.minWidth}` : ''}
            >
              {column.title}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each data as row, index (`row-${index}`)}
          <tr>
            {#each columns as column (`${column.key}-${index}`)}
              <td
                class="text-xs sm:text-sm {column.class || ''} {column.sticky ? 'sticky left-0 bg-base-100 z-10' : ''}"
              >
                {#if column.render}
                  {@html column.render(row[column.key], row)}
                {:else}
                  {row[column.key]}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .stats-table-shell {
    border-radius: 1.8rem;
    border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
    background: color-mix(in oklab, oklch(var(--b1)) 96%, white);
    padding: 1rem;
    box-shadow: 0 18px 44px rgba(15, 23, 42, 0.05);
  }

  .stats-table-shell__head {
    margin-bottom: 0.9rem;
  }

  .stats-table-shell__eyebrow {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: color-mix(in oklab, oklch(var(--p)) 72%, oklch(var(--bc)));
  }

  .stats-table-shell__title {
    margin-top: 0.35rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: oklch(var(--bc));
  }

  .stats-table-shell__scroll {
    overflow-x: auto;
    margin-inline: -0.2rem;
    padding-inline: 0.2rem;
  }

  .stats-table-shell :global(thead th) {
    background: color-mix(in oklab, oklch(var(--b1)) 92%, oklch(var(--b2)));
    color: color-mix(in oklab, oklch(var(--bc)) 72%, white);
    font-weight: 700;
  }

  .stats-table-shell :global(tbody td) {
    vertical-align: middle;
  }

  @media (max-width: 640px) {
    .stats-table-shell {
      padding: 0.85rem;
      border-radius: 1.5rem;
    }
  }
</style>
