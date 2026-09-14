import { AppsInToss } from "@apps-in-toss/framework";
import type { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { context } from "../require.context";
import { LottoProvider } from "./LottoProvider";

function Container({ children }: PropsWithChildren) {
	return (
		<SafeAreaProvider>
			<LottoProvider>{children}</LottoProvider>
		</SafeAreaProvider>
	);
}
export default AppsInToss.registerApp(Container, { context });
