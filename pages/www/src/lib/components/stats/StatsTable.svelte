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

<div class="card bg-base-100 shadow-sm">
  <div class="card-body p-3 sm:p-6">
    {#if title}
      <h2 class="card-title text-lg sm:text-xl">{title}</h2>
    {/if}
    
    <div class="overflow-x-auto -mx-3 sm:mx-0">
      <table class="table w-full {zebra ? 'table-zebra' : ''}">
        <thead>
          <tr>
            {#each columns as column}
              <th 
                class="text-xs sm:text-sm {column.class || ''} {column.sticky ? 'sticky left-0 bg-base-200 z-10' : ''}" 
                style={column.minWidth ? `min-width: ${column.minWidth}` : ''}
              >
                {column.title}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each data as row, index}
            <tr>
              {#each columns as column}
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
  </div>
</div>