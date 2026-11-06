import { createRoot } from "react-dom/client";
import { GeneratedInsightsScreen } from "./GeneratedInsightsScreen";
import { GenerationResultsScreen } from "./GenerationResultsScreen";
import { LottoProvider } from "./LottoProvider";
import { LottoTabs } from "./LottoTabs";
import { TDSProvider } from "./web/controls";
import {
	Focus,
	navigation,
	RouteParams,
	startWebNavigation,
	useRouteState,
} from "./web/navigation";

startWebNavigation();
function App() {
	const { details } = useRouteState();
	return (
		<TDSProvider fontScaleAvailable>
			<LottoProvider>
				<div
					style={{
						display: details.length ? "none" : "flex",
						flex: 1,
						minHeight: 0,
						flexDirection: "column",
					}}
				>
					<Focus.Provider value={!details.length}>
						<LottoTabs />
					</Focus.Provider>
				</div>
				{details.map(({ path, params, key }, i) => (
					<div
						key={key}
						style={{
							display: i === details.length - 1 ? "flex" : "none",
							flex: 1,
							minHeight: 0,
							flexDirection: "column",
						}}
					>
						<Focus.Provider value={i === details.length - 1}>
							<RouteParams.Provider value={params}>
								{path === "/numbers" || path === "/insights" ? (
									<GeneratedInsightsScreen numberRoute={path === "/numbers"} />
								) : path === "/results" ? (
									<GenerationResultsScreen />
								) : (
									<button type="button" onClick={() => navigation.replace("/")}>
										번호 생성기로 돌아가기
									</button>
								)}
							</RouteParams.Provider>
						</Focus.Provider>
					</div>
				))}
			</LottoProvider>
		</TDSProvider>
	);
}
const container = document.getElementById("root");
if (!container) throw new Error("WebView root is missing");
createRoot(container).render(<App />);
