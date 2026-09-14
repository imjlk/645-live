import { createRoute } from "@granite-js/react-native";
import { LottoScreen } from "../src/LottoScreen";

export const Route = createRoute("/saved", {
	component: () => <LottoScreen tab="saved" />,
});
