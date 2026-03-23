import { implement } from "@orpc/server";
import { appContract } from "@645/shared";
import { createMyScansRouter } from "./modules/my-scans/router";
import { createViewerRouter } from "./modules/viewer/router";
import type { AppContext } from "./types";

const app = implement(appContract).$context<AppContext>();

export const createAppRouter = () =>
	app.router({
		myScans: createMyScansRouter(),
		viewer: createViewerRouter(),
	});

export type AppRouter = ReturnType<typeof createAppRouter>;
