import { viewerContract } from "@645/shared";
import { ORPCError, implement } from "@orpc/server";
import type { AppContext } from "../../types";

const viewer = implement(viewerContract).$context<AppContext>();

export const createViewerRouter = () =>
	viewer.router({
		session: viewer.session.handler(async ({ context }) => context.auth.session),
		me: viewer.me.handler(async ({ context }) => {
			if (!context.auth.user) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "로그인이 필요합니다.",
				});
			}

			return context.auth.user;
		}),
	});
