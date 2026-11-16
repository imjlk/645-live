import type { ReactNode } from "react";
import type { createActionTelemetryScope } from "./action-telemetry";
import { ImpressionArea } from "./web/viewport";

export function ActionImpression({
	scope,
	action,
	source,
	impressionKey,
	active,
	bottomInset = 0,
	children,
}: {
	scope: ReturnType<typeof createActionTelemetryScope>;
	action: "generation_cta" | "save_cta";
	source: "generator" | "recent" | "attendance";
	impressionKey: string;
	active: boolean;
	bottomInset?: number;
	children: (trackClick: () => void) => ReactNode;
}) {
	const telemetry = scope(action, source);
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
