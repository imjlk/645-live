import { expect, test } from "bun:test";

test("TDS prompt waits for exit before native consent and releases Back on dismissal", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/notification-prompt.fixture.tsx`],
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
	expect(out).toContain("notification prompt consent ordering passed");
});
