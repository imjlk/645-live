// Isolate native mocks from the API tests.
import { expect, mock } from "bun:test";
import * as React from "react";
import type { ReactTestRenderer } from "react-test-renderer";
import type { LottoModel } from "../../apps/toss/src/use-lotto";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const alert = mock(() => {});
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

mock.module("../../apps/toss/src/web/primitives", () => ({
	Alert: { alert },
	View: "view",
	Pressable: "button",
	Text: "text",
	StyleSheet: { create: (v: unknown) => v },
}));
mock.module("../../apps/toss/src/web/controls", () => ({ Button: "button" }));
mock.module("../../apps/toss/src/api", () => ({ LOCAL_PREVIEW: false }));
mock.module("../../apps/toss/src/web/viewport", () => ({
	ImpressionArea: ({
		children,
		...props
	}: React.PropsWithChildren<Record<string, unknown>>) =>
		React.createElement("exposure", props, children),
}));
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
// Generation can update local state before the attendance refresh completes.
// Checking in during that window must still warn about the missed-day restore.
await act(async () => {
	root.update(
		<AttendancePanel
			model={{
				...restore,
				attendance: {
					...restore.attendance,
					canRestore: false,
					restoreAfterGeneration: true,
				},
			}}
			onGenerate={() => {}}
		/>,
	);
});
alert.mockClear();
checkIn.mockClear();
await act(async () => {
	root.root
		.findAllByType("button")
		.find((button) => button.props.children === "오늘 출석하기")
		?.props.onPress();
});
expect(alert).toHaveBeenCalledTimes(1);
expect(checkIn).not.toHaveBeenCalled();
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

const purchase = mock(async (_entryPoint?: string) => {});
const restorePurchase = mock(async () => {});
const openAdFree = mock(() => {});
const adFree = {
	enabled: true,
	owned: false,
	checked: true,
	busy: false,
	price: "11,990원",
	message: "",
	purchase,
	restore: restorePurchase,
};
await act(async () => {
	root = create(
		<AttendancePanel
			model={{ ...model("success"), adFree }}
			onGenerate={() => {}}
			onAdFree={openAdFree}
		/>,
	);
});
expect(labels()).toContain("광고 제거 알아보기");
root.root
	.findAllByType("button")
	.find((button) => button.props.children === "광고 제거 알아보기")
	?.props.onPress();
expect(openAdFree).toHaveBeenCalledTimes(1);
expect(purchase).not.toHaveBeenCalled();
for (const state of [
	{ ...adFree, owned: true },
	{ ...adFree, enabled: false },
]) {
	await act(async () => {
		root.update(
			<AttendancePanel
				model={{ ...model("success"), adFree: state }}
				onGenerate={() => {}}
				onAdFree={openAdFree}
			/>,
		);
	});
	expect(labels()).not.toContain("광고 제거 알아보기");
}
const purchaseEntry = {
	infoViewed: mock(() => {}),
	ctaViewed: mock(() => {}),
	clicked: mock(() => {}),
};
mock.module("../../apps/toss/src/purchase-entry-telemetry", () => ({
	createPurchaseEntryTelemetry: () => purchaseEntry,
}));
const { AdFreePanel } = await import("../../apps/toss/src/AdFreePanel");
await act(async () => {
	root.update(<AdFreePanel state={adFree} entryPoint="attendance" />);
});
root.root
	.findAllByType("button")
	.find((button) => button.props.children?.includes?.("에 구매하기"))
	?.props.onPress();
expect(purchase).toHaveBeenCalledWith("attendance");
expect(purchaseEntry.clicked).toHaveBeenCalledTimes(1);
const exposures = root.root.findAllByType("exposure");
exposures.forEach((e) => {
	e.props.onImpressionStart();
});
expect(purchaseEntry.infoViewed).toHaveBeenCalledWith("price_ready");
expect(purchaseEntry.ctaViewed).toHaveBeenCalledTimes(1);
await act(async () => {
	root.update(
		<AdFreePanel state={adFree} entryPoint="attendance" active={false} />,
	);
});
root.root.findAllByType("exposure").forEach((e) => {
	expect(e.props.enabled).toBe(false);
	e.props.onImpressionStart();
});
root.root
	.findAllByType("button")
	.find((b) => b.props.children?.includes?.("에 구매하기"))
	?.props.onPress();
expect(purchaseEntry.infoViewed).toHaveBeenCalledTimes(1);
expect(purchaseEntry.ctaViewed).toHaveBeenCalledTimes(1);
expect(purchaseEntry.clicked).toHaveBeenCalledTimes(1);
expect(purchase).toHaveBeenCalledTimes(1);

root.root
	.findAllByType("button")
	.find((button) => button.props.children === "구매 복원")
	?.props.onPress();
expect(restorePurchase).toHaveBeenCalledTimes(1);
await act(async () => {
	root.update(<AdFreePanel state={{ ...adFree, owned: true }} />);
});
expect(labels()).toEqual(["구매 복원"]);
await act(async () => root.unmount());
await act(async () => {
	root = create(
		<AttendancePanel
			model={model("success")}
			onGenerate={() => {}}
			afterAttendance={<button type="button">이 번호 보관하기</button>}
		/>,
	);
});
expect(JSON.stringify(root.toJSON())).toContain(
	"내일도 번호 한 번, 출석 한 번",
);
expect(labels()).toContain("이 번호 보관하기");
await act(async () => {
	root.update(
		<AttendancePanel
			model={
				{
					...model("success"),
					attendance: { ...model("success").attendance, checkedIn: false },
				} as LottoModel
			}
			onGenerate={() => {}}
			afterAttendance={<button type="button">이 번호 보관하기</button>}
		/>,
	);
});
expect(labels()).not.toContain("이 번호 보관하기");
await act(async () => root.unmount());

const journeyEvents: string[] = [];
mock.module("../../apps/toss/src/journey-telemetry", () => ({
	createJourneyFlow: () => ({
		track: (event: string) => journeyEvents.push(event),
	}),
}));

const { GeneratorAttendanceEntry } = await import(
	"../../apps/toss/src/GeneratorAttendanceEntry"
);
let opened = 0;
const ready = {
	...model("eligible").attendance,
	day: 1,
	checkedIn: false,
	canCheckIn: true,
	generatedToday: true,
	promotions: [{ kind: "daily", amount: 1, available: true }],
} as LottoModel["attendance"];
await act(async () => {
	root = create(
		<GeneratorAttendanceEntry
			attendance={ready}
			active={false}
			onPress={() => {
				opened++;
			}}
		/>,
	);
});
root.root.findByType("exposure").props.onImpressionStart();
expect(journeyEvents).toEqual([]);
await act(async () => {
	root.update(
		<GeneratorAttendanceEntry
			attendance={ready}
			active
			onPress={() => {
				opened++;
			}}
		/>,
	);
});
root.root.findByType("exposure").props.onImpressionStart();
root.root.findByType("exposure").props.onImpressionStart();
expect(journeyEvents).toEqual(["attendance_entry_viewed"]);
root.root.findByType("button").props.onPress();
expect(opened).toBe(1);
expect(journeyEvents).toEqual([
	"attendance_entry_viewed",
	"attendance_entry_clicked",
]);
expect(JSON.stringify(root.toJSON())).toContain(
	"번호 완성! 오늘 출석도 잊지 마세요",
);
await act(async () => root.unmount());
