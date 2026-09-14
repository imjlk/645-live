import {
	getOperationalEnvironment,
	InlineAd,
	isMinVersionSupported,
} from "@apps-in-toss/framework";
import { isAppsInTossInlineAdSupported } from "@trailbase-apps-in-toss-kit/ait-rn/inline-ads";
import { memo, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { LOCAL_PREVIEW } from "./api";
import { useTheme } from "./theme";

type BannerProps = {
	groupId: string | null | undefined;
	format: "card" | "inline";
};
/** A new group resets SDK state; SSE updates never change the slot's assigned group. */
export const Banner = memo(function Banner(props: BannerProps) {
	return props.groupId ? (
		<BannerSlot
			key={`${props.format}:${props.groupId}`}
			groupId={props.groupId}
			format={props.format}
		/>
	) : null;
});

function BannerSlot({
	groupId,
	format,
}: {
	groupId: string;
	format: "card" | "inline";
}) {
	const [supported, setSupported] = useState<boolean | null>(null);
	const [rendered, setRendered] = useState(false);
	const [unavailable, setUnavailable] = useState(false);
	const theme = useTheme();
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
				<InlineAd
					adGroupId={groupId}
					theme="auto"
					tone="grey"
					variant={format === "card" ? "card" : "expanded"}
					onAdRendered={() => setRendered(true)}
					onNoFill={() => setUnavailable(true)}
					onAdFailedToRender={({ error }) => {
						setUnavailable(true);
						if (LOCAL_PREVIEW)
							console.info(
								`[645 local] ${format} banner unavailable (${error.code}).`,
							);
					}}
				/>
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
