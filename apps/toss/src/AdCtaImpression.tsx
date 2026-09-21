import { ImpressionArea } from "@granite-js/react-native";
import { type ReactNode, useEffect, useMemo, useReducer, useRef } from "react";
import { type AdFlow, createAdFlow } from "./ad-telemetry";
import { adTelemetry } from "./telemetry";

type RunAdAttempt = (
	action: (flow: AdFlow | undefined) => Promise<unknown>,
) => Promise<unknown>;
type Props = {
	enabled: boolean;
	policy: string;
	children: (runAttempt: RunAdAttempt) => ReactNode;
};

/** Must stay inside the generator IOScrollView, outside modal portals. */
export function AdCtaImpression(props: Props) {
	const [revision, rotate] = useReducer((value: number) => value + 1, 0);
	return (
		<CtaAttempt
			key={`${props.enabled}:${props.policy}:${revision}`}
			{...props}
			onSettled={rotate}
		/>
	);
}

function CtaAttempt({
	enabled,
	policy,
	children,
	onSettled,
}: Props & {
	onSettled: () => void;
}) {
	const active = useRef(true);
	const pending = useRef(false);
	const flow = useMemo(
		() =>
			enabled
				? createAdFlow(adTelemetry, {
						placement: "generation_continue",
						policy,
					})
				: undefined,
		[enabled, policy],
	);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
		};
	}, []);
	const runAttempt: RunAdAttempt = async (action) => {
		if (!active.current || pending.current) return;
		if (!flow) return action(undefined);
		pending.current = true;
		try {
			return await action(flow);
		} finally {
			// Keep the old handler locked until this attempt unmounts. A retry
			// gets a fresh flow AND a new viewport observation after settlement.
			if (active.current) onSettled();
		}
	};
	return (
		<ImpressionArea
			enabled={enabled}
			areaThreshold={0.5}
			timeThreshold={1000}
			onImpressionStart={() => {
				if (active.current && !pending.current) flow?.track("cta_viewed");
			}}
		>
			{children(runAttempt)}
		</ImpressionArea>
	);
}
