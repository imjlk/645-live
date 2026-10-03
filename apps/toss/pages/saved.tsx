import { createRoute, useParams } from "@granite-js/react-native";
import { LottoTabs } from "../src/LottoTabs";
import { savedParams } from "../src/result-return";

function SavedEntry() {
	const params = useParams({ from: "/saved" });
	return <LottoTabs initialTab="saved" savedTarget={params} />;
}
export const Route = createRoute("/saved", {
	validateParams: savedParams,
	component: SavedEntry,
});
