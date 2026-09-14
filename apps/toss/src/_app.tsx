import { AppsInToss } from "@apps-in-toss/framework";
import type { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { context } from "../require.context";

function Container({ children }: PropsWithChildren) {
	return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
export default AppsInToss.registerApp(Container, { context });
