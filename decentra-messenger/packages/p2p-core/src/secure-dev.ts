import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { randomUUID } from "node:crypto";
import { createP2PNode } from "./index.js";
import {
  createIdentity,
  createPreKeyBundle,
  createPreKeyMaterial,
  createSessionInit,
  deriveSessionAsInitiator,
  deriveSessionAsResponder,
  initDoubleRatchet,
  ratchetDecrypt,
  ratchetEncrypt,
  signEnvelope,
  verifyPreKeyBundle,
  verifyEnvelope,
  type DoubleRatchetState,
} from "@decentra/crypto-core";
import type { EncryptedEnvelope, PreKeyBundle, SessionInit } from "@decentra/shared-types";
import { SessionStore } from "@decentra/storage-core";

const argv = await yargs(hideBin(process.argv))
  .option("name", { type: "string", demandOption: true })
  .option("peerDid", { type: "string" })
  .option("bootstrap", { type: "string", default: "http://127.0.0.1:9797" })
  .parse();

const name = argv.name as string;
const bootstrap = argv.bootstrap as string;
const peerDid = argv.peerDid as string | undefined;

const id = createIdentity();
const preKeyMaterial = createPreKeyMaterial();
const bundle = createPreKeyBundle(id, preKeyMaterial);
const store = new SessionStore(`./state-${name}.db`);

await fetch(`${bootstrap}/v1/prekey`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(bundle),
});

console.log(`[${name}] did: ${id.did}`);
console.log(`[${name}] prekey bundle published`);

const sessions = new Map<string, DoubleRatchetState>();
for (const p of store.listPeers()) {
  const s = store.load<DoubleRatchetState>(p);
  if (s) sessions.set(p, s);
}

const { publish } = await createP2PNode(async (raw) => {
  try {
    const parsed = JSON.parse(raw) as { type: "session-init"; init: SessionInit; senderIdentityBoxPubB58: string } | { type: "cipher"; env: EncryptedEnvelope; senderSignPubB58: string };

    if (parsed.type === "session-init" && parsed.init.to === id.did) {
      const sess = deriveSessionAsResponder({
        me: id,
        mySignedPreSecretB58: preKeyMaterial.signedPreKeySecretB58,
        myOneTimePreSecretB58: preKeyMaterial.oneTimePreKeySecretB58,
        peerDid: parsed.init.from,
        peerEphPubB58: parsed.init.ephPubB58,
        initiatorIdentityBoxPubB58: parsed.senderIdentityBoxPubB58,
      });
      const rs = initDoubleRatchet(sess, false);
      sessions.set(parsed.init.from, rs);
      store.save(parsed.init.from, rs);
      console.log(`[${name}] session ready with ${parsed.init.from}`);
      return;
    }

    if (parsed.type === "cipher" && parsed.env.to === id.did) {
      if (!verifyEnvelope(parsed.env, parsed.senderSignPubB58)) return;
      const sess = sessions.get(parsed.env.from);
      if (!sess) return;
      if (!parsed.env.ratchetPubB58) return;
      const text = ratchetDecrypt(
        parsed.env.ciphertextB64,
        parsed.env.nonceB64,
        parsed.env.messageIndex ?? 0,
        parsed.env.ratchetPubB58,
        sess
      );
      store.save(parsed.env.from, sess);
      console.log(`[${name}] < ${parsed.env.from}: ${text}`);
    }
  } catch {
    // ignore
  }
});

if (peerDid) {
  const peerBundle = (await (await fetch(`${bootstrap}/v1/prekey/${encodeURIComponent(peerDid)}`)).json()) as PreKeyBundle;
  if (!verifyPreKeyBundle(peerBundle)) {
    throw new Error("Peer prekey signature invalid");
  }

  const { init, ephSecretB58 } = createSessionInit(id.did, peerBundle.did, peerBundle.oneTimePreKeyPubB58);
  const sess = deriveSessionAsInitiator({ me: id, myEphSecretB58: ephSecretB58, peerBundle });
  const rs = initDoubleRatchet(sess, true);
  sessions.set(peerBundle.did, rs);
  store.save(peerBundle.did, rs);

  await publish(JSON.stringify({ type: "session-init", init, senderIdentityBoxPubB58: id.boxPublicKeyB58 }));
  console.log(`[${name}] session init sent to ${peerBundle.did}`);
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", async (line) => {
  const text = String(line).trim();
  if (!text || !peerDid) return;

  const sess = sessions.get(peerDid);
  if (!sess) {
    console.log("no session yet");
    return;
  }

  const enc = ratchetEncrypt(text, sess);
  const unsigned = {
    id: randomUUID(),
    from: id.did,
    to: peerDid as `did:dm:${string}`,
    ts: Date.now(),
    algo: "double-ratchet-v1" as const,
    messageIndex: enc.messageIndex,
    ratchetPubB58: enc.ratchetPubB58,
    ciphertextB64: enc.ciphertextB64,
    nonceB64: enc.nonceB64,
  };

  const env = signEnvelope(unsigned, id.signSecretKeyB58);
  store.save(peerDid, sess);
  await publish(JSON.stringify({ type: "cipher", env, senderSignPubB58: id.signPublicKeyB58 }));
});
