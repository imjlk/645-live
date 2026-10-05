import "@granite-js/react-native";
declare module "@granite-js/react-native" {
	interface RegisterScreenInput {
		"/": undefined;
		"/live": undefined;
		"/saved": import("./result-return").SavedParams;
		"/insights": import("./insights-route").InsightsParams;
		"/results": import("./insights-route").ResultsParams;
		"/numbers": import("./insights-route").NumberStatisticsParams;
	}
	interface RegisterScreen {
		"/": undefined;
		"/live": undefined;
		"/saved": import("./result-return").SavedParams;
		"/insights": import("./insights-route").InsightsParams;
		"/results": import("./insights-route").ResultsParams;
		"/numbers": import("./insights-route").NumberStatisticsParams;
	}
}
