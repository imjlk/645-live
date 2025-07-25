/**
 * 키보드 네비게이션 유틸리티
 * 접근성을 위한 키보드 네비게이션 기능들을 제공
 */

export interface NavigationOptions {
	gridColumns?: number;
	maxItems?: number;
	onActivate?: (index: number) => void;
	onEscape?: () => void;
}

/**
 * 그리드 형태의 키보드 네비게이션을 처리
 * @param event - 키보드 이벤트
 * @param currentIndex - 현재 포커스된 아이템의 인덱스 (0부터 시작)
 * @param options - 네비게이션 옵션
 * @returns 다음 포커스해야 할 인덱스 또는 null
 */
export function handleGridNavigation(
	event: KeyboardEvent,
	currentIndex: number,
	options: NavigationOptions,
): number | null {
	const { gridColumns = 5, maxItems = 45, onActivate, onEscape } = options;

	switch (event.key) {
		case "ArrowRight": {
			event.preventDefault();
			const nextIndex = currentIndex + 1;
			return nextIndex < maxItems ? nextIndex : currentIndex;
		}

		case "ArrowLeft": {
			event.preventDefault();
			const prevIndex = currentIndex - 1;
			return prevIndex >= 0 ? prevIndex : currentIndex;
		}

		case "ArrowDown": {
			event.preventDefault();
			const nextRowIndex = currentIndex + gridColumns;
			return nextRowIndex < maxItems ? nextRowIndex : currentIndex;
		}

		case "ArrowUp": {
			event.preventDefault();
			const prevRowIndex = currentIndex - gridColumns;
			return prevRowIndex >= 0 ? prevRowIndex : currentIndex;
		}

		case "Home": {
			event.preventDefault();
			return 0;
		}

		case "End": {
			event.preventDefault();
			return maxItems - 1;
		}

		case "Enter":
		case " ": {
			event.preventDefault();
			if (onActivate) {
				onActivate(currentIndex);
			}
			return null;
		}

		case "Escape": {
			event.preventDefault();
			if (onEscape) {
				onEscape();
			}
			return null;
		}

		default:
			return null;
	}
}

/**
 * 요소에 포커스를 설정하고 스크롤 위치를 조정
 * @param element - 포커스할 요소
 * @param behavior - 스크롤 동작 ('auto' | 'smooth')
 */
export function focusElement(
	element: HTMLElement | null,
	behavior: ScrollBehavior = "smooth",
): void {
	if (element) {
		element.focus();
		element.scrollIntoView({
			behavior,
			block: "nearest",
			inline: "nearest",
		});
	}
}

/**
 * 숫자 키보드 입력을 처리하여 해당 번호로 직접 이동
 * @param event - 키보드 이벤트
 * @param maxNumber - 최대 번호 (기본값: 45)
 * @returns 이동할 번호 또는 null
 */
export function handleDirectNumberNavigation(
	event: KeyboardEvent,
	maxNumber = 45,
): number | null {
	// 숫자 키 1-9, 0 처리
	if (event.key >= "0" && event.key <= "9") {
		const digit = Number.parseInt(event.key);

		// 1-9는 해당 번호로, 0은 10번으로
		const targetNumber = digit === 0 ? 10 : digit;

		if (targetNumber <= maxNumber) {
			return targetNumber;
		}
	}

	return null;
}

/**
 * 접근성 어나운스 메시지를 스크린 리더에 전달
 * @param message - 전달할 메시지
 * @param priority - 메시지 우선순위 ('polite' | 'assertive')
 */
export function announceToScreenReader(
	message: string,
	priority: "polite" | "assertive" = "polite",
): void {
	const announcer = document.createElement("div");
	announcer.setAttribute("aria-live", priority);
	announcer.setAttribute("aria-atomic", "true");
	announcer.className = "sr-only";
	announcer.textContent = message;

	document.body.appendChild(announcer);

	// 메시지 전달 후 요소 제거
	setTimeout(() => {
		document.body.removeChild(announcer);
	}, 1000);
}
