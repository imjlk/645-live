import { expect, test } from "bun:test";

test("nested overlays restore Back ownership without enabling tabs prematurely", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/overlay-stack.fixture.tsx`],
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
	expect(out).toContain(
		"overlay ownership survives nested and out-of-order cleanup",
	);
});
