<!-- @ts-nocheck -->
<script lang="ts">
// @ts-nocheck
/**
 * Accessible and responsive Table component
 * Supports sorting, loading states, and custom cell rendering
 */

import type { TableColumn, TableProps } from "$lib/types/components";
import { createEventDispatcher } from "svelte";
import LoadingSpinner from "./LoadingSpinner.svelte";

type T = $$Generic;

const dispatch = createEventDispatcher<{
	"row-click": { row: T; index: number; event: MouseEvent };
	"sort-change": { column: string; direction: "asc" | "desc" };
}>();

let {
	data,
	columns,
	loading,
	emptyMessage = "데이터가 없습니다.",
	striped = false,
	hoverable = false,
	compact = false,
	onRowClick,
	class: customClass = "",
	"data-testid": testId,
	...restProps
}: TableProps<T> = $props();

// Component state
let sortColumn: string | null = $state(null);
let sortDirection: "asc" | "desc" = $state("asc");

// Computed classes
const tableClasses = $derived(
	[
		"table w-full",
		striped && "table-zebra",
		compact && "table-compact",
		hoverable && "table-hover",
		customClass,
	]
		.filter(Boolean)
		.join(" "),
);

// Handle column sorting
const handleSort = (column: TableColumn<T>) => {
	if (!column.sortable) return;

	const columnKey = String(column.key);

	if (sortColumn === columnKey) {
		sortDirection = sortDirection === "asc" ? "desc" : "asc";
	} else {
		sortColumn = columnKey;
		sortDirection = "asc";
	}

	dispatch("sort-change", { column: columnKey, direction: sortDirection });
};

// Handle row click
const handleRowClick = (row: T, index: number, event: MouseEvent) => {
	if (onRowClick) {
		onRowClick(row, index);
	}
	dispatch("row-click", { row, index, event });
};

// Handle keyboard navigation for sortable headers
const handleHeaderKeyDown = (event: KeyboardEvent, column: TableColumn<T>) => {
	if (column.sortable && (event.key === "Enter" || event.key === " ")) {
		event.preventDefault();
		handleSort(column);
	}
};

// Get cell value with proper type handling
const getCellValue = (row: T, column: TableColumn<T>): unknown => {
	if (typeof column.key === "string") {
		return (row as Record<string, unknown>)[column.key];
	}
	return (row as Record<string | number | symbol, unknown>)[column.key];
};

// Render cell content
const renderCell = (
	value: unknown,
	row: T,
	index: number,
	column: TableColumn<T>,
) => {
	if (column.render) {
		const rendered = column.render(value, row, index);
		return typeof rendered === "string" ? rendered : null;
	}
	return String(value ?? "");
};

// Sort indicator for headers
const getSortIcon = (column: TableColumn<T>): string => {
	if (!column.sortable) return "";
	const columnKey = String(column.key);
	if (sortColumn !== columnKey) return "↕️";
	return sortDirection === "asc" ? "↑" : "↓";
};
</script>

<div 
  class="overflow-x-auto w-full"
  data-testid={testId}
  {...restProps}
>
  <table class={tableClasses} role="table">
    <!-- Table header -->
    <thead>
      <tr>
        {#each columns as column (column.key)}
          <th
            class="text-left font-semibold text-base-content bg-base-200 {column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}"
            style={column.width ? `width: ${column.width}` : undefined}
            role="columnheader"
            tabindex={column.sortable ? 0 : undefined}
            onclick={column.sortable ? () => handleSort(column) : undefined}
            onkeydown={column.sortable ? (e) => handleHeaderKeyDown(e, column) : undefined}
            aria-sort={column.sortable && sortColumn === String(column.key) 
              ? (sortDirection === 'asc' ? 'ascending' : 'descending')
              : column.sortable ? 'none' : undefined}
            class:cursor-pointer={column.sortable}
            class:hover:bg-base-300={column.sortable}
          >
            <div class="flex items-center gap-2 {column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}">
              <span>{column.label}</span>
              {#if column.sortable}
                <span class="text-xs opacity-60" aria-hidden="true">
                  {getSortIcon(column)}
                </span>
              {/if}
            </div>
          </th>
        {/each}
      </tr>
    </thead>

    <!-- Table body -->
    <tbody>
      {#if loading?.isLoading}
        <tr>
          <td colspan={columns.length} class="text-center py-8">
            <div class="flex flex-col items-center gap-3">
              <LoadingSpinner size="md" />
              <span class="text-base-content/70">
                {loading.loadingMessage || '데이터를 불러오는 중...'}
              </span>
            </div>
          </td>
        </tr>
      {:else if loading?.error}
        <tr>
          <td colspan={columns.length} class="text-center py-8">
            <div class="flex flex-col items-center gap-3">
              <span class="text-error text-lg">⚠️</span>
              <span class="text-error">
                {loading.error}
              </span>
            </div>
          </td>
        </tr>
      {:else if data.length === 0}
        <tr>
          <td colspan={columns.length} class="text-center py-8">
            <div class="flex flex-col items-center gap-3">
              <span class="text-base-content/40 text-2xl">📋</span>
              <span class="text-base-content/70">
                {emptyMessage}
              </span>
            </div>
          </td>
        </tr>
      {:else}
        {#each data as row, index (index)}
          <tr
            class={[
              onRowClick && 'cursor-pointer hover:bg-base-200',
              'transition-colors duration-150'
            ].filter(Boolean).join(' ')}
            onclick={onRowClick ? (e) => handleRowClick(row, index, e) : undefined}
            onkeydown={onRowClick ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRowClick(row, index, e as unknown as MouseEvent);
              }
            } : undefined}
            tabindex={onRowClick ? 0 : undefined}
            role={onRowClick ? 'button' : undefined}
            aria-label={onRowClick ? `행 ${index + 1} 선택` : undefined}
          >
            {#each columns as column (column.key)}
              {@const value = getCellValue(row, column)}
              <td
                class="py-3 px-4 {column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}"
              >
                {#if column.render}
                  {@const rendered = column.render(value, row, index)}
                  {#if typeof rendered === 'string'}
                    {@html rendered}
                  {:else if typeof rendered === 'function'}
                    {@render rendered()}
                  {:else}
                    <span class="text-base-content">
                      {String(rendered ?? '')}
                    </span>
                  {/if}
                {:else}
                  <span class="text-base-content">
                    {renderCell(value, row, index, column)}
                  </span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<style>
  /* Enhanced table styling */
  .table {
    border-collapse: collapse;
  }
  
  .table th {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 2px solid oklch(var(--b3));
  }
  
  .table td {
    border-bottom: 1px solid oklch(var(--b3) / 0.5);
  }
  
  /* Row hover effects */
  .table tbody tr:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px oklch(var(--b3) / 0.3);
  }
  
  /* Focus styles for accessibility */
  .table th[tabindex]:focus,
  .table tr[tabindex]:focus {
    outline: 2px solid oklch(var(--p));
    outline-offset: -2px;
  }
  
  /* Sortable header styling */
  .table th.cursor-pointer:hover {
    background-color: oklch(var(--b3));
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .table th,
    .table td {
      border-color: currentColor;
      border-width: 1px;
    }
  }
  
  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .table {
      font-size: 0.875rem;
    }
    
    .table th,
    .table td {
      padding: 0.5rem 0.25rem;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .table tbody tr {
      transition: none;
    }
    
    .table tbody tr:hover {
      transform: none;
    }
  }
</style>
