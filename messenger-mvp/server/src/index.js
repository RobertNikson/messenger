import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const PORT = Number(process.env.PORT || 8787);

const db = new Database("./messenger.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(sender_id) REFERENCES users(id),
  FOREIGN KEY(receiver_id) REFERENCES users(id)
);
`);

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(websocket);

const online = new Map(); // userId -> Set<socket>

const signToken = (user) => jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });

function auth(request, reply, done) {
  try {
    const header = request.headers.authorization || "";
    const token = header.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    request.user = jwt.verify(token, JWT_SECRET);
    done();
  } catch {
    reply.code(401).send({ error: "Unauthorized" });
  }
}

app.post("/auth/register", async (req, reply) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 4) {
    return reply.code(400).send({ error: "Invalid credentials" });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const result = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
    const user = { id: result.lastInsertRowid, username };
    return { token: signToken(user), user };
  } catch {
    return reply.code(400).send({ error: "Username already exists" });
  }
});

app.post("/auth/login", async (req, reply) => {
  const { username, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return reply.code(401).send({ error: "Invalid login" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return reply.code(401).send({ error: "Invalid login" });

  return {
    token: signToken(user),
    user: { id: user.id, username: user.username },
  };
});

app.get("/me", { preHandler: auth }, async (req) => {
  return { user: req.user };
});

app.get("/users", { preHandler: auth }, async (req) => {
  const users = db.prepare("SELECT id, username FROM users WHERE id != ? ORDER BY username ASC").all(req.user.id);
  return { users };
});

app.get("/messages/:peerId", { preHandler: auth }, async (req) => {
  const peerId = Number(req.params.peerId);
  const rows = db
    .prepare(
      `SELECT id, sender_id as senderId, receiver_id as receiverId, body, created_at as createdAt
       FROM messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY id ASC
       LIMIT 200`
    )
    .all(req.user.id, peerId, peerId, req.user.id);
  return { messages: rows };
});

app.post("/messages", { preHandler: auth }, async (req, reply) => {
  const { receiverId, body } = req.body || {};
  if (!receiverId || !body?.trim()) return reply.code(400).send({ error: "Invalid message" });

  const result = db
    .prepare("INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)")
    .run(req.user.id, Number(receiverId), body.trim());

  const message = db
    .prepare(
      `SELECT id, sender_id as senderId, receiver_id as receiverId, body, created_at as createdAt
       FROM messages WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  const targetSockets = online.get(Number(receiverId));
  if (targetSockets) {
    const payload = JSON.stringify({ type: "message", data: message });
    for (const ws of targetSockets) ws.send(payload);
  }

  return { message };
});

app.get("/ws", { websocket: true }, (socket, req) => {
  try {
    const token = req.query?.token;
    const user = jwt.verify(token, JWT_SECRET);
    const uid = Number(user.id);

    if (!online.has(uid)) online.set(uid, new Set());
    online.get(uid).add(socket);

    socket.on("close", () => {
      const set = online.get(uid);
      if (!set) return;
      set.delete(socket);
      if (set.size === 0) online.delete(uid);
    });
  } catch {
    socket.close();
  }
});

app.listen({ port: PORT, host: "0.0.0.0" });
