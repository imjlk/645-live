#!/usr/bin/env node
import { runCli } from "./run.js";

const exitCode = await runCli();
process.exit(exitCode);
