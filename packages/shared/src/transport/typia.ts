import type { StandardSchemaV1 } from "@standard-schema/spec";

export const typiaSchema = <T>(
	validate: StandardSchemaV1<T, T>,
): StandardSchemaV1<T, T> => validate;
