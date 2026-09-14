import { EMPTY_OPTIONS, type GenerationOptions } from "@645/lotto-core";
import {
	createContext,
	type Dispatch,
	type PropsWithChildren,
	type SetStateAction,
	useContext,
	useState,
} from "react";
import { type LottoModel, useLotto } from "./use-lotto";

const LottoContext = createContext<{
	model: LottoModel;
	options: GenerationOptions;
	setOptions: Dispatch<SetStateAction<GenerationOptions>>;
	liveColumns: 5 | 9;
	setLiveColumns: Dispatch<SetStateAction<5 | 9>>;
} | null>(null);

/** Keep one session, subscription and generation state across the native stack. */
export function LottoProvider({ children }: PropsWithChildren) {
	const model = useLotto();
	const [options, setOptions] = useState<GenerationOptions>(EMPTY_OPTIONS);
	const [liveColumns, setLiveColumns] = useState<5 | 9>(5);
	return (
		<LottoContext.Provider
			value={{ model, options, setOptions, liveColumns, setLiveColumns }}
		>
			{children}
		</LottoContext.Provider>
	);
}

export function useLottoContext() {
	const context = useContext(LottoContext);
	if (!context)
		throw new Error("LottoProvider is required for miniapp screens");
	return context;
}
