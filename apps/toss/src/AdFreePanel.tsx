import { useMemo } from "react";
import { hasAdFreeOffer, type PurchaseEntryPoint } from "./ad-free";
import { LOCAL_PREVIEW } from "./api";
import { createPurchaseEntryTelemetry } from "./purchase-entry-telemetry";
import { adTelemetry } from "./telemetry";
import { useTheme } from "./theme";
import type { LottoModel } from "./use-lotto";
import { Button } from "./web/controls";
import { StyleSheet, Text, View } from "./web/primitives";
import { ImpressionArea } from "./web/viewport";

export function AdFreePanel({
	state,
	entryPoint = "settings",
	active = true,
	loadingConfig = false,
}: {
	state: LottoModel["adFree"];
	entryPoint?: PurchaseEntryPoint;
	active?: boolean;
	loadingConfig?: boolean;
}) {
	const theme = useTheme();
	const metrics = useMemo(
		() => createPurchaseEntryTelemetry(adTelemetry, entryPoint),
		[entryPoint],
	);
	const available = hasAdFreeOffer(state);
	return (
		<View style={s.content}>
			<ImpressionArea
				enabled={active && !state.owned}
				areaThreshold={0.5}
				timeThreshold={1000}
				onImpressionStart={() => {
					if (active && !state.owned)
						metrics.infoViewed(available ? "price_ready" : "price_unavailable");
				}}
			>
				<View>
					<Text
						accessibilityRole="header"
						style={[s.title, { color: theme.text }]}
					>
						배너·번호 생성 광고 제거
					</Text>
					<Text style={[s.subtitle, { color: theme.muted }]}>
						{state.owned
							? "구매한 상품을 이용 중이에요."
							: "한 번 구매하면 계속 이용할 수 있어요."}
					</Text>
				</View>
			</ImpressionArea>
			<View style={[s.benefits, { backgroundColor: theme.surface }]}>
				<View style={s.row}>
					<Text style={[s.label, { color: theme.muted }]}>제거되는 광고</Text>
					<Text style={[s.value, { color: theme.text }]}>
						화면 배너 · 번호 생성 광고
					</Text>
				</View>
				<View style={[s.row, s.divider, { borderColor: theme.line }]}>
					<Text style={[s.label, { color: theme.muted }]}>
						별도로 남는 광고
					</Text>
					<Text style={[s.value, { color: theme.text }]}>
						맞춤 설정 · 상세 분석 · 출석 복구
					</Text>
				</View>
			</View>
			{available ? (
				<ImpressionArea
					enabled={active}
					areaThreshold={0.5}
					timeThreshold={1000}
					onImpressionStart={() => {
						if (active) metrics.ctaViewed();
					}}
				>
					<Button
						display="block"
						disabled={state.busy || !active}
						onPress={() => {
							if (!active || state.busy) return;
							metrics.clicked();
							void state.purchase(entryPoint);
						}}
					>
						{state.price}에 구매하기
					</Button>
				</ImpressionArea>
			) : !state.owned &&
				!state.message &&
				!(LOCAL_PREVIEW && !state.enabled) ? (
				<Text
					accessibilityLiveRegion="polite"
					style={[s.body, { color: theme.muted }]}
				>
					{loadingConfig || (state.enabled && (!state.checked || state.busy))
						? "상품 정보를 확인하고 있어요."
						: "지금은 상품 가격을 확인할 수 없어요."}
				</Text>
			) : null}
			{state.enabled ? (
				<View style={{ alignItems: "center" }}>
					<Button
						display="inline"
						size="small"
						type="dark"
						style="weak"
						disabled={state.busy || !active}
						onPress={() => {
							if (active && !state.busy) void state.restore();
						}}
					>
						구매 복원
					</Button>
				</View>
			) : LOCAL_PREVIEW ? (
				<Text style={[s.body, { color: theme.muted }]}>
					로컬 미리보기예요. 상품 가격 확인과 구매는 토스 앱에서 할 수 있어요.
				</Text>
			) : null}
			{state.message ? (
				<Text
					accessibilityLiveRegion="polite"
					style={[s.body, { color: theme.muted }]}
				>
					{state.message}
				</Text>
			) : null}
		</View>
	);
}

const s = StyleSheet.create({
	content: { gap: 12 },
	title: {
		fontSize: 28,
		lineHeight: 38,
		fontWeight: "700",
		letterSpacing: -0.6,
	},
	subtitle: { marginTop: 8, fontSize: 16, lineHeight: 24 },
	benefits: { marginVertical: 12, paddingHorizontal: 20, borderRadius: 20 },
	row: { gap: 4, paddingVertical: 16 },
	divider: { borderTopWidth: 1 },
	label: { fontSize: 13, lineHeight: 20, fontWeight: "600" },
	value: { fontSize: 17, lineHeight: 25, fontWeight: "600" },
	body: { fontSize: 14, lineHeight: 22 },
});
