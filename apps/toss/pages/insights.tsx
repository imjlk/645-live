import { createRoute } from "@granite-js/react-native";
import { GeneratedInsightsScreen } from "../src/GeneratedInsightsScreen";
import { insightsParams } from "../src/insights-route";

export const Route = createRoute("/insights", {
	validateParams: insightsParams,
	component: GeneratedInsightsScreen,
});
