import { InlineAd } from "@apps-in-toss/framework";
import { memo } from "react";
import { View } from "react-native";

/** A stable mounted slot: realtime events never remount or manually refresh the ad. */
export const Banner = memo(function Banner({
	groupId,
}: {
	groupId: string | null | undefined;
}) {
	if (!groupId) return null;
	const isSupported = (
		InlineAd as typeof InlineAd & { isSupported?: () => boolean }
	).isSupported;
	try {
		if (isSupported && !isSupported()) return null;
	} catch {
		return null;
	}
	return (
		<View
			accessibilityLabel="광고"
			style={{ minHeight: 80, marginVertical: 24 }}
		>
			<InlineAd
				adGroupId={groupId}
				theme="auto"
				tone="grey"
				variant="expanded"
			/>
		</View>
	);
});
