import { expect, test } from "bun:test";

test("banner renders filled slots only inside visible Granite IO containers", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/banner-render.fixture.tsx`],
		{
			stdout: "pipe",
			stderr: "pipe",
		},
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
	expect(stdout).toContain("banner placement lifecycle passed");
});
