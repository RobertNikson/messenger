import Database from "better-sqlite3";
import nacl from "tweetnacl";
import { createHash } from "node:crypto";

function keyFromPass(passphrase: string): Uint8Array {
  const h = createHash("sha256").update(passphrase).digest();
  return new Uint8Array(h);
}

function encryptJson(data: unknown, passphrase: string): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const key = keyFromPass(passphrase);
  const plain = Buffer.from(JSON.stringify(data), "utf8");
  const cipher = nacl.secretbox(plain, nonce, key);
  return `${Buffer.from(nonce).toString("base64")}.${Buffer.from(cipher).toString("base64")}`;
}

function decryptJson<T>(blob: string, passphrase: string): T {
  const [n, c] = blob.split(".");
  const nonce = Buffer.from(n, "base64");
  const cipher = Buffer.from(c, "base64");
  const key = keyFromPass(passphrase);
  const opened = nacl.secretbox.open(cipher, nonce, key);
  if (!opened) throw new Error("decrypt failed");
  return JSON.parse(Buffer.from(opened).toString("utf8")) as T;
}

export class SessionStore {
  private db: Database.Database;
  private passphrase: string;

  constructor(dbPath = "./decentra-state.db", passphrase = process.env.STATE_KEY || "dev_state_key_change_me") {
    this.db = new Database(dbPath);
    this.passphrase = passphrase;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        peer_did TEXT PRIMARY KEY,
        state_blob TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  save(peerDid: string, state: unknown) {
    const blob = encryptJson(state, this.passphrase);
    this.db
      .prepare(
        `INSERT INTO sessions(peer_did, state_blob, updated_at)
         VALUES(?, ?, ?)
         ON CONFLICT(peer_did) DO UPDATE SET state_blob = excluded.state_blob, updated_at = excluded.updated_at`
      )
      .run(peerDid, blob, Date.now());
  }

  load<T>(peerDid: string): T | null {
    const row = this.db.prepare("SELECT state_blob FROM sessions WHERE peer_did = ?").get(peerDid) as { state_blob: string } | undefined;
    if (!row) return null;
    return decryptJson<T>(row.state_blob, this.passphrase);
  }

  listPeers(): string[] {
    const rows = this.db.prepare("SELECT peer_did FROM sessions ORDER BY updated_at DESC").all() as { peer_did: string }[];
    return rows.map((r) => r.peer_did);
  }
}
