import type { appContract } from "@645/shared";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";

// The server compares this expected identity with its HttpOnly cookie session.
// A cookie changed in another tab must not upload A's pending tickets to B.
export function createMemberRpcClient(
	userId: string,
): ContractRouterClient<typeof appContract> {
	const link = new RPCLink({
		url: new URL("/rpc", window.location.origin).toString(),
		headers: { "x-645-member-id": userId },
		fetch: (request, init) =>
			fetch(request, {
				...init,
				credentials: "same-origin",
				cache: "no-store",
			}),
	});
	return createORPCClient(link);
}
