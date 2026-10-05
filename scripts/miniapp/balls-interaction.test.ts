import { expect, test } from "bun:test";

test("number balls support individual statistics actions and retain read-only accessibility", async () => {
	const child = Bun.spawn(
		[process.execPath, `${import.meta.dir}/balls-interaction.fixture.tsx`],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const [code, output, error] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	expect({ code, error: code === 0 ? "" : error }).toEqual({
		code: 0,
		error: "",
	});
	expect(output).toContain("number balls expose individual actions");
});
