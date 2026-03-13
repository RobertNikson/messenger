import Fastify from "fastify";

type PreKeyBundle = {
  did: string;
  identitySignPubB58: string;
  identityBoxPubB58: string;
  signedPreKeyPubB58: string;
  signedPreKeySigB64: string;
  oneTimePreKeyPubB58?: string;
  publishedAt: number;
};

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 9797);

const bundles = new Map<string, PreKeyBundle>();

app.get("/health", async () => ({ ok: true }));

app.get("/bootstrap-info", async () => ({
  status: "phase-1-x3dh",
  endpoints: ["POST /v1/prekey", "GET /v1/prekey/:did"],
}));

app.post("/v1/prekey", async (req, reply) => {
  const bundle = req.body as PreKeyBundle;
  if (!bundle?.did || !bundle?.identitySignPubB58 || !bundle?.signedPreKeyPubB58) {
    return reply.code(400).send({ error: "invalid bundle" });
  }
  bundles.set(bundle.did, bundle);
  return { ok: true, did: bundle.did };
});

app.get<{ Params: { did: string } }>("/v1/prekey/:did", async (req, reply) => {
  const bundle = bundles.get(req.params.did);
  if (!bundle) return reply.code(404).send({ error: "bundle not found" });
  return bundle;
});

app.listen({ port: PORT, host: "0.0.0.0" });
