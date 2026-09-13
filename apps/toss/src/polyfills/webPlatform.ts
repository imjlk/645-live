import "fast-text-encoding";
import { ReadableStream, TransformStream } from "web-streams-polyfill";

const globals = globalThis as Record<string, unknown>;

if (typeof globals.ReadableStream === "undefined") {
	globals.ReadableStream = ReadableStream;
}

if (typeof globals.TransformStream === "undefined") {
	globals.TransformStream = TransformStream;
}
