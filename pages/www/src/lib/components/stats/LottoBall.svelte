<script lang="ts">
interface LottoBallProps {
	number: number;
	color?: "yellow" | "blue" | "red" | "grey" | "green";
	size?: "small" | "normal" | "large";
	href?: string;
	interactive?: boolean;
}

let {
	number,
	color,
	size = "normal",
	href,
	interactive = false,
}: LottoBallProps = $props();

// 번호에 따른 색상 자동 결정
const getColorFromNumber = (num: number): string => {
	if (num >= 1 && num <= 10) return "yellow";
	if (num >= 11 && num <= 20) return "blue";
	if (num >= 21 && num <= 30) return "red";
	if (num >= 31 && num <= 40) return "grey";
	if (num >= 41 && num <= 45) return "green";
	return "grey";
};

const ballColor = color || getColorFromNumber(number);

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

{#if href}
  <a {href} class="lotto-ball {getColorClass(ballColor)} {size} {interactive ? 'interactive' : ''}">
    {number}
  </a>
{:else}
  <div class="lotto-ball {getColorClass(ballColor)} {size} {interactive ? 'interactive' : ''}">
    {number}
  </div>
{/if}

<style>
  .lotto-ball {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: white;
    font-weight: bold;
    text-decoration: none;
    transition: transform 0.2s ease-in-out;
  }

  .lotto-ball.small {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.75rem;
  }

  .lotto-ball.normal {
    width: 2rem;
    height: 2rem;
    font-size: 0.875rem;
  }

  .lotto-ball.large {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
  }

  .lotto-ball.interactive:hover {
    transform: scale(1.1);
    cursor: pointer;
  }

  @media (max-width: 640px) {
    .lotto-ball.normal {
      width: 1.75rem;
      height: 1.75rem;
      font-size: 0.75rem;
    }
  }
</style>