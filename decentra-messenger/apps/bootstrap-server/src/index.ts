import Fastify from "fastify";

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 9797);

app.get("/health", async () => ({ ok: true }));

app.get("/bootstrap-info", async () => ({
  status: "phase-1",
  note: "Use this service for relay/bootstrap metadata in next phase"
}));

app.listen({ port: PORT, host: "0.0.0.0" });
