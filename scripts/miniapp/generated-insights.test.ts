import { expect, test } from "bun:test";

test("generated insight screen owns its ads and optional overlays, cancels background work and reuses counts", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/generated-insights.fixture.tsx`],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const [code, output, error] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	expect({ code, error: code === 0 ? "" : error }).toEqual({
		code: 0,
		error: "",
	});
	expect(output).toContain(
		"generated insight screen lifecycle and cached preview passed",
	);
});
