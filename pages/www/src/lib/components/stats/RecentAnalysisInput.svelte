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
  buttonText = "상세 분석" 
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

<div class="card bg-base-100 shadow-sm">
  <div class="card-body p-4">
    <h2 class="card-title text-lg">최근 회차 분석</h2>
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
      <div class="flex flex-col sm:flex-row sm:items-center gap-2">
        <label for="rounds-input" class="text-sm font-medium">최근:</label>
        <div class="flex items-center gap-2">
          <input
            id="rounds-input"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            bind:value={inputValue}
            on:keydown={handleKeydown}
            class="input input-bordered input-sm w-20 sm:w-24 text-center"
            {placeholder}
          />
          <span class="text-xs sm:text-sm opacity-60">회차 (최대 {maxRounds})</span>
        </div>
      </div>
      <button
        type="button"
        on:click={navigateToAnalysis}
        class="btn btn-primary btn-sm w-full sm:w-auto"
      >
        {buttonText}
      </button>
    </div>
    <p class="text-sm text-base-content/60">
      현재 전체 <span class="font-semibold text-primary">{maxRounds}회차</span> 데이터를 표시 중입니다. 
      특정 회차 수를 입력하면 해당 최근 회차만 분석할 수 있습니다.
    </p>
  </div>
</div>