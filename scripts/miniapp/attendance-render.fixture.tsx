// Isolate native mocks from the API tests.
import { expect, mock } from "bun:test";
import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { LottoModel } from "../../apps/toss/src/use-lotto";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const alert = mock(() => {});
mock.module(
	Bun.resolveSync("react", `${import.meta.dir}/../../apps/toss`),
	() => React,
);
mock.module("react-native", () => ({
	Alert: { alert },
	View: "view",
	Text: "text",
	StyleSheet: { create: (v: unknown) => v },
}));
mock.module("@toss/tds-react-native", () => ({ Button: "button" }));
mock.module("../../apps/toss/src/api", () => ({ LOCAL_PREVIEW: false }));
mock.module("../../apps/toss/src/theme", () => ({ useTheme: () => ({}) }));
const { createPromotionRefresh: createRefresh } = await import(
	"../../apps/toss/src/promotion-refresh"
);
const timers: (() => void)[] = [];
mock.module("../../apps/toss/src/promotion-refresh", () => ({
	createPromotionRefresh: (refresh: (ids: string[]) => Promise<unknown>) =>
		createRefresh(refresh, (fn) => {
			timers.push(fn);
			return () => {
				const index = timers.indexOf(fn);
				if (index >= 0) timers.splice(index, 1);
			};
		}),
}));
const { AttendancePanel } = await import("../../apps/toss/src/AttendancePanel");
const refresh = mock(async () => {});
function model(status: string) {
	const reward = {
		kind: "daily",
		amount: 1,
		claimId: "existing",
		status,
		eligible: false,
		available: false,
	};
	return {
		user: {},
		busy: null,
		refreshPromotionClaims: refresh,
		attendance: {
			checkedIn: true,
			generatedToday: true,
			streak: 1,
			promotions: [reward],
			promotionHistory: [reward],
		},
	} as unknown as LottoModel;
}
let root: ReactTestRenderer;
await act(async () => {
	root = create(
		<AttendancePanel model={model("success")} onGenerate={() => {}} />,
	);
});
function labels() {
	return root.root
		.findAllByType("button")
		.map((button) => button.props.children);
}
for (const status of ["success", "recorded", "already_claimed", "pending"]) {
	await act(async () => {
		root.update(
			<AttendancePanel model={model(status)} onGenerate={() => {}} />,
		);
	});
	expect(labels()).toEqual(["오늘 출석 완료"]);
}
await act(async () => {
	root.update(
		<AttendancePanel model={model("needs_review")} onGenerate={() => {}} />,
	);
});
expect(labels()).toContain("지급 상태 확인");
expect(labels()).toContain("지급 확인");
const checkIn = mock(async () => true);
const restore = {
	...model("success"),
	checkIn,
	adConfig: {
		placements: [{ placement: "attendance_restore", enabled: true }],
	},
	attendance: {
		...model("success").attendance,
		checkedIn: false,
		canRestore: true,
		restoreAfterGeneration: false,
	},
} as LottoModel;
await act(async () => {
	root.update(<AttendancePanel model={restore} onGenerate={() => {}} />);
});
expect(labels()).toContain("광고 보고 연속 출석 복구");
expect(labels()).toContain("오늘 출석하기");
await act(async () => {
	root.root
		.findAllByType("button")
		.find((button) => button.props.children === "오늘 출석하기")
		?.props.onPress();
});
expect(checkIn).not.toHaveBeenCalled();
expect(alert).toHaveBeenCalledTimes(1);
await act(async () => {
	alert.mock.calls[0]?.[2]?.[1]?.onPress();
});
expect(checkIn).toHaveBeenCalledTimes(1);
let generateCalls = 0;
await act(async () => {
	root.update(
		<AttendancePanel
			model={{
				...restore,
				attendance: {
					...restore.attendance,
					generatedToday: false,
					canRestore: false,
					restoreAfterGeneration: true,
				},
			}}
			onGenerate={() => generateCalls++}
		/>,
	);
});
expect(labels()).toContain("번호 만들고 복구하기");
expect(labels()).not.toContain("오늘 번호 만들기");
await act(async () => {
	root.root
		.findAllByType("button")
		.find((button) => button.props.children === "번호 만들고 복구하기")
		?.props.onPress();
});
expect(generateCalls).toBe(1);
expect(refresh).not.toHaveBeenCalled();
for (let i = 0; i < 5; i++) {
	await act(async () => {
		root.update(
			<AttendancePanel model={model("pending")} onGenerate={() => {}} />,
		);
	});
	await act(async () => {
		timers.shift()?.();
	});
	await act(async () => {
		root.update(
			<AttendancePanel
				model={{ ...model("pending"), busy: "promotion" }}
				onGenerate={() => {}}
			/>,
		);
	});
	expect(timers).toHaveLength(0);
}
expect(refresh).toHaveBeenCalledTimes(3);
await act(async () => {
	root.unmount();
});
expect(timers).toHaveLength(0);
console.log("attendance reward actions passed");
