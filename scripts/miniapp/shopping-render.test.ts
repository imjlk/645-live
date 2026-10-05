import { expect, test } from "bun:test";

test("shopping cards require real visibility, deduplicate reads and clicks, and clean up native listeners", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/shopping-render.fixture.tsx`],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const [code, out, err] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	expect({ code, error: code === 0 ? "" : err }).toEqual({
		code: 0,
		error: "",
	});
	expect(out).toContain("shopping visibility and navigation passed");
});
