import { createRoute } from "@granite-js/react-native";
import { LottoTabs } from "../src/LottoTabs";

export const Route = createRoute("/saved", {
	component: () => <LottoTabs initialTab="saved" />,
});
