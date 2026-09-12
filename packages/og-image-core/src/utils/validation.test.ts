import { expect, test } from "bun:test";
import { validateOGImageOptions } from "./validation.js";

test("a bonus must accompany six numbers and be distinct from them", () => {
	const draw = { title: "로또 당첨번호", numbers: [11, 13, 19, 20, 31, 44] };
	expect(validateOGImageOptions({ ...draw, bonusNumber: 27 })).toBe(true);
	expect(validateOGImageOptions({ ...draw, bonusNumber: 11 })).toBe(false);
	expect(validateOGImageOptions({ title: "로또", bonusNumber: 27 })).toBe(
		false,
	);
});
