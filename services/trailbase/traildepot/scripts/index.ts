import { executeLottoUpdate, processScannedLottoData } from "../lotto-utils.ts";
// import { executeWinningStoreUpdate } from "../winning-store-utils.ts";
import { addCronCallback, addRoute, jsonHandler } from "../trailbase.js";

console.log("Adding routes...");

addRoute(
	"POST",
	"/scanned",
	jsonHandler(async (req) => {
		return await processScannedLottoData({ body: req.body });
	}),
);

console.log("POST /scanned route registered");

// 메인 크론 작업 - 매주 토요일 오전 20시 40분
addCronCallback("Lotto Weekly Updater", "0 40 11 * * 7", async () => {
	await executeLottoUpdate();
});

// addCronCallback("Lotto Store Weekly Updater", "0 0 12 * * 7", async () => {
// 	await executeWinningStoreUpdate();
// });

console.log("=== All routes and callbacks registered successfully ===");
