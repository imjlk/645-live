import typia from "typia";
import { typiaSchema } from "../../transport/typia";
import type { PublicSession, PublicUser } from "./types";

export const publicUserSchema = typiaSchema(
	typia.createValidate<PublicUser>(),
);

export const publicSessionSchema = typiaSchema(
	typia.createValidate<PublicSession>(),
);

export const nullablePublicSessionSchema = typiaSchema(
	typia.createValidate<PublicSession | null>(),
);
