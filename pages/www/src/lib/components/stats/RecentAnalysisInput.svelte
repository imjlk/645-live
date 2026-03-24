<script lang="ts">
import { goto } from "$app/navigation";

interface RecentAnalysisInputProps {
	maxRounds: number;
	basePath: string;
	placeholder?: string;
	buttonText?: string;
}

let {
	maxRounds,
	basePath,
	placeholder = "100",
	buttonText = "상세 분석",
}: RecentAnalysisInputProps = $props();

let inputValue = $state("");

const validateInput = (value: string): boolean => {
	const str = String(value || "");
	if (str.trim() === "") return false;
	const num = Number(str);
	return !Number.isNaN(num) && num > 0 && num <= maxRounds;
};

const navigateToAnalysis = async () => {
	const inputStr = String(inputValue || "");

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
    <p class="recent-analysis-shell__eyebrow">Recent Focus</p>
    <h2 class="recent-analysis-shell__title">최근 회차 분석</h2>
    <p class="recent-analysis-shell__description">
      현재 전체 <span class="font-semibold text-primary">{maxRounds}회차</span> 데이터를 표시 중입니다.
      특정 회차 수를 입력하면 최근 구간만 따로 분석할 수 있습니다.
    </p>
  </div>

  <div class="recent-analysis-shell__controls">
    <label for="rounds-input" class="recent-analysis-shell__label">최근</label>
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
      />
      <span class="recent-analysis-shell__suffix">회차 (최대 {maxRounds})</span>
    </div>
    <button
      type="button"
      onclick={navigateToAnalysis}
      class="btn btn-primary btn-sm w-full sm:w-auto"
    >
      {buttonText}
    </button>
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

  .recent-analysis-shell__controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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
