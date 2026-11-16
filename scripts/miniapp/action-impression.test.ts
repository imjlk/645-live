import { expect, test } from "bun:test";

test("app-owned impressions survive real sheet remounts without suppressing clicks", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/action-impression.fixture.tsx`],
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
		"action impressions survive sheet unmount and remount",
	);
});
