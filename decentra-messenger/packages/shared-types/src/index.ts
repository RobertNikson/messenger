export type DID = `did:dm:${string}`;

export interface EncryptedEnvelope {
  id: string;
  from: DID;
  to: DID;
  ts: number;
  algo: "x25519-xsalsa20poly1305" | "double-ratchet-v1";
  ciphertextB64: string;
  nonceB64: string;
  signatureB64: string;
}

export interface PreKeyBundle {
  did: DID;
  identitySignPubB58: string;
  identityBoxPubB58: string;
  signedPreKeyPubB58: string;
  signedPreKeySigB64: string;
  oneTimePreKeyPubB58?: string;
  publishedAt: number;
}

export interface SessionInit {
  from: DID;
  to: DID;
  ephPubB58: string;
  usedOneTimePreKeyPubB58?: string;
  ts: number;
}
