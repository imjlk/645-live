import { TrailBaseHttpError } from "@trailbase-apps-in-toss-kit/trailbase-client";
import { version } from "../package.json";

const steps = {
	C10: "기기에 저장된 연결 정보를 읽지 못했어요.",
	C11: "기기에 연결 정보를 저장하지 못했어요.",
	C20: "토스에서 익명 연결 정보를 받지 못했어요.",
	C30: "앱 연결을 준비하지 못했어요.",
	C40: "서버 연결 기능을 준비하지 못했어요.",
	C41: "서버에 연결을 요청하지 못했어요.",
	C42: "서버 연결 정보를 복원하지 못했어요.",
};
type ConnectionStep = keyof typeof steps;

/** Only fixed step codes and numeric stack positions are exposed; never tokens or SDK payloads. */
export class ConnectionRuntimeError extends Error {
	constructor(
		readonly step: ConnectionStep,
		error: Error,
	) {
		const positions = (error.stack ?? "")
			.split("\n")
			.slice(1)
			.map((line) => /:(\d+):(\d+)\)?\s*$/.exec(line))
			.filter((match) => match !== null)
			.slice(0, 2)
			.map((match) => `${match[1]}:${match[2]}`)
			.join(", ");
		super(
			`${steps[step]} 다시 연결해 주세요.\n연결 코드 ${step} · v${version}${positions ? ` · ${positions}` : ""}`,
			{ cause: error },
		);
		this.name = "ConnectionRuntimeError";
	}
}

function explain(step: ConnectionStep, error: unknown): unknown {
	if (error instanceof TrailBaseHttpError) return error;
	if (error instanceof ConnectionRuntimeError) return error;
	if (error instanceof Error && error.cause instanceof ConnectionRuntimeError)
		return error.cause;
	if (
		error instanceof TypeError ||
		error instanceof ReferenceError ||
		(error instanceof Error && /is not a function/.test(error.message))
	)
		return new ConnectionRuntimeError(step, error);
	// HTTP/auth failures must retain their type and status for the session recovery flow.
	return error;
}

export function connectionSync<T>(step: ConnectionStep, task: () => T): T {
	try {
		return task();
	} catch (error) {
		throw explain(step, error);
	}
}

export async function connectionStep<T>(
	step: ConnectionStep,
	task: () => T | Promise<T>,
): Promise<T> {
	try {
		return await task();
	} catch (error) {
		throw explain(step, error);
	}
}
