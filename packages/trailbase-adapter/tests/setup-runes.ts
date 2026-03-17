declare global {
	var $state: <T>(initial: T) => T;
	var $derived: {
		<T>(expression: T): T;
		by: <T>(fn: () => T) => T;
	};
}

Object.defineProperty(globalThis, "$state", {
	value: <T>(initial: T) => initial,
	configurable: true,
	writable: true,
});

const derived = Object.assign(<T>(expression: T) => expression, {
	by: <T>(fn: () => T) => fn(),
});

Object.defineProperty(globalThis, "$derived", {
	value: derived,
	configurable: true,
	writable: true,
});

export {};
