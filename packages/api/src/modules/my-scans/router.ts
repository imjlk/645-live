import { myScansContract } from "@645/shared";
import { ORPCError, implement } from "@orpc/server";
import type { AppContext } from "../../types";

const myScans = implement(myScansContract).$context<AppContext>();

function requireUserId(context: AppContext): string {
	if (!context.auth.userId) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "로그인이 필요합니다.",
		});
	}

	return context.auth.userId;
}

export const createMyScansRouter = () =>
	myScans.router({
		summary: myScans.summary.handler(async ({ context }) => {
			return context.services.myScans.getSummary(requireUserId(context));
		}),
		list: myScans.list.handler(async ({ context, input }) => {
			return context.services.myScans.list(
				requireUserId(context),
				input ?? {},
			);
		}),
		upsertPending: myScans.upsertPending.handler(async ({ context, input }) => {
			return context.services.myScans.upsertPending(
				requireUserId(context),
				input.items,
			);
		}),
	});
