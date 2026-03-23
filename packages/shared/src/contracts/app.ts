import { oc, populateContractRouterPaths } from "@orpc/contract";
import { viewerContract } from "./viewer";

export const appContract = populateContractRouterPaths(
	oc.router({
		viewer: viewerContract,
	}),
);

export type AppContract = typeof appContract;
