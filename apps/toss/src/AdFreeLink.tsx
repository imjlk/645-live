import { useMemo } from "react";
import type { PurchaseEntryPoint } from "./ad-free";
import { createPurchaseEntryTelemetry } from "./purchase-entry-telemetry";
import { adTelemetry } from "./telemetry";
import { Button } from "./web/controls";
import { ImpressionArea } from "./web/viewport";

export function AdFreeLink({
	entryPoint,
	active,
	measure,
	bottomInset = 0,
	onOpen,
	label = "광고 제거 알아보기",
}: {
	entryPoint: Exclude<PurchaseEntryPoint, "direct">;
	active: boolean;
	measure: boolean;
	bottomInset?: number;
	onOpen: () => boolean;
	label?: string;
}) {
	const metrics = useMemo(
		() =>
			active && measure
				? createPurchaseEntryTelemetry(adTelemetry, entryPoint)
				: null,
		[active, measure, entryPoint],
	);
	return (
		<ImpressionArea
			style={
				entryPoint === "settings" ? undefined : { alignSelf: "flex-start" }
			}
			bottomInset={bottomInset}
			enabled={!!metrics}
			areaThreshold={0.5}
			timeThreshold={1000}
			onImpressionStart={() => metrics?.linkViewed()}
		>
			<Button
				display={entryPoint === "settings" ? "full" : "inline"}
				size="medium"
				disabled={!active}
				type="dark"
				style="weak"
				onPress={() => {
					if (active && onOpen()) metrics?.linkClicked();
				}}
			>
				{label}
			</Button>
		</ImpressionArea>
	);
}
