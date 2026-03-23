import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("Missing DATABASE_URL for Postgres migrations.");
}

const parsedUrl = new URL(databaseUrl);

const sslMode =
	process.env.DATABASE_SSL_MODE ??
	parsedUrl.searchParams.get("sslmode") ??
	undefined;
const sslCaCert =
	process.env.DATABASE_SSL_CA_CERT?.trim().length
		? process.env.DATABASE_SSL_CA_CERT
		: undefined;
const sslCaCertPath =
	process.env.DATABASE_SSL_CA_CERT_PATH ??
	parsedUrl.searchParams.get("sslrootcert") ??
	undefined;

if (!sslCaCert && sslCaCertPath && !existsSync(sslCaCertPath)) {
	throw new Error(`DATABASE_SSL_CA_CERT_PATH does not exist: ${sslCaCertPath}`);
}

const sslConfig = (() => {
	if (sslCaCert) {
		return {
			ca: sslCaCert,
			rejectUnauthorized: true,
		};
	}

	if (sslCaCertPath) {
		return {
			ca: readFileSync(sslCaCertPath, "utf8"),
			rejectUnauthorized: true,
		};
	}

	if (!sslMode) {
		return undefined;
	}

	if (sslMode === "require" || sslMode === "allow" || sslMode === "prefer") {
		return {
			rejectUnauthorized: false,
		};
	}

	if (sslMode === "verify-full") {
		return {};
	}

	throw new Error(`Unsupported DATABASE_SSL_MODE: ${sslMode}`);
})();

const databaseName = parsedUrl.pathname.replace(/^\//, "");

if (!databaseName) {
	throw new Error("DATABASE_URL must include a database name.");
}

export default defineConfig({
	schema: "./src/lib/db/schema",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		host: parsedUrl.hostname,
		port: parsedUrl.port ? Number(parsedUrl.port) : 5432,
		user: decodeURIComponent(parsedUrl.username),
		password: decodeURIComponent(parsedUrl.password),
		database: decodeURIComponent(databaseName),
		ssl: sslConfig,
	},
	verbose: true,
	strict: true,
});
