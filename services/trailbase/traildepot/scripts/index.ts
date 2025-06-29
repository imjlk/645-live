import {
	addRoute,
	query,
	stringHandler,
	HttpError,
	StatusCodes,
	jsonHandler,
	transaction,
	addPeriodicCallback,
	addCronCallback,
} from "../trailbase.js";

addRoute(
	"POST",
	"/scanned",
	jsonHandler(async (req) => {
		req.headers.Authorization = `Basic dGVzdDp0ZXN0`; // test:test
		console.log("Scanned request received:", process.env);

		throw new HttpError(StatusCodes.BAD_REQUEST);
	}),
);

addRoute(
	"GET",
	"/test/{table}",
	jsonHandler(async (req) => {
		const table = req.params.table;

		console.log("Scanned GET request received:", JSON.stringify(req.headers));
		return {
			message: "GET request received successfully",
			table,
		};
	}),
);

addCronCallback("JS-registered Job", "@hourly", async () => {
	const now = new Date().toISOString();
	console.info(`[${now}] JS-registered cron job reporting for duty 🚀`);
});
