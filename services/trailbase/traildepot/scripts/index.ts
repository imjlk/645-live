import {
	addRoute,
	query,
	stringHandler,
	HttpError,
	StatusCodes,
	jsonHandler,
	transaction,
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
