import { InlineAd, isMinVersionSupported } from "@apps-in-toss/framework";
import { memo, useState } from "react";
import { Text, View } from "react-native";
import { LOCAL_PREVIEW } from "./api";
import { useTheme } from "./theme";

/** A stable mounted slot: realtime events never remount or manually refresh the ad. */
export const Banner = memo(function Banner({
	groupId,
	format,
}: {
	groupId: string | null | undefined;
	format: "card" | "inline";
}) {
	const [rendered, setRendered] = useState(false);
	const [unavailable, setUnavailable] = useState(false);
	const theme = useTheme();
	const preview = LOCAL_PREVIEW && unavailable && !rendered;
	if (!groupId) return null;
	try {
		if (!isMinVersionSupported({ ios: "5.241.0", android: "5.241.0" }))
			return null;
	} catch {
		return null;
	}
	return (
		<View
			accessibilityLabel="광고"
			style={{ width: "100%", marginVertical: rendered || preview ? 24 : 0 }}
		>
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
});
