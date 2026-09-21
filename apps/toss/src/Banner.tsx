import {
	getOperationalEnvironment,
	InlineAd,
	isMinVersionSupported,
} from "@apps-in-toss/framework";
import { IOContext, useVisibility } from "@granite-js/react-native";
import { isAppsInTossInlineAdSupported } from "@trailbase-apps-in-toss-kit/ait-rn/inline-ads";
import { memo, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { type AdMetric, createAdFlow } from "./ad-telemetry";
import { LOCAL_PREVIEW } from "./api";
import { adTelemetry } from "./telemetry";
import { useTheme } from "./theme";

const SLOT_FORMAT = {
	generator: "inline",
	saved: "card",
	live_feed: "inline",
} as const;
export type BannerPlacement = keyof typeof SLOT_FORMAT;

type BannerProps = {
	groupId: string | null | undefined;
	placement: BannerPlacement;
};
/** A new group resets SDK state; SSE updates never change the slot's assigned group. */
export const Banner = memo(function Banner(props: BannerProps) {
	const visible = useVisibility();
	const { manager } = useContext(IOContext);
	// InlineAd mounts ImpressionArea only after an ad fills. Prevent that
	// delayed crash in portals/plain ScrollViews without inventing an IO root.
	const format = SLOT_FORMAT[props.placement];
	return visible && manager && format && props.groupId ? (
		<BannerSlot
			key={`${props.placement}:${props.groupId}`}
			groupId={props.groupId}
			format={format}
			placement={props.placement}
		/>
	) : null;
});

function BannerSlot({
	groupId,
	format,
	placement,
}: {
	placement: BannerPlacement;
	groupId: string;
	format: "card" | "inline";
}) {
	const [supported, setSupported] = useState<boolean | null>(null);
	const [rendered, setRendered] = useState(false);
	const [unavailable, setUnavailable] = useState(false);
	const theme = useTheme();
	const active = useRef(true);
	const flow = useMemo(
		() => createAdFlow(adTelemetry, { placement, format }),
		[placement, format],
	);
	const track = (event: AdMetric) => {
		if (active.current) flow.track(event);
	};
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
		};
	}, []);
	useEffect(() => {
		let active = true;
		void isAppsInTossInlineAdSupported({
			InlineAd,
			getOperationalEnvironment,
			isMinVersionSupported,
		})
			.then((value) => {
				if (active) setSupported(value);
			})
			.catch(() => {
				if (active) setSupported(false);
			});
		return () => {
			active = false;
		};
	}, []);
	const preview =
		LOCAL_PREVIEW && !rendered && (supported !== true || unavailable);
	if (supported !== true && !preview) return null;
	return (
		<View
			accessibilityLabel="광고"
			style={{ width: "100%", marginVertical: rendered || preview ? 24 : 0 }}
		>
			{supported ? (
				<View style={format === "card" ? s.cardSlot : undefined}>
					<InlineAd
						adGroupId={groupId}
						theme="auto"
						tone="grey"
						variant={format === "card" ? "card" : "expanded"}
						onAdRendered={() => {
							if (active.current) setRendered(true);
							track("banner_rendered");
						}}
						onAdViewable={() => track("banner_viewable")}
						onAdClicked={() => track("banner_clicked")}
						onNoFill={() => {
							if (active.current) setUnavailable(true);
							track("banner_no_fill");
						}}
						onAdFailedToRender={({ error }) => {
							if (active.current) setUnavailable(true);
							track("banner_failed");
							if (LOCAL_PREVIEW)
								console.info(
									`[645 local] ${format} banner unavailable (${error.code}).`,
								);
						}}
					/>
				</View>
			) : null}
			{preview ? (
				<View
					style={{
						minHeight: format === "card" ? 156 : 76,
						padding: 20,
						gap: 8,
						justifyContent: "center",
						borderRadius: format === "card" ? 16 : 0,
						backgroundColor: theme.surface,
					}}
				>
					<Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
						로컬 미리보기 ·{" "}
						{format === "card" ? "카드형 이미지 광고" : "인라인 텍스트 광고"}
					</Text>
					<Text style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
						광고를 불러올 수 없는 환경에서 위치를 보여드려요.
					</Text>
				</View>
			) : null}
		</View>
	);
}

const s = StyleSheet.create({
	// InlineAd 2.10.10 adds 10px on both sides of a card. Keep the card's
	// visible surface aligned with the surrounding 20px content gutter.
	cardSlot: { marginHorizontal: -10 },
});
