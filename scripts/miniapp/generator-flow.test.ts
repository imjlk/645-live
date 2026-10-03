import { expect, test } from "bun:test";

test("single generation preserves publication receipts, retry identity, cadence and attendance refresh", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/generator-flow.fixture.tsx`],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const [code, stdout, stderr] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	expect({ code, error: code === 0 ? "" : stderr }).toEqual({
		code: 0,
		error: "",
	});
	expect(stdout).toContain(
		"generator publication receipts and single-generation flow passed",
	);
});
