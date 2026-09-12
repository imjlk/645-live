export function normalizeText(text: string, limit = 240): string {
	return Array.from(text.normalize("NFC").replace(/\s+/g, " ").trim())
		.slice(0, limit)
		.join("");
}

function textWidth(text: string, fontSize: number): number {
	return Array.from(text).reduce((sum, character) => {
		const code = character.codePointAt(0) ?? 0;
		return (
			sum +
			(code >= 0x1100
				? 1
				: /[MW@]/.test(character)
					? 0.9
					: /\s/.test(character)
						? 0.3
						: 0.58) *
				fontSize
		);
	}, 0);
}

function wrap(text: string, fontSize: number, width: number): string[] {
	const lines: string[] = [];
	let line = "";
	for (const word of normalizeText(text).split(" ")) {
		const next = line ? `${line} ${word}` : word;
		if (textWidth(next, fontSize) <= width) {
			line = next;
			continue;
		}
		if (line) lines.push(line);
		line = "";
		for (const character of word) {
			if (line && textWidth(line + character, fontSize) > width) {
				lines.push(line);
				line = "";
			}
			line += character;
		}
	}
	if (line) lines.push(line);
	return lines;
}

function balancePair(
	text: string,
	fontSize: number,
	width: number,
	lines: string[],
) {
	if (lines.length !== 2) return lines;
	const words = normalizeText(text).split(" ");
	let best = lines;
	let score = Math.abs(
		textWidth(lines[0] ?? "", fontSize) - textWidth(lines[1] ?? "", fontSize),
	);
	for (let split = 1; split < words.length; split++) {
		const pair = [
			words.slice(0, split).join(" "),
			words.slice(split).join(" "),
		];
		const left = textWidth(pair[0] ?? "", fontSize);
		const right = textWidth(pair[1] ?? "", fontSize);
		const difference = Math.abs(left - right);
		if (left <= width && right <= width && difference < score) {
			best = pair;
			score = difference;
		}
	}
	return best;
}

/** Bounded wrapping keeps long Korean words and unspaced input inside the canvas. */
export function fitText(
	text: string,
	width: number,
	sizes: number[],
	maxLines: number,
) {
	let fontSize = sizes.at(-1) ?? 24;
	let lines: string[] = [];
	for (const size of sizes) {
		fontSize = size;
		lines = wrap(text, size, width);
		if (lines.length <= maxLines)
			return { lines: balancePair(text, fontSize, width, lines), fontSize };
	}
	lines = lines.slice(0, maxLines);
	let last = Array.from(lines.at(-1) ?? "");
	while (last.length && textWidth(`${last.join("")}…`, fontSize) > width)
		last = last.slice(0, -1);
	lines[lines.length - 1] = `${last.join("").trimEnd()}…`;
	return { lines, fontSize };
}
