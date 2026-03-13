import nacl from "tweetnacl";
import bs58 from "bs58";
import { createHash, randomUUID } from "node:crypto";
import type { DID, EncryptedEnvelope, PreKeyBundle, SessionInit } from "@decentra/shared-types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface Identity {
  did: DID;
  signPublicKeyB58: string;
  signSecretKeyB58: string;
  boxPublicKeyB58: string;
  boxSecretKeyB58: string;
}

export interface SessionState {
  id: string;
  peerDid: DID;
  rootKeyB64: string;
  createdAt: number;
}

export interface DoubleRatchetState {
  sessionId: string;
  peerDid: DID;
  rootKeyB64: string;
  sendChainKeyB64: string;
  recvChainKeyB64: string;
  sendN: number;
  recvN: number;
  myRatchetPubB58: string;
  myRatchetSecB58: string;
  peerRatchetPubB58: string;
  skippedKeys: Record<string, string>; // key: "ratchetPub:index" => msgKeyB64
}

export interface PreKeyMaterial {
  signedPreKeyPublicB58: string;
  signedPreKeySecretB58: string;
  oneTimePreKeyPublicB58: string;
  oneTimePreKeySecretB58: string;
}

export function createIdentity(): Identity {
  const sign = nacl.sign.keyPair();
  const box = nacl.box.keyPair();
  const did = `did:dm:${bs58.encode(sign.publicKey)}` as DID;

  return {
    did,
    signPublicKeyB58: bs58.encode(sign.publicKey),
    signSecretKeyB58: bs58.encode(sign.secretKey),
    boxPublicKeyB58: bs58.encode(box.publicKey),
    boxSecretKeyB58: bs58.encode(box.secretKey),
  };
}

export function createPreKeyMaterial(): PreKeyMaterial {
  const signedPre = nacl.box.keyPair();
  const otk = nacl.box.keyPair();

  return {
    signedPreKeyPublicB58: bs58.encode(signedPre.publicKey),
    signedPreKeySecretB58: bs58.encode(signedPre.secretKey),
    oneTimePreKeyPublicB58: bs58.encode(otk.publicKey),
    oneTimePreKeySecretB58: bs58.encode(otk.secretKey),
  };
}

export function createPreKeyBundle(identity: Identity, material: PreKeyMaterial): PreKeyBundle {
  const signedPrePub = bs58.decode(material.signedPreKeyPublicB58);
  const sig = nacl.sign.detached(signedPrePub, bs58.decode(identity.signSecretKeyB58));

  return {
    did: identity.did,
    identitySignPubB58: identity.signPublicKeyB58,
    identityBoxPubB58: identity.boxPublicKeyB58,
    signedPreKeyPubB58: material.signedPreKeyPublicB58,
    signedPreKeySigB64: Buffer.from(sig).toString("base64"),
    oneTimePreKeyPubB58: material.oneTimePreKeyPublicB58,
    publishedAt: Date.now(),
  };
}

export function verifyPreKeyBundle(bundle: PreKeyBundle): boolean {
  return nacl.sign.detached.verify(
    bs58.decode(bundle.signedPreKeyPubB58),
    Buffer.from(bundle.signedPreKeySigB64, "base64"),
    bs58.decode(bundle.identitySignPubB58)
  );
}

function kdf(parts: Uint8Array[]): Uint8Array {
  const hash = createHash("sha256");
  for (const p of parts) hash.update(p);
  return new Uint8Array(hash.digest());
}

function kdfLabel(keyB64: string, label: string): string {
  const out = kdf([Buffer.from(keyB64, "base64"), textEncoder.encode(label)]);
  return Buffer.from(out).toString("base64");
}

function advanceRootWithDh(rootKeyB64: string, mySecB58: string, peerPubB58: string): { rootKeyB64: string; chainKeyB64: string } {
  const dh = nacl.scalarMult(bs58.decode(mySecB58), bs58.decode(peerPubB58));
  const nextRoot = kdf([Buffer.from(rootKeyB64, "base64"), dh]);
  const nextRootB64 = Buffer.from(nextRoot).toString("base64");
  const chainKeyB64 = kdfLabel(nextRootB64, "chain:init");
  return { rootKeyB64: nextRootB64, chainKeyB64 };
}

export function initDoubleRatchet(session: SessionState, isInitiator: boolean): DoubleRatchetState {
  const myRatchet = nacl.box.keyPair();
  const peerRatchet = nacl.box.keyPair(); // placeholder before first remote ratchet key seen

  return {
    sessionId: session.id,
    peerDid: session.peerDid,
    rootKeyB64: session.rootKeyB64,
    sendChainKeyB64: kdfLabel(session.rootKeyB64, isInitiator ? "send:init:a" : "send:init:b"),
    recvChainKeyB64: kdfLabel(session.rootKeyB64, isInitiator ? "recv:init:a" : "recv:init:b"),
    sendN: 0,
    recvN: 0,
    myRatchetPubB58: bs58.encode(myRatchet.publicKey),
    myRatchetSecB58: bs58.encode(myRatchet.secretKey),
    peerRatchetPubB58: bs58.encode(peerRatchet.publicKey),
    skippedKeys: {},
  };
}

export function ratchetEncrypt(plainText: string, state: DoubleRatchetState): { nonceB64: string; ciphertextB64: string; messageIndex: number; ratchetPubB58: string } {
  const msgKeyB64 = kdfLabel(state.sendChainKeyB64, `msg:${state.sendN}`);
  const nextChainB64 = kdfLabel(state.sendChainKeyB64, "chain:next");

  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(textEncoder.encode(plainText), nonce, Buffer.from(msgKeyB64, "base64"));

  const idx = state.sendN;
  state.sendN += 1;
  state.sendChainKeyB64 = nextChainB64;

  return {
    nonceB64: Buffer.from(nonce).toString("base64"),
    ciphertextB64: Buffer.from(ciphertext).toString("base64"),
    messageIndex: idx,
    ratchetPubB58: state.myRatchetPubB58,
  };
}

export function ratchetDecrypt(
  ciphertextB64: string,
  nonceB64: string,
  messageIndex: number,
  ratchetPubB58: string,
  state: DoubleRatchetState
): string {
  const skippedKeyId = `${ratchetPubB58}:${messageIndex}`;
  const skippedKey = state.skippedKeys[skippedKeyId];
  if (skippedKey) {
    delete state.skippedKeys[skippedKeyId];
    const opened = nacl.secretbox.open(
      Buffer.from(ciphertextB64, "base64"),
      Buffer.from(nonceB64, "base64"),
      Buffer.from(skippedKey, "base64")
    );
    if (!opened) throw new Error("Failed skipped-key decrypt");
    return textDecoder.decode(opened);
  }

  if (ratchetPubB58 !== state.peerRatchetPubB58) {
    state.peerRatchetPubB58 = ratchetPubB58;
    const recvStep = advanceRootWithDh(state.rootKeyB64, state.myRatchetSecB58, state.peerRatchetPubB58);
    state.rootKeyB64 = recvStep.rootKeyB64;
    state.recvChainKeyB64 = recvStep.chainKeyB64;
    state.recvN = 0;

    const newMyRatchet = nacl.box.keyPair();
    state.myRatchetPubB58 = bs58.encode(newMyRatchet.publicKey);
    state.myRatchetSecB58 = bs58.encode(newMyRatchet.secretKey);

    const sendStep = advanceRootWithDh(state.rootKeyB64, state.myRatchetSecB58, state.peerRatchetPubB58);
    state.rootKeyB64 = sendStep.rootKeyB64;
    state.sendChainKeyB64 = sendStep.chainKeyB64;
    state.sendN = 0;
  }

  while (state.recvN < messageIndex) {
    const mk = kdfLabel(state.recvChainKeyB64, `msg:${state.recvN}`);
    state.skippedKeys[`${state.peerRatchetPubB58}:${state.recvN}`] = mk;
    state.recvChainKeyB64 = kdfLabel(state.recvChainKeyB64, "chain:next");
    state.recvN += 1;
  }

  const msgKeyB64 = kdfLabel(state.recvChainKeyB64, `msg:${state.recvN}`);
  const opened = nacl.secretbox.open(
    Buffer.from(ciphertextB64, "base64"),
    Buffer.from(nonceB64, "base64"),
    Buffer.from(msgKeyB64, "base64")
  );

  if (!opened) throw new Error("Failed to ratchet decrypt");

  state.recvChainKeyB64 = kdfLabel(state.recvChainKeyB64, "chain:next");
  state.recvN += 1;

  return textDecoder.decode(opened);
}

export function createSessionInit(from: DID, to: DID, usedOneTimePreKeyPubB58?: string): { init: SessionInit; ephSecretB58: string } {
  const eph = nacl.box.keyPair();
  return {
    init: {
      from,
      to,
      ephPubB58: bs58.encode(eph.publicKey),
      usedOneTimePreKeyPubB58,
      ts: Date.now(),
    },
    ephSecretB58: bs58.encode(eph.secretKey),
  };
}

export function deriveSessionAsInitiator(params: {
  me: Identity;
  myEphSecretB58: string;
  peerBundle: PreKeyBundle;
}): SessionState {
  const dh1 = nacl.scalarMult(bs58.decode(params.myEphSecretB58), bs58.decode(params.peerBundle.identityBoxPubB58));
  const dh2 = nacl.scalarMult(bs58.decode(params.myEphSecretB58), bs58.decode(params.peerBundle.signedPreKeyPubB58));
  const parts = [dh1, dh2];

  if (params.peerBundle.oneTimePreKeyPubB58) {
    parts.push(nacl.scalarMult(bs58.decode(params.myEphSecretB58), bs58.decode(params.peerBundle.oneTimePreKeyPubB58)));
  }

  const root = kdf(parts);
  return {
    id: randomUUID(),
    peerDid: params.peerBundle.did,
    rootKeyB64: Buffer.from(root).toString("base64"),
    createdAt: Date.now(),
  };
}

export function deriveSessionAsResponder(params: {
  me: Identity;
  mySignedPreSecretB58: string;
  myOneTimePreSecretB58?: string;
  peerDid: DID;
  peerEphPubB58: string;
  initiatorIdentityBoxPubB58: string;
}): SessionState {
  const ephPub = bs58.decode(params.peerEphPubB58);
  const dh1 = nacl.scalarMult(bs58.decode(params.me.boxSecretKeyB58), ephPub);
  const dh2 = nacl.scalarMult(bs58.decode(params.mySignedPreSecretB58), ephPub);
  const parts = [dh1, dh2];

  if (params.myOneTimePreSecretB58) {
    parts.push(nacl.scalarMult(bs58.decode(params.myOneTimePreSecretB58), ephPub));
  }

  const root = kdf(parts);
  return {
    id: randomUUID(),
    peerDid: params.peerDid,
    rootKeyB64: Buffer.from(root).toString("base64"),
    createdAt: Date.now(),
  };
}

export function encryptForSession(plainText: string, sessionRootKeyB64: string): { nonceB64: string; ciphertextB64: string } {
  const key = Buffer.from(sessionRootKeyB64, "base64");
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(textEncoder.encode(plainText), nonce, key);
  return {
    nonceB64: Buffer.from(nonce).toString("base64"),
    ciphertextB64: Buffer.from(ciphertext).toString("base64"),
  };
}

export function decryptForSession(ciphertextB64: string, nonceB64: string, sessionRootKeyB64: string): string {
  const key = Buffer.from(sessionRootKeyB64, "base64");
  const opened = nacl.secretbox.open(
    Buffer.from(ciphertextB64, "base64"),
    Buffer.from(nonceB64, "base64"),
    key
  );
  if (!opened) throw new Error("Failed to decrypt");
  return textDecoder.decode(opened);
}

export function signEnvelope(
  payload: Omit<EncryptedEnvelope, "signatureB64">,
  signSecretKeyB58: string
): EncryptedEnvelope {
  const secret = bs58.decode(signSecretKeyB58);
  const body = JSON.stringify(payload);
  const sig = nacl.sign.detached(textEncoder.encode(body), secret);
  return { ...payload, signatureB64: Buffer.from(sig).toString("base64") };
}

export function verifyEnvelope(
  envelope: EncryptedEnvelope,
  signPublicKeyB58: string
): boolean {
  const pub = bs58.decode(signPublicKeyB58);
  const { signatureB64, ...payload } = envelope;
  const body = JSON.stringify(payload);
  return nacl.sign.detached.verify(
    textEncoder.encode(body),
    Buffer.from(signatureB64, "base64"),
    pub
  );
}
