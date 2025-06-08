import { defineConfig } from "drizzle-kit";

if (!process.env.HYPERDRIVE_PROXY) throw new Error("DATABASE_URL is not set");

export default defineConfig({
	schema: "./src/lib/db/schema",
	dialect: "postgresql",
	dbCredentials: { url: process.env.HYPERDRIVE_PROXY },
	verbose: true,
	strict: true,
});
