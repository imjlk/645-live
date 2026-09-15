import { createContext, useContext } from "react";

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
