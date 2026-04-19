import { handleMcpRequest } from "$lib/server/mcp";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = handleMcpRequest;
export const POST: RequestHandler = handleMcpRequest;
export const DELETE: RequestHandler = handleMcpRequest;
export const OPTIONS: RequestHandler = handleMcpRequest;
