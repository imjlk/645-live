import { AppsInToss } from "@apps-in-toss/framework";
import { TDSProvider } from "@toss/tds-react-native";
import type { PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { context } from "../require.context";

function Container({ children }: PropsWithChildren) {
	const scheme = useColorScheme();
	return (
		<SafeAreaProvider>
			<TDSProvider
				colorPreference={scheme === "dark" ? "dark" : "light"}
				fontScaleAvailable
			>
				{children}
			</TDSProvider>
		</SafeAreaProvider>
	);
}
export default AppsInToss.registerApp(Container, { context });
