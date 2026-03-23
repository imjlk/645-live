import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { appContract } from "@645/shared";

const rpcUrl =
	typeof window === "undefined"
		? "http://127.0.0.1:5173/rpc"
		: new URL("/rpc", window.location.origin).toString();

const link = new RPCLink({
	url: rpcUrl,
});

export const rpcClient: ContractRouterClient<typeof appContract> =
	createORPCClient(link);
