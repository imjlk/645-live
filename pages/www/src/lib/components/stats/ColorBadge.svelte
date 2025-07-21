<script lang="ts">
interface ColorBadgeProps {
  color: "yellow" | "blue" | "red" | "grey" | "green";
  count: number | string;
  size?: "small" | "normal" | "large";
}

let { color, count, size = "normal" }: ColorBadgeProps = $props();

const getColorClass = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-500",
    blue: "bg-blue-500",
    red: "bg-red-500", 
    grey: "bg-gray-500",
    green: "bg-green-500",
  };
  return colorMap[colorName] || "bg-gray-400";
};
</script>

<span class="color-badge {getColorClass(color)} {size}">
  {count}
</span>

<style>
  .color-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: white;
    font-weight: bold;
  }

  .color-badge.small {
    width: 1.25rem;
    height: 1.25rem;
    font-size: 0.65rem;
  }

  .color-badge.normal {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.75rem;
  }

  .color-badge.large {
    width: 2rem;
    height: 2rem;
    font-size: 0.875rem;
  }
</style>