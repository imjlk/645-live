/// <reference types="./worker-configuration" />
import type { DrizzleClient } from "$lib/db";
import type { BetterAuth } from "$lib/auth";

type WebMcpToolResult = {
	content: Array<{
		type: "text";
		text: string;
	}>;
	structuredContent?: Record<string, unknown>;
};

type WebMcpToolDefinition = {
	name: string;
	description: string;
	inputSchema?: Record<string, unknown>;
	execute: (
		input: Record<string, unknown>,
		agent: {
			requestUserInteraction?<T>(callback: () => Promise<T> | T): Promise<T>;
		},
	) => Promise<WebMcpToolResult> | WebMcpToolResult;
};

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Navigator {
		modelContext?: {
			provideContext(context: {
				tools: WebMcpToolDefinition[];
			}): Promise<void> | void;
			registerTool?(tool: WebMcpToolDefinition): Promise<void> | void;
			unregisterTool?(name: string): Promise<void> | void;
		};
	}

	namespace App {
		interface Platform {
			env: Env;
			cf: CfProperties;
			ctx: ExecutionContext;
		}
		interface Locals {
			db?: DrizzleClient;
			auth?: BetterAuth;
			dbBootstrapError?: string;
		}
	}
}
