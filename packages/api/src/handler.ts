import { RPCHandler } from "@orpc/server/fetch";

export type OrpcFetchHandlerOptions<TContext> = {
	prefix?: string;
	context: TContext;
};

export const createOrpcFetchHandler = <
	TContext extends Record<string, unknown>,
>(
	router: unknown,
	options: OrpcFetchHandlerOptions<TContext>,
) => {
	const rpcHandler = new RPCHandler<TContext>(router as never, {} as never);
	const prefix = options.prefix ?? "/rpc";

	return async (request: Request): Promise<Response> => {
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204 });
		}

		const result = await rpcHandler.handle(
			request,
			{
				prefix,
				context: options.context,
			} as never,
		);

		if (!result.matched) {
			return new Response("Not Found", { status: 404 });
		}

		return new Response(result.response.body, {
			status: result.response.status,
			headers: result.response.headers,
		});
	};
};
