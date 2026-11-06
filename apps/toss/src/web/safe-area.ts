import { SafeArea } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";

const zero = { top: 0, left: 0, bottom: 0, right: 0 };
export function useSafeAreaInsets() {
	const [insets, setInsets] = useState(() => {
		try {
			return SafeArea.get() ?? zero;
		} catch {
			return zero;
		}
	});
	useEffect(() => {
		try {
			return SafeArea.subscribe({ onEvent: setInsets });
		} catch {
			return;
		}
	}, []);
	return insets;
}
