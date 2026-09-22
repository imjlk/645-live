import { ConfirmDialog } from "@toss/tds-react-native";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useLottoContext } from "./LottoProvider";
import { useTabShell } from "./TabShell";
import { trackProduct } from "./telemetry";

/** One host for all tabs; do not open the native consent sheet until TDS has exited. */
export function ResultNotificationPrompt() {
	const { model } = useLottoContext();
	const { presentOverlay } = useTabShell();
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const accept = useRef(false);
	const closing = useRef(false);
	const trigger = model.notificationPrompt && !model.busy;
	const notifications = useRef(model.notifications);
	const dismissModel = useRef(model.dismissNotificationPrompt);
	useLayoutEffect(() => {
		notifications.current = model.notifications;
		dismissModel.current = model.dismissNotificationPrompt;
	});
	const dismiss = useCallback(() => {
		if (closing.current) return;
		closing.current = true;
		accept.current = false;
		dismissModel.current();
		setOpen(false);
		trackProduct("notification_prompt_dismissed");
	}, []);
	useEffect(() => {
		if (!trigger) return;
		closing.current = false;
		setMounted(true);
		setOpen(true);
		trackProduct("notification_prompt_viewed");
	}, [trigger]);
	useLayoutEffect(() => {
		if (!mounted) return;
		return presentOverlay(dismiss);
	}, [mounted, presentOverlay, dismiss]);
	if (!mounted) return null;
	return (
		<ConfirmDialog
			open={open}
			title="추첨 결과가 나오면 알려드릴까요?"
			description="보관한 회차의 결과가 준비되면 토스 알림으로 알려드려요. 보관함에서 언제든 끌 수 있어요."
			leftButton={
				<ConfirmDialog.Button style="weak" type="dark" onPress={dismiss}>
					나중에
				</ConfirmDialog.Button>
			}
			rightButton={
				<ConfirmDialog.Button
					onPress={() => {
						if (closing.current) return;
						closing.current = true;
						accept.current = true;
						dismissModel.current();
						trackProduct("notification_prompt_accepted");
						setOpen(false);
					}}
				>
					알림 받기
				</ConfirmDialog.Button>
			}
			onClose={dismiss}
			onExited={() => {
				setMounted(false);
				dismissModel.current();
				if (accept.current) {
					accept.current = false;
					void notifications.current(true);
				}
			}}
		/>
	);
}
