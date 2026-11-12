import { useMemo } from "react";
import type { PurchaseEntryPoint } from "./ad-free";
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
}: {
	state: LottoModel["adFree"];
	entryPoint?: PurchaseEntryPoint;
	active?: boolean;
}) {
	const theme = useTheme();
	const metrics = useMemo(
		() => createPurchaseEntryTelemetry(adTelemetry, entryPoint),
		[entryPoint],
	);
	const available = !state.owned && state.enabled && !!state.price;
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
				<Text style={[s.title, { color: theme.text }]}>
					{state.owned ? "광고 제거 이용 중" : "한 번 구매로 광고 제거"}
				</Text>
				<Text style={[s.body, { color: theme.muted }]}>
					한 번 구매하면 배너와 번호 생성 광고가 사라져요. 맞춤 설정·분석·출석
					복구 광고는 별도예요.
				</Text>
			</ImpressionArea>
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
						display="full"
						disabled={state.busy}
						onPress={() => {
							if (!active || state.busy) return;
							metrics.clicked();
							void state.purchase(entryPoint);
						}}
					>
						{state.price}에 구매하기
					</Button>
				</ImpressionArea>
			) : null}
			{state.enabled ? (
				<Button
					display="full"
					type="dark"
					style="weak"
					disabled={state.busy}
					onPress={() => void state.restore()}
				>
					구매 복원
				</Button>
			) : LOCAL_PREVIEW ? (
				<Text style={[s.body, { color: theme.muted }]}>
					로컬 미리보기예요. 상품 가격 확인과 구매는 토스 앱에서 할 수 있어요.
				</Text>
			) : null}
			{state.message ? (
				<Text style={[s.body, { color: theme.muted }]}>{state.message}</Text>
			) : null}
		</View>
	);
}

const s = StyleSheet.create({
	content: { gap: 12 },
	title: { fontSize: 17, lineHeight: 25, fontWeight: "700" },
	body: { fontSize: 14, lineHeight: 22 },
});
