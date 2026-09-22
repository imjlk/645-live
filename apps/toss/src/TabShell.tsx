import { createContext, useCallback, useContext, useState } from "react";

export const TabShellContext = createContext<{
	tabBarHeight: number;
	/** A sheet owns Back until its closing animation has finished. */
	presentOverlay: (onBack: () => void) => () => void;
} | null>(null);

export function useTabShell() {
	const context = useContext(TabShellContext);
	if (!context) throw new Error("LottoTabs is required for miniapp screens");
	return context;
}

/** Preserve the sheet below a dialog, including out-of-order cleanup. */
export function useOverlayStack() {
	const [owners, setOwners] = useState<{ onBack: () => void }[]>([]);
	const presentOverlay = useCallback((onBack: () => void) => {
		const owner = { onBack };
		setOwners((current) => [...current, owner]);
		return () =>
			setOwners((current) => current.filter((item) => item !== owner));
	}, []);
	return { overlay: owners[owners.length - 1] ?? null, presentOverlay };
}
