import { oc, type as orpcType } from "@orpc/contract";
import {
	myScanListSchema,
	myScanSummarySchema,
	myScansListInputSchema,
	myScansUpsertPendingInputSchema,
	myScansUpsertPendingResultSchema,
} from "../modules/my-scans/schema";

export const myScansContract = oc.tag("myScans").router({
	summary: oc
		.input(orpcType<void>())
		.output(myScanSummarySchema)
		.route({
			method: "GET",
			summary: "Get member scan summary",
		}),
	list: oc
		.input(myScansListInputSchema)
		.output(myScanListSchema)
		.route({
			method: "GET",
			summary: "List member scans",
		}),
	upsertPending: oc
		.input(myScansUpsertPendingInputSchema)
		.output(myScansUpsertPendingResultSchema)
		.route({
			method: "POST",
			summary: "Persist pending member scans",
		}),
});
