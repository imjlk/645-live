import { createXhrSseStream } from "@trailbase-apps-in-toss-kit/trailbase-client";

export type ConnectionState = "connecting" | "live" | "reconnecting";
/** Snapshots after every (re)connection reconcile missed inserts, updates and deletions. */
export function subscribeRealtime({
	url,
	onChange,
	onState,
}: {
	url: string;
	onChange: () => void;
	onState: (state: ConnectionState) => void;
}) {
	let stopped = false;
	let attempts = 0;
	let stream: ReturnType<typeof createXhrSseStream> | undefined;
	let reconnect: ReturnType<typeof setTimeout> | undefined;
	let rotation: ReturnType<typeof setTimeout> | undefined;
	function clearStream() {
		if (rotation) clearTimeout(rotation);
		const old = stream;
		stream = undefined;
		if (old) {
			old.xhr.onloadend = null;
			old.close();
		}
	}
	function retry() {
		if (stopped || reconnect) return;
		clearStream();
		onState("reconnecting");
		reconnect = setTimeout(
			() => {
				reconnect = undefined;
				connect();
			},
			Math.min(30_000, 1000 * 2 ** Math.min(attempts++, 5)) +
				Math.random() * 400,
		);
	}
	function connect() {
		if (stopped) return;
		onState(attempts ? "reconnecting" : "connecting");
		try {
			stream = createXhrSseStream({
				url,
				onEvent: () => onChange(),
				onOpen: () => {
					// The kit emits onOpen at headers. Only a successful HTTP response is live.
					if (stream && stream.xhr.status >= 400) {
						retry();
						return;
					}
					attempts = 0;
					onState("live");
					onChange();
				},
				onError: retry,
			});
			stream.xhr.onloadend = () => {
				if (!stopped) retry();
			};
			// RN retains responseText. Rotate to bound memory on long foreground sessions.
			rotation = setTimeout(() => {
				clearStream();
				connect();
			}, 60_000);
		} catch {
			retry();
		}
	}
	connect();
	return () => {
		stopped = true;
		if (reconnect) clearTimeout(reconnect);
		clearStream();
	};
}
