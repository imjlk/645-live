import "@granite-js/react-native";
declare module "@granite-js/react-native" {
	interface RegisterScreenInput {
		"/": undefined;
		"/live": undefined;
		"/saved": undefined;
		"/insights": import("./insights-route").InsightsParams;
	}
	interface RegisterScreen {
		"/": undefined;
		"/live": undefined;
		"/saved": undefined;
		"/insights": import("./insights-route").InsightsParams;
	}
}
