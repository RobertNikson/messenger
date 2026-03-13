import nacl from "tweetnacl";
import bs58 from "bs58";
import type { DID, EncryptedEnvelope } from "@decentra/shared-types";

const textEncoder = new TextEncoder();

export interface Identity {
  did: DID;
  signPublicKeyB58: string;
  signSecretKeyB58: string;
  boxPublicKeyB58: string;
  boxSecretKeyB58: string;
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
