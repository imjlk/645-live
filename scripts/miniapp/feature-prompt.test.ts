import { expect, test } from "bun:test";

test("detail prompt waits for TDS dismissal and suppresses stale or cancelled actions", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/feature-prompt.fixture.tsx`],
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
		"feature continuation ordering and cancellation passed",
	);
});
