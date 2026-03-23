import { oc, type as orpcType } from "@orpc/contract";
import {
	nullablePublicSessionSchema,
	publicUserSchema,
} from "../modules/viewer/schema";

export const viewerContract = oc.tag("viewer").router({
	session: oc
		.input(orpcType<void>())
		.output(nullablePublicSessionSchema)
		.route({
			method: "GET",
			summary: "Get current public session",
		}),
	me: oc
		.input(orpcType<void>())
		.output(publicUserSchema)
		.route({
			method: "GET",
			summary: "Get current signed-in user",
		}),
});
