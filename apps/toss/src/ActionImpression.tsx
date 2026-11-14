import { type ReactNode, useMemo } from "react";
import { createActionTelemetry } from "./action-telemetry";
import { trackProduct } from "./telemetry";
import { ImpressionArea } from "./web/viewport";

export function ActionImpression({
	action,
	source,
	impressionKey,
	active,
	bottomInset = 0,
	children,
}: {
	action: "generation_cta" | "save_cta";
	source: "generator" | "recent" | "attendance";
	impressionKey: string;
	active: boolean;
	bottomInset?: number;
	children: (trackClick: () => void) => ReactNode;
}) {
	const telemetry = useMemo(
		() => createActionTelemetry(trackProduct, action, source),
		[action, source],
	);
	return (
		<ImpressionArea
			enabled={active}
			observationKey={impressionKey}
			bottomInset={bottomInset}
			areaThreshold={0.5}
			onImpressionStart={() => {
				if (active) telemetry.view(impressionKey);
			}}
		>
			{children(() => {
				if (active) telemetry.click(impressionKey);
			})}
		</ImpressionArea>
	);
}
