import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { spawn } from "node:child_process";
import path from "node:path";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(fastifyStatic, {
  root: path.resolve("./public"),
  prefix: "/",
});

const sessions = new Map();

function startSession(name, peerDid) {
  if (sessions.has(name)) return { ok: false, error: "already running" };

  const args = ["run", "-w", "@decentra/p2p-core", "secure:dev", "--", "--name", name];
  if (peerDid) args.push("--peerDid", peerDid);

  const proc = spawn("npm", args, {
    cwd: path.resolve("../.."),
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const logs = [];
  proc.stdout.on("data", (d) => logs.push(d.toString()));
  proc.stderr.on("data", (d) => logs.push(d.toString()));
  proc.on("exit", (code) => logs.push(`\n[exit ${code}]\n`));

  sessions.set(name, { proc, logs });
  return { ok: true };
}

app.get("/api/sessions", async () => {
  return {
    sessions: [...sessions.entries()].map(([name, s]) => ({ name, alive: !s.proc.killed })),
  };
});

app.post("/api/session/start", async (req) => {
  const { name, peerDid } = req.body || {};
  return startSession(String(name || "anon"), peerDid ? String(peerDid) : undefined);
});

app.post("/api/session/send", async (req, reply) => {
  const { name, text } = req.body || {};
  const s = sessions.get(String(name));
  if (!s) return reply.code(404).send({ error: "session not found" });
  s.proc.stdin.write(`${String(text || "")}\n`);
  return { ok: true };
});

app.get("/api/session/logs/:name", async (req, reply) => {
  const s = sessions.get(req.params.name);
  if (!s) return reply.code(404).send({ error: "session not found" });
  return { logs: s.logs.join("") };
});

app.post("/api/session/stop", async (req) => {
  const { name } = req.body || {};
  const s = sessions.get(String(name));
  if (!s) return { ok: false };
  s.proc.kill("SIGTERM");
  sessions.delete(String(name));
  return { ok: true };
});

app.get("/", async (req, reply) => reply.sendFile("index.html"));

app.listen({ port: 6060, host: "0.0.0.0" });
