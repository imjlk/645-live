import { expect, test } from "bun:test";

test("result retries clear only result errors and data deletion resets persistent notification onboarding", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/lotto-recovery.fixture.tsx`],
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
		"saved-result retry and notification onboarding reset passed",
	);
});
