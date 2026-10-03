import { Button } from "@toss/tds-react-native";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { AdCtaImpression } from "./AdCtaImpression";
import { type AdFlow, adPolicyLabel } from "./ad-telemetry";
import { GENERATION_BATCH_SIZE } from "./generation-batch";
import { useTheme } from "./theme";
import type { LottoModel } from "./use-lotto";
import { RECENT_LIMIT } from "./ux-state";

export function GenerationBatchAction({
	model,
	onGenerate,
	onCompleted,
}: {
	model: Pick<
		LottoModel,
		| "canGenerateMany"
		| "batchProgress"
		| "busy"
		| "generationCooling"
		| "user"
		| "context"
		| "adConfig"
		| "recent"
		| "saved"
	>;
	onGenerate: (flow: AdFlow | undefined) => Promise<boolean>;
	onCompleted: () => void;
}) {
	const theme = useTheme();
	const active = useRef(true);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
		};
	}, []);
	const { remaining, completed, phase } = model.batchProgress;
	if (!model.canGenerateMany && !remaining) return null;
	const resuming = phase === "paused";
	const working = model.busy === "generate-batch";
	const toGenerate = remaining || GENERATION_BATCH_SIZE;
	const unsavedAtRisk = model.recent
		.slice(RECENT_LIMIT - toGenerate)
		.some(
			(item) => !model.saved.some((saved) => saved.generationId === item.id),
		);
	let description =
		"광고 한 번 완료 후 여러 조합을 비교하고 마음에 드는 번호를 보관해 보세요.";
	if (resuming)
		description =
			"광고를 다시 보지 않고, 앞서 선택한 조건으로 이어서 만들어요.";
	if (working)
		description =
			phase === "ad"
				? "광고를 준비하고 있어요."
				: `${completed}/${GENERATION_BATCH_SIZE}개 만드는 중이에요.`;
	return (
		<View style={{ marginTop: 12, gap: 8 }}>
			<AdCtaImpression
				enabled={!remaining}
				entryPoint="batch"
				policy={adPolicyLabel(model.adConfig?.generationAdPolicy)}
			>
				{(runAttempt) => (
					<Button
						display="full"
						style="weak"
						loading={working}
						disabled={
							!!model.busy ||
							model.generationCooling ||
							!model.user ||
							!model.context
						}
						onPress={() => {
							void runAttempt(async (flow) => {
								if (await onGenerate(flow)) {
									if (active.current) onCompleted();
								}
							});
						}}
					>
						{resuming
							? `남은 ${remaining}개 이어서 만들기`
							: `광고 보고 조합 ${GENERATION_BATCH_SIZE}개 만들기`}
					</Button>
				)}
			</AdCtaImpression>
			<Text style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
				{description}
			</Text>
			{!working && unsavedAtRisk ? (
				<Text style={{ fontSize: 13, lineHeight: 19, color: theme.muted }}>
					최근 목록은 {RECENT_LIMIT}개까지 기억해요. 남겨둘 번호가 있다면 먼저
					보관해 주세요.
				</Text>
			) : null}
		</View>
	);
}
