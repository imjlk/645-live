import { expect, test } from "bun:test";

test("malformed or unavailable optional activity previews preserve the history draw", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/activity-preview.fixture.ts`],
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
		"optional malformed activity never suppresses draw results",
	);
});
