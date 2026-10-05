import { createRoute } from "@granite-js/react-native";
import { GeneratedInsightsScreen } from "../src/GeneratedInsightsScreen";
import { numberStatisticsParams } from "../src/insights-route";

export const Route = createRoute("/numbers", {
	validateParams: numberStatisticsParams,
	component: () => <GeneratedInsightsScreen numberRoute />,
});
