<script lang="ts" generics="Row extends object">
interface TableColumn {
	key: string;
	title: string;
	class?: string;
	sticky?: boolean;
	minWidth?: string;
	render?: (value: string, row: Row) => string;
}

interface StatsTableProps {
	columns: TableColumn[];
	data: Row[];
	zebra?: boolean;
	title?: string;
}

let { columns, data, zebra = true, title }: StatsTableProps = $props();

function getCellValue(row: Row, key: string): unknown {
	return (row as Record<string, unknown>)[key];
}

function getRenderValue(row: Row, key: string): string {
	const value = getCellValue(row, key);
	return value === null || value === undefined ? "" : String(value);
}
</script>

<section class="stats-table-shell">
  {#if title}
    <div class="stats-table-shell__head">
      <h2 class="stats-table-shell__title">{title}</h2>
    </div>
  {/if}

  <div class="stats-table-shell__scroll">
    <table class="table w-full {zebra ? 'table-zebra' : ''}">
      {#if title}<caption class="sr-only">{title}</caption>{/if}
      <thead>
        <tr>
          {#each columns as column (column.key)}
            <th
              scope="col"
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
                  {@html column.render(getRenderValue(row, column.key), row)}
                {:else}
                  {getCellValue(row, column.key)}
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
  .stats-table-shell { min-width: 0; background: var(--color-base-100); }
  .stats-table-shell__head { margin-bottom: 0.85rem; }
  .stats-table-shell__title { font-size: 1.125rem; font-weight: 700; color: var(--color-base-content); }
  .stats-table-shell__scroll { overflow-x: auto; border-block: 1px solid var(--color-base-300); }
  .stats-table-shell :global(thead th) { background: var(--color-base-200); color: color-mix(in oklab, var(--color-base-content) 78%, transparent); font-weight: 650; }
  .stats-table-shell :global(tbody td) { vertical-align: middle; }
</style>
