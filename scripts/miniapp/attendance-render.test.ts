import { expect, test } from "bun:test";

test("paid and pending attendance rewards need no status button; failures remain recoverable", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/attendance-render.fixture.tsx`],
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
	expect(stdout).toContain("attendance reward actions passed");
});
