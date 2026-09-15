import { createRoute } from "@granite-js/react-native";
import { GenerationResultsScreen } from "../src/GenerationResultsScreen";

export const Route = createRoute("/results", {
	component: GenerationResultsScreen,
});
