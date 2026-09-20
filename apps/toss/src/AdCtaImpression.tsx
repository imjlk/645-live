import { ImpressionArea } from "@granite-js/react-native";
import { type PropsWithChildren, useMemo } from "react";
import { createAdFlow } from "./ad-telemetry";
import { adTelemetry } from "./telemetry";

/** Must stay inside the generator IOScrollView, outside modal portals. */
export function AdCtaImpression({
	enabled,
	policy,
	children,
}: PropsWithChildren<{ enabled: boolean; policy: string }>) {
	const flow = useMemo(
		() =>
			enabled
				? createAdFlow(adTelemetry, {
						placement: "generation_continue",
						policy,
					})
				: null,
		[enabled, policy],
	);
	return (
		<ImpressionArea
			enabled={enabled}
			areaThreshold={0.5}
			timeThreshold={1000}
			onImpressionStart={() => flow?.track("cta_viewed")}
		>
			{children}
		</ImpressionArea>
	);
}
