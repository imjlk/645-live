import { type ReactNode, useRef } from "react";
import { createJourneyFlow } from "./journey-telemetry";
import { ImpressionArea } from "./web/viewport";

export function JourneyImpression({
	children,
	active,
	impressionKey,
	event,
	outcome = "",
}: {
	children: ReactNode;
	active: boolean;
	impressionKey: string;
	event: "generation_cta_viewed" | "attendance_entry_viewed";
	outcome?: string;
}) {
	const seen = useRef(new Set<string>());
	return (
		<ImpressionArea
			enabled={active}
			areaThreshold={0.5}
			timeThreshold={1000}
			onImpressionStart={() => {
				if (!active || seen.current.has(impressionKey)) return;
				seen.current.add(impressionKey);
				createJourneyFlow("generator").track(event, outcome);
			}}
		>
			{children}
		</ImpressionArea>
	);
}
