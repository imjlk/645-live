import { createRoute } from "@granite-js/react-native";
import { GenerationResultsScreen } from "../src/GenerationResultsScreen";
import { resultsParams } from "../src/insights-route";

export const Route = createRoute("/results", {
	validateParams: resultsParams,
	component: GenerationResultsScreen,
});
