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
			title="광고 보고 계속 이용할까요?"
			description="맞춤 설정과 번호 분석은 기본으로 제공해요. 간헐적으로 광고를 보고 이어서 이용할 수 있어요."
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
