<script lang="ts">
import { goto } from "$app/navigation";

interface RecentAnalysisInputProps {
	maxRounds: number;
	basePath: string;
	selectedRounds?: number | null;
	placeholder?: string;
	buttonText?: string;
	returnHref?: string;
	returnLabel?: string;
	presets?: number[];
}

let {
	maxRounds,
	basePath,
	selectedRounds = null,
	placeholder = "100",
	buttonText = "최근 구간 보기",
	returnHref,
	returnLabel = "전체 회차 보기",
	presets = [10, 20, 50, 100],
}: RecentAnalysisInputProps = $props();

let inputValue = $state("");
const hasRoundData = $derived(maxRounds > 0);
const normalizedSelectedRounds = $derived(
	selectedRounds && selectedRounds > 0 ? selectedRounds : null,
);
const isRecentSelection = $derived(normalizedSelectedRounds !== null);
const availablePresets = $derived(
	presets.filter((round) => round > 0 && round <= maxRounds),
);

$effect(() => {
	inputValue = normalizedSelectedRounds ? String(normalizedSelectedRounds) : "";
});

const validateInput = (value: string): boolean => {
	const str = String(value || "");
	if (str.trim() === "") return false;
	const num = Number(str);
	return !Number.isNaN(num) && num > 0 && num <= maxRounds;
};

const navigateToAnalysis = async (value = inputValue) => {
	if (!hasRoundData) {
		return;
	}

	const inputStr = String(value || "");

	if (inputStr.trim() === "") {
		alert("분석할 회차 수를 입력해주세요.");
		return;
	}

	if (validateInput(inputStr)) {
		const rounds = Number(inputStr);
		try {
			await goto(`${basePath}/recent/${rounds}`);
		} catch (error) {
			console.error("Navigation error:", error);
			alert("페이지 이동 중 오류가 발생했습니다.");
		}
	} else {
		alert(`1부터 ${maxRounds}까지의 숫자를 입력해주세요.`);
	}
};

const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === "Enter") {
		navigateToAnalysis();
	}
};
</script>

<section class="recent-analysis-shell">
  <div class="recent-analysis-shell__copy">
    <p class="recent-analysis-shell__eyebrow">Range Switch</p>
    <h2 class="recent-analysis-shell__title">분석 구간 선택</h2>
    {#if hasRoundData}
      <div class="recent-analysis-shell__status">
        <span class="recent-analysis-shell__pill">
          {#if isRecentSelection}
            최근 {normalizedSelectedRounds}회차 기준
          {:else}
            전체 {maxRounds}회차 기준
          {/if}
        </span>
      </div>
      {#if isRecentSelection}
        <p class="recent-analysis-shell__description">
          현재는 <span class="font-semibold text-primary">최근 {normalizedSelectedRounds}회차</span>만 따로 분석하고 있습니다.
          아래에서 다른 최근 구간으로 바꾸거나 전체 <span class="font-semibold text-primary">{maxRounds}회차</span> 기준 통계로 돌아가 비교할 수 있습니다.
        </p>
      {:else}
        <p class="recent-analysis-shell__description">
          현재는 <span class="font-semibold text-primary">전체 {maxRounds}회차</span> 기준 통계를 보고 있습니다.
          아래에서 최근 10회, 20회, 50회, 100회처럼 원하는 구간만 따로 열어 단기 흐름을 비교할 수 있습니다.
        </p>
      {/if}
    {:else}
      <p class="recent-analysis-shell__description">
        아직 표시할 회차 데이터가 준비되지 않았습니다.
        통계 반영이 끝나면 최근 10회, 20회, 50회, 100회 같은 구간 분석을 바로 열 수 있습니다.
      </p>
    {/if}
  </div>

  <div class="recent-analysis-shell__controls">
    <label for="rounds-input" class="recent-analysis-shell__label">빠른 구간 선택</label>
    <div class="recent-analysis-shell__chips">
      {#if availablePresets.length > 0}
        {#each availablePresets as preset (preset)}
          <button
            type="button"
            class={`recent-analysis-shell__chip ${normalizedSelectedRounds === preset ? "recent-analysis-shell__chip--active" : ""}`}
            onclick={() => navigateToAnalysis(String(preset))}
          >
            최근 {preset}회
          </button>
        {/each}
      {:else}
        <span class="recent-analysis-shell__hint">회차 데이터 준비 중</span>
      {/if}
    </div>
    <label for="rounds-input" class="recent-analysis-shell__label">직접 회차 수 입력</label>
    <div class="recent-analysis-shell__field">
      <input
        id="rounds-input"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        bind:value={inputValue}
        onkeydown={handleKeydown}
        class="recent-analysis-shell__input"
        {placeholder}
        disabled={!hasRoundData}
      />
      <span class="recent-analysis-shell__suffix">
        {#if hasRoundData}
          {#if isRecentSelection}
            회차 (전체 {maxRounds}회 중)
          {:else}
            회차 (최대 {maxRounds})
          {/if}
        {:else}
          회차 데이터 준비 중
        {/if}
      </span>
    </div>
    <div class="recent-analysis-shell__actions">
      <button
        type="button"
        onclick={() => navigateToAnalysis()}
        class="btn btn-primary btn-sm w-full sm:w-auto"
        disabled={!hasRoundData}
      >
        {buttonText}
      </button>
      {#if returnHref}
        <a href={returnHref} class="btn btn-ghost btn-sm w-full sm:w-auto">
          {returnLabel}
        </a>
      {/if}
    </div>
  </div>
</section>

<style>
  .recent-analysis-shell {
    display: grid;
    gap: 1rem;
    border-radius: 1.6rem;
    border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
    background:
      radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 30%),
      color-mix(in oklab, oklch(var(--b1)) 94%, white);
    padding: 1rem;
    box-shadow: 0 16px 42px rgba(15, 23, 42, 0.05);
  }

  .recent-analysis-shell__eyebrow {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: color-mix(in oklab, oklch(var(--p)) 72%, oklch(var(--bc)));
  }

  .recent-analysis-shell__title {
    margin-top: 0.4rem;
    font-size: 1.2rem;
    font-weight: 700;
    color: oklch(var(--bc));
  }

  .recent-analysis-shell__description {
    margin-top: 0.45rem;
    font-size: 0.92rem;
    line-height: 1.7;
    color: color-mix(in oklab, oklch(var(--bc)) 68%, white);
  }

  .recent-analysis-shell__status {
    margin-top: 0.45rem;
  }

  .recent-analysis-shell__pill {
    display: inline-flex;
    align-items: center;
    border-radius: 9999px;
    border: 1px solid color-mix(in oklab, oklch(var(--p)) 18%, oklch(var(--b3)));
    background: color-mix(in oklab, oklch(var(--p)) 8%, oklch(var(--b1)));
    padding: 0.35rem 0.7rem;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: color-mix(in oklab, oklch(var(--bc)) 84%, oklch(var(--p)));
  }

  .recent-analysis-shell__controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .recent-analysis-shell__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .recent-analysis-shell__chip {
    border-radius: 9999px;
    border: 1px solid color-mix(in oklab, oklch(var(--p)) 20%, oklch(var(--b3)));
    background: color-mix(in oklab, oklch(var(--p)) 7%, oklch(var(--b1)));
    color: oklch(var(--bc));
    padding: 0.45rem 0.75rem;
    font-size: 0.82rem;
    font-weight: 700;
    transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
  }

  .recent-analysis-shell__chip:hover {
    transform: translateY(-1px);
    border-color: color-mix(in oklab, oklch(var(--p)) 42%, oklch(var(--b3)));
    background: color-mix(in oklab, oklch(var(--p)) 12%, oklch(var(--b1)));
  }

  .recent-analysis-shell__chip--active {
    border-color: color-mix(in oklab, oklch(var(--p)) 48%, oklch(var(--b3)));
    background: color-mix(in oklab, oklch(var(--p)) 18%, oklch(var(--b1)));
    color: color-mix(in oklab, oklch(var(--bc)) 88%, oklch(var(--p)));
  }

  .recent-analysis-shell__hint {
    font-size: 0.84rem;
    color: color-mix(in oklab, oklch(var(--bc)) 58%, white);
  }

  .recent-analysis-shell__label {
    font-size: 0.84rem;
    font-weight: 700;
    color: color-mix(in oklab, oklch(var(--bc)) 72%, white);
  }

  .recent-analysis-shell__field {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
  }

  .recent-analysis-shell__input {
    width: 6rem;
    border-radius: 9999px;
    border: 1px solid color-mix(in oklab, oklch(var(--b3)) 72%, white);
    background: color-mix(in oklab, oklch(var(--b1)) 96%, white);
    padding: 0.65rem 0.8rem;
    text-align: center;
    font-weight: 700;
    color: oklch(var(--bc));
  }

  .recent-analysis-shell__suffix {
    font-size: 0.84rem;
    color: color-mix(in oklab, oklch(var(--bc)) 62%, white);
  }

  .recent-analysis-shell__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  @media (min-width: 768px) {
    .recent-analysis-shell {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      padding: 1.2rem;
    }

    .recent-analysis-shell__controls {
      min-width: 18rem;
      align-items: flex-start;
    }
  }
</style>
