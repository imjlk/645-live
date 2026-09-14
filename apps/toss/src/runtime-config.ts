export function resolveLottoRuntime(
	appEnv = "production",
	apiBase = "https://trail.645.live",
) {
	// Only bare origins are supported. Avoid RN's partial URL implementation
	// before Granite installs its polyfills on older supported Toss runtimes.
	const origin = /^(https?):\/\/([a-z0-9.-]+|\[::1\])(?::(\d{1,5}))?\/?$/i.exec(
		apiBase,
	);
	if (
		!origin ||
		(origin[3] && (Number(origin[3]) < 1 || Number(origin[3]) > 65535))
	) {
		throw new Error("로또 API 기본 주소를 확인해 주세요.");
	}
	const protocol = origin[1].toLowerCase();
	const host = origin[2].toLowerCase();
	const local = appEnv === "local";
	const octets = host.split(".").map(Number);
	const privateIp =
		/^\d+\.\d+\.\d+\.\d+$/.test(host) &&
		octets.every((n) => n >= 0 && n <= 255) &&
		(octets[0] === 10 ||
			octets[0] === 127 ||
			(octets[0] === 192 && octets[1] === 168) ||
			(octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
	const localHost = privateIp || host === "localhost" || host === "[::1]";
	if (local && !localHost)
		throw new Error(
			"로컬 테스트는 localhost 또는 사설 IP의 API에서만 사용할 수 있어요.",
		);
	if (!local && (protocol !== "https" || localHost))
		throw new Error("운영 앱에는 HTTPS 운영 API 주소를 설정해 주세요.");
	return {
		apiBase: `${protocol}://${host}${origin[3] ? `:${origin[3]}` : ""}`,
		local,
		storageKey: local ? "645-live.local" : "645-live",
	};
}
