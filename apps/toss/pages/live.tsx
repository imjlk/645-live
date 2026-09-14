import { createRoute } from "@granite-js/react-native";
import { LottoScreen } from "../src/LottoScreen";

export const Route = createRoute("/live", {
	component: () => <LottoScreen tab="live" />,
});
