import { expect, mock } from "bun:test";
import * as React from "react";
import type { ReactTestRenderer } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
mock.module(
	Bun.resolveSync(
		"react",
		Bun.resolveSync(
			"react-test-renderer/package.json",
			import.meta.dir,
		).replace(/\/package.json$/, ""),
	),
	() => React,
);
const { act, create } = await import("react-test-renderer");

const events: { event: string; source: string }[] = [];
mock.module("../../apps/toss/src/telemetry", () => ({
	trackProduct: (event: string, source: string) =>
		events.push({ event, source }),
}));
mock.module("../../apps/toss/src/web/viewport", () => ({
	ImpressionArea: "impression",
}));
const preferences = {
	read: async () => ({ options: {}, liveColumns: 5 }),
	write: async () => {},
};
mock.module("../../apps/toss/src/use-lotto", () => ({
	useLotto: () => ({ preferences }),
}));
const { LottoProvider, useLottoContext } = await import(
	"../../apps/toss/src/LottoProvider"
);
const { ActionImpression } = await import(
	"../../apps/toss/src/ActionImpression"
);
function Sheet({
	candidate,
	source,
	active,
}: {
	candidate: string;
	source: "attendance" | "recent";
	active: boolean;
}) {
	const { actionTelemetry } = useLottoContext();
	return (
		<ActionImpression
			scope={actionTelemetry}
			action="save_cta"
			source={source}
			impressionKey={candidate}
			active={active}
		>
			{(onClick) => (
				<button type="button" onClick={onClick}>
					Save
				</button>
			)}
		</ActionImpression>
	);
}
let root: ReactTestRenderer;
const render = async (
	open: boolean,
	candidate = "private-first",
	source: "attendance" | "recent" = "attendance",
	active = true,
) => {
	await act(async () => {
		const tree = (
			<LottoProvider>
				{open ? (
					<Sheet candidate={candidate} source={source} active={active} />
				) : null}
			</LottoProvider>
		);
		if (root) root.update(tree);
		else root = create(tree);
	});
};
const expose = () =>
	root.root.findByType("impression").props.onImpressionStart();
const tap = () => root.root.findByType("button").props.onClick();
await render(true);
const first = root.root.findByType(ActionImpression);
expose();
tap();
await render(false);
expect(root.root.findAllByType(ActionImpression)).toHaveLength(0);
await render(true);
expect(root.root.findByType(ActionImpression)).not.toBe(first);
expose();
tap();
expect(events).toEqual([
	{ event: "save_cta_viewed", source: "attendance" },
	{ event: "save_cta_clicked", source: "attendance" },
	{ event: "save_cta_clicked", source: "attendance" },
]);
await render(true, "private-next");
tap();
expose();
await render(false);
await render(true, "private-first");
expose();
expect(events.filter((e) => e.event === "save_cta_viewed")).toHaveLength(2);
await render(true, "private-first", "recent", false);
expose();
tap();
expect(events).toHaveLength(5);
await render(true, "private-first", "recent");
expose();
expect(events.at(-1)).toEqual({ event: "save_cta_viewed", source: "recent" });
expect(JSON.stringify(events)).not.toContain("private-");
await act(async () => root.unmount());
console.log("action impressions survive sheet unmount and remount");
