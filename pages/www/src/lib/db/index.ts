import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDrizzleClient(
	connectionString: string,
): PostgresJsDatabase<typeof schema> {
	const client = postgres(connectionString, {
		// Limit the connections for the Worker request to 5 due to Workers' limits on concurrent external connections
		max: 5,
		// If you are not using array types in your Postgres schema, disable `fetch_types` to avoid an additional round-trip (unnecessary latency)
		fetch_types: false,
	});

	return drizzle(client, { schema });
}

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
