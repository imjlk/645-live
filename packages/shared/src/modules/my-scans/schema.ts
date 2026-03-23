import typia from "typia";
import { typiaSchema } from "../../transport/typia";
import type {
	MyScanListItem,
	MyScanSummary,
	MyScansListInput,
	MyScansUpsertPendingInput,
	MyScansUpsertPendingResult,
} from "./types";

export const myScanListItemSchema = typiaSchema(
	typia.createValidate<MyScanListItem>(),
);

export const myScanListSchema = typiaSchema(
	typia.createValidate<MyScanListItem[]>(),
);

export const myScanSummarySchema = typiaSchema(
	typia.createValidate<MyScanSummary>(),
);

export const myScansListInputSchema = typiaSchema(
	typia.createValidate<MyScansListInput>(),
);

export const myScansUpsertPendingInputSchema = typiaSchema(
	typia.createValidate<MyScansUpsertPendingInput>(),
);

export const myScansUpsertPendingResultSchema = typiaSchema(
	typia.createValidate<MyScansUpsertPendingResult>(),
);
