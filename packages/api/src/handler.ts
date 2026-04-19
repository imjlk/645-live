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
			return Response.json(
				{
					error: "endpoint_not_found",
					code: "RPC_ENDPOINT_NOT_FOUND",
					message: `No RPC endpoint exists for ${new URL(request.url).pathname}.`,
					hint: "Use /docs or /api/openapi.json for the public API surface, or inspect the 645.live RPC contract.",
				},
				{ status: 404 },
			);
		}

		return new Response(result.response.body, {
			status: result.response.status,
			headers: result.response.headers,
		});
	};
};
