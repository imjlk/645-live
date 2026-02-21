import fs from "fs/promises";
import path from "node:path";
import process, { kill } from "node:process";
import { styleText } from "node:util";

import spawn from "nano-spawn";
import { program } from "commander";

const COMPONENT_NAME = "component.wasm";

program
  .description("CLI for hot-reloading TrailBase WASM guest")
  .option("--watch-path", "path to watch for changes", "src")
  .option("--depot <TRAILDEPOT>", "path to traildepot", "../traildepot")
  .option("--port <PORT>", "TrailBase port", "4000")
  .option(
    "--cors-origins <CORS_ORIGINS>",
    "comma-separated allowed origins for local browser app",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
  )
  .option("-p, --pid <PID>", "process to watch")
  .action(async (options) => {
    const pid = options.pid;
    if (pid) {
      info(`Watching pid=${pid}, depot=${options.depot} (cwd=${process.cwd()})`);
      await hotRestart({ pid: parseInt(pid, 10), depotPath: options.depot });
    } else {
      info(`Starting trail and watching: ${options.watchPath}`);
      await startTrailBaseAndHotRestart({
        address: `localhost:${options.port}`,
        watchPath: options.watchPath,
        depotPath: options.depot,
        corsOrigins: options.corsOrigins,
      });
    }
  });

program.parse();

async function startTrailBaseAndHotRestart(opts: {
  address: string;
  watchPath: string;
  depotPath: string;
  corsOrigins: string;
}) {
  await deployComponent({ depotPath: opts.depotPath, alwaysBuild: false });

  const corsArgs = opts.corsOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .flatMap((origin) => ["--cors-allowed-origins", origin]);

  const controller = new AbortController();
  const { signal } = controller;

  const trailProcess = spawn(
    "trail",
    [
      `--data-dir=${opts.depotPath}`,
      "run",
      "--dev",
      `-a=${opts.address}`,
      ...corsArgs,
    ],
    {
      stdout: "inherit",
      stderr: "inherit",
      killSignal: "SIGKILL",
      signal,
      env: { RUST_BACKTRACE: "1" },
    },
  );

  const pid: number = (await trailProcess.nodeChildProcess).pid!;

  const self = process.argv[1];
  try {
    await spawn(
      "node",
      [
        "--experimental-strip-types",
        `--watch-path=${opts.watchPath}`,
        self,
        `--pid=${pid}`,
        `--depot=${opts.depotPath}`,
      ],
      { stdout: "inherit" },
    );
  } finally {
    controller.abort();
  }
}

async function deployComponent(opts: { depotPath: string; alwaysBuild: boolean }) {
  const start = Date.now();

  const wasmPath = path.join(opts.depotPath, "wasm");
  const component = path.join(wasmPath, COMPONENT_NAME);
  const exists = await fileExists(component);

  if (opts.alwaysBuild || !exists) {
    await spawn("npm", ["run", "build"], { stdio: "inherit" });

    await fs.mkdir(wasmPath, { recursive: true });
    await fs.copyFile(path.join("dist", COMPONENT_NAME), component);
  }

  info(`Component build & deploy took: ${(Date.now() - start) / 1000}s`);
}

async function hotRestart(opts: { pid: number; depotPath: string }) {
  await deployComponent({ depotPath: opts.depotPath, alwaysBuild: true });
  kill(opts.pid, "SIGHUP");
}

function info(msg: string) {
  console.log(styleText("blue", msg));
}

async function fileExists(f: string): Promise<boolean> {
  try {
    await fs.stat(f);
    return true;
  } catch {
    return false;
  }
}
