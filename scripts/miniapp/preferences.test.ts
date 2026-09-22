import { expect, test } from "bun:test";

test("preference hydration never writes defaults and retains edits made while reading", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/preferences.fixture.tsx`],
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
		"preference hydration preserves stored values and early edits",
	);
});
