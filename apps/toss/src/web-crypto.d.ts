// The kit's ad-skip helper names the Web Crypto type for its optional request-ID
// source. This React Native project has no DOM lib, so declare the subset it uses;
// at runtime the helper falls back when global crypto is missing.
interface Crypto {
	getRandomValues<T extends ArrayBufferView | null>(array: T): T;
	randomUUID?(): string;
}
