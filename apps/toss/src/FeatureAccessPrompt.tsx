import { ConfirmDialog } from "@toss/tds-react-native";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTabShell } from "./TabShell";
export type FeatureRequest = {
	feature: "custom" | "report";
	action: () => void;
};
export function FeatureAccessPrompt({
	request,
	continueFeature,
	onDone,
}: {
	request: FeatureRequest | null;
	continueFeature: (feature: "custom" | "report") => Promise<boolean>;
	onDone: () => void;
}) {
	const { presentOverlay } = useTabShell();
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const accepted = useRef(false);
	const current = useRef(request);
	const processing = useRef(false);
	useEffect(() => {
		current.current = request;
		if (!request) {
			setMounted(false);
			return;
		}
		setMounted(true);
		accepted.current = false;
		processing.current = false;
		setOpen(true);
		return () => {
			if (current.current === request) current.current = null;
		};
	}, [request]);
	useLayoutEffect(() => {
		if (!request) return;
		return presentOverlay(() => {
			if (!processing.current) {
				accepted.current = false;
				setOpen(false);
			}
		});
	}, [request, presentOverlay]);
	if (!request || !mounted) return null;
	return (
		<ConfirmDialog
			open={open}
			title={
				request.feature === "custom"
					? "맞춤 조건으로 계속 만들까요?"
					: "조합 분석을 더 살펴볼까요?"
			}
			description={
				request.feature === "custom"
					? "광고 한 번을 완료하면 고정·제외 번호와 홀짝 조건을 다시 여러 번 설정할 수 있어요. 기본 번호 생성은 그대로 이용할 수 있어요."
					: "광고 한 번을 완료하면 번호별 흐름과 조합 패턴을 다시 여러 번 살펴볼 수 있어요. 기본 생성 통계는 그대로 볼 수 있어요."
			}
			leftButton={
				<ConfirmDialog.Button
					style="weak"
					type="dark"
					onPress={() => {
						accepted.current = false;
						setOpen(false);
					}}
				>
					나중에
				</ConfirmDialog.Button>
			}
			rightButton={
				<ConfirmDialog.Button
					onPress={() => {
						accepted.current = true;
						setOpen(false);
					}}
				>
					광고 보고 계속하기
				</ConfirmDialog.Button>
			}
			onClose={() => {
				setOpen(false);
			}}
			onExited={() => {
				if (processing.current) return;
				processing.current = true;
				setMounted(false);
				const pending = current.current;
				if (!accepted.current || !pending) {
					onDone();
					return;
				}
				void continueFeature(pending.feature).then(
					(ok) => {
						if (current.current !== pending) return;
						onDone();
						if (ok) pending.action();
					},
					() => {
						if (current.current === pending) onDone();
					},
				);
			}}
		/>
	);
}
