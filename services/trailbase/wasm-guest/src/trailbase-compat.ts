import type { Value } from "trailbase-wasm/db";
import {
	Transaction as DbTransaction,
	execute as dbExecute,
	query as dbQuery,
} from "trailbase-wasm/db";
import { HttpError, StatusCode } from "trailbase-wasm/http";

type TxLike = {
	query: (sql: string, params: Value[]) => Promise<Value[][]>;
	execute: (sql: string, params: Value[]) => number;
};

export const StatusCodes = {
	OK: StatusCode.OK,
	BAD_REQUEST: StatusCode.BAD_REQUEST,
	UNAUTHORIZED: StatusCode.UNAUTHORIZED,
	FORBIDDEN: StatusCode.FORBIDDEN,
	NOT_FOUND: StatusCode.NOT_FOUND,
	CONFLICT: StatusCode.CONFLICT,
	INTERNAL_SERVER_ERROR: StatusCode.INTERNAL_SERVER_ERROR,
} as const;

export { HttpError };

export async function query(sql: string, params: Value[]): Promise<Value[][]> {
	return dbQuery(sql, params);
}

export async function execute(sql: string, params: Value[]): Promise<number> {
	return dbExecute(sql, params);
}

export async function transaction<T>(
	fn: (tx: TxLike) => Promise<T> | T,
): Promise<T> {
	const tx = new DbTransaction();

	const txApi: TxLike = {
		query: async (sql, params) => tx.query(sql, params),
		execute: (sql, params) => tx.execute(sql, params),
	};

	try {
		const result = await fn(txApi);
		tx.commit();
		return result;
	} catch (error) {
		tx.rollback();
		throw error;
	} finally {
		// no-op: transaction scope is explicit via txApi only
	}
}
