import { expect, test } from "bun:test";

test("batch generation integrates with real request retries, recent numbers and one attendance refresh", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/generation-batch.fixture.tsx`],
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
	expect(stdout).toContain("generation batch model integration passed");
});
