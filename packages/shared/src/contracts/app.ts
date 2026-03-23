import { oc, populateContractRouterPaths } from "@orpc/contract";
import { myScansContract } from "./my-scans";
import { viewerContract } from "./viewer";

export const appContract = populateContractRouterPaths(
	oc.router({
		myScans: myScansContract,
		viewer: viewerContract,
	}),
);

export type AppContract = typeof appContract;
