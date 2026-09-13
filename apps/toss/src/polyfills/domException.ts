if (typeof globalThis.DOMException === "undefined") {
	class DOMException extends Error {
		#message: string;
		#name: string;

		constructor(message = "", name = "Error") {
			super(message);
			this.#name = name;
			this.#message = message;
		}

		get name() {
			return this.#name;
		}

		get message() {
			return this.#message;
		}
	}

	globalThis.DOMException = DOMException as typeof globalThis.DOMException;
}
