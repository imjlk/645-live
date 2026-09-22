import { EMPTY_OPTIONS, type GenerationOptions } from "@645/lotto-core";
import {
	createContext,
	type Dispatch,
	type PropsWithChildren,
	type SetStateAction,
	useContext,
	useEffect,
	useRef,
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
	const [ready, setReady] = useState(false);
	const dirty = useRef({ options: false, columns: false });
	const writes = useRef(Promise.resolve());
	useEffect(() => {
		let closed = false;
		void model.preferences
			.read()
			.then((p) => {
				if (closed) return;
				if (!dirty.current.options) setOptions(p.options);
				if (!dirty.current.columns) setLiveColumns(p.liveColumns);
			})
			.catch(() => {})
			.finally(() => {
				if (!closed) setReady(true);
			});
		return () => {
			closed = true;
		};
	}, [model.preferences]);
	useEffect(() => {
		// Reading optional native storage may return defaults on transient failure.
		// Never write those defaults back until the user explicitly edits a preference.
		if (!ready || (!dirty.current.options && !dirty.current.columns)) return;
		const patch = {
			...(dirty.current.options ? { options } : {}),
			...(dirty.current.columns ? { liveColumns } : {}),
		};
		writes.current = writes.current
			.then(() => model.preferences.write(patch))
			.catch(() => {});
	}, [ready, options, liveColumns, model.preferences]);
	return (
		<LottoContext.Provider
			value={{
				model,
				options,
				setOptions: (value) => {
					dirty.current.options = true;
					setOptions(value);
				},
				liveColumns,
				setLiveColumns: (value) => {
					dirty.current.columns = true;
					setLiveColumns(value);
				},
			}}
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
