import { AdFreePanel } from "./AdFreePanel";
import type { PurchaseEntryPoint } from "./ad-free";
import { useLottoContext } from "./LottoProvider";
import { useSafeAreaInsets } from "./web/safe-area";
import { IOScrollView, useVisibility } from "./web/viewport";

export function AdFreeScreen({
	entryPoint,
}: {
	entryPoint: PurchaseEntryPoint;
}) {
	const { model } = useLottoContext();
	const visible = useVisibility();
	const insets = useSafeAreaInsets();
	return (
		<IOScrollView
			contentContainerStyle={{
				width: "100%",
				maxWidth: 540,
				alignSelf: "center",
				paddingHorizontal: 24,
				paddingTop: 32,
				paddingBottom: insets.bottom + 28,
			}}
		>
			<AdFreePanel
				state={model.adFree}
				entryPoint={entryPoint}
				active={visible && model.foreground}
				loadingConfig={!model.adConfig && !model.error}
			/>
		</IOScrollView>
	);
}
