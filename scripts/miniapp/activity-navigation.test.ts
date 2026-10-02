import { expect, test } from "bun:test";

test("result sheets preserve immediate analysis returns and reset subsequent direct entry", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/activity-navigation.fixture.tsx`],
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
		"analysis return and direct result reopen preserve the intended round",
	);
});
