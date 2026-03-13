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
