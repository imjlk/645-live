import { expect, test } from "bun:test";

test("the app integrates real kit session restoration without losing identity or retrying bootstrap on outages", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/session-restore.fixture.ts`],
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
		"anonymous restore, refresh, outage, identity, and cancellation passed",
	);
});
