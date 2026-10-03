import {
	getOperationalEnvironment,
	InlineAd,
	isMinVersionSupported,
} from "@apps-in-toss/framework";
import { useIsFocused } from "@granite-js/native/@react-navigation/native";
import { InView, IOContext, useVisibility } from "@granite-js/react-native";
import { isAppsInTossInlineAdSupported } from "@trailbase-apps-in-toss-kit/ait-rn/inline-ads";
import {
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { type AdMetric, createAdFlow } from "./ad-telemetry";
import { LOCAL_PREVIEW } from "./api";
import { adTelemetry } from "./telemetry";
import { useTheme } from "./theme";

const SLOT_FORMAT = {
	generator: "inline",
	saved: "card",
	live_feed: "inline",
	insights_summary: "card",
	insights_patterns: "inline",
} as const;
export type BannerPlacement = keyof typeof SLOT_FORMAT;
const HIDDEN_RETENTION_MS = 60_000;

type BannerProps = {
	groupId: string | null | undefined;
	placement: BannerPlacement;
};
/** Retain requested SDK slots during short absences; never preload hidden slots. */
export const Banner = memo(function Banner(props: BannerProps) {
	const focused = useIsFocused();
	const visible = useVisibility() && focused;
	const { manager } = useContext(IOContext);
	const hasIO = !!manager;
	const key = `${props.placement}:${props.groupId}`;
	const [retainedKey, setRetainedKey] = useState<string | null>(null);
	const retain = useCallback(() => setRetainedKey(key), [key]);
	useEffect(() => {
		if (!hasIO) {
			setRetainedKey(null);
			return;
		}
		if (visible || retainedKey !== key) return;
		const timer = setTimeout(() => {
			setRetainedKey((current) => (current === key ? null : current));
		}, HIDDEN_RETENTION_MS);
		return () => clearTimeout(timer);
	}, [visible, retainedKey, key, hasIO]);
	// InlineAd mounts ImpressionArea only after an ad fills. Prevent that
	// delayed crash in portals/plain ScrollViews without inventing an IO root.
	const format = SLOT_FORMAT[props.placement];
	return (visible || retainedKey === key) &&
		hasIO &&
		format &&
		props.groupId ? (
		<BannerSlot
			key={key}
			groupId={props.groupId}
			format={format}
			placement={props.placement}
			visible={visible}
			onRequested={retain}
		/>
	) : null;
});

function BannerSlot({
	groupId,
	format,
	placement,
	visible,
	onRequested,
}: {
	placement: BannerPlacement;
	groupId: string;
	format: "card" | "inline";
	visible: boolean;
	onRequested: () => void;
}) {
	const [supported, setSupported] = useState<boolean | null>(null);
	const [entered, setEntered] = useState(false);
	const [rendered, setRendered] = useState(false);
	const [unavailable, setUnavailable] = useState(false);
	const theme = useTheme();
	const active = useRef(true);
	const hasRendered = useRef(false);
	const screenVisible = useRef(visible);
	screenVisible.current = visible;
	const flow = useMemo(
		() =>
			createAdFlow(adTelemetry, { placement, format, entryPoint: "banner" }),
		[placement, format],
	);
	const track = (event: AdMetric) => {
		if (active.current) flow.track(event);
	};
	const trackVisible = (event: AdMetric) => {
		if (screenVisible.current) track(event);
	};
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
		};
	}, []);
	useEffect(() => {
		if (entered && supported === true) {
			flow.track("banner_requested");
			onRequested();
		}
	}, [entered, supported, flow, onRequested]);
	useEffect(() => {
		if (!entered) return;
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
	}, [entered]);
	const preview =
		LOCAL_PREVIEW && !rendered && (supported !== true || unavailable);
	if (supported === false && !preview) return null;
	if (unavailable && !preview) return null;
	return (
		<InView
			// FlatList overscan can mount many slots beyond the viewport. A real,
			// non-zero placeholder lets IO observe them without requesting an ad.
			onChange={(inView, ratio) => {
				if (active.current && screenVisible.current && inView && ratio >= 0.5) {
					flow.track("banner_slot_viewed");
					setEntered(true);
				}
			}}
			accessibilityLabel="광고"
			style={{
				width: "100%",
				marginTop: 24,
				marginBottom: placement === "generator" ? 0 : 24,
				minHeight: !rendered ? (format === "card" ? 156 : 76) : undefined,
			}}
		>
			{entered && supported && !unavailable ? (
				<View style={format === "card" ? s.cardSlot : undefined}>
					<InlineAd
						adGroupId={groupId}
						theme="auto"
						tone="grey"
						variant={format === "card" ? "card" : "expanded"}
						onAdRendered={() => {
							if (!active.current) return;
							hasRendered.current = true;
							setRendered(true);
							track("banner_rendered");
						}}
						onAdViewable={() => trackVisible("banner_viewable")}
						onAdImpression={() => trackVisible("banner_impression")}
						onAdClicked={() => trackVisible("banner_clicked")}
						onNoFill={() => {
							if (!active.current) return;
							track("banner_no_fill");
							// The SDK keeps its filled creative during a failed refresh.
							if (hasRendered.current) return;
							setUnavailable(true);
							active.current = false;
						}}
						onAdFailedToRender={({ error }) => {
							if (!active.current) return;
							track("banner_failed");
							if (LOCAL_PREVIEW)
								console.info(
									`[645 local] ${format} banner unavailable (${error.code}).`,
								);
							if (hasRendered.current) return;
							setUnavailable(true);
							active.current = false;
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
		</InView>
	);
}

const s = StyleSheet.create({
	// InlineAd 2.10.10 adds 10px on both sides of a card. Keep the card's
	// visible surface aligned with the surrounding 20px content gutter.
	cardSlot: { marginHorizontal: -10 },
});
