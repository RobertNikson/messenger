import { spawn } from "node:child_process";

const procs = [];

function run(cmd, args, name, env = process.env) {
  const p = spawn(cmd, args, { stdio: "inherit", env });
  procs.push({ name, p });
  p.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code}`);
    if (code !== 0) process.exitCode = code ?? 1;
  });
  return p;
}

// Internal bootstrap
run("npm", ["run", "-w", "@decentra/bootstrap-server", "dev"], "bootstrap", {
  ...process.env,
  PORT: process.env.BOOTSTRAP_PORT || "9797",
});

// Public web client on Render's PORT
run("npm", ["run", "-w", "@decentra/web-client", "dev"], "web", {
  ...process.env,
  PORT: process.env.PORT || "10000",
  BOOTSTRAP_URL: process.env.BOOTSTRAP_URL || "http://127.0.0.1:9797",
});

function shutdown() {
  for (const { p } of procs) {
    try { p.kill("SIGTERM"); } catch {}
  }
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
