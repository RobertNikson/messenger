import React, { useEffect, useMemo, useState } from "react";

const API = "http://localhost:8787";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState([]);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const auth = async () => {
    const res = await fetch(`${API}/auth/${authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      localStorage.setItem("token", data.token);
    } else {
      alert(data.error || "Auth error");
    }
  };

  const loadUsers = async () => {
    const res = await fetch(`${API}/users`, { headers });
    const data = await res.json();
    setUsers(data.users || []);
  };

  const loadMessages = async (peerId) => {
    const res = await fetch(`${API}/messages/${peerId}`, { headers });
    const data = await res.json();
    setMessages(data.messages || []);
  };

  const send = async () => {
    if (!peer || !text.trim()) return;
    const res = await fetch(`${API}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ receiverId: peer.id, body: text }),
    });
    const data = await res.json();
    if (data.message) {
      setMessages((m) => [...m, data.message]);
      setText("");
    }
  };

  useEffect(() => {
    if (!token) return;
    loadUsers();
  }, [token]);

  useEffect(() => {
    if (!token || !peer) return;
    loadMessages(peer.id);
  }, [token, peer]);

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`${API.replace("http", "ws")}/ws?token=${token}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "message" && peer && msg.data.senderId === peer.id) {
        setMessages((m) => [...m, msg.data]);
      }
    };
    return () => ws.close();
  }, [token, peer]);

  if (!token) {
    return (
      <div style={{ maxWidth: 360, margin: "40px auto", fontFamily: "Arial" }}>
        <h2>Messenger MVP</h2>
        <select value={authMode} onChange={(e) => setAuthMode(e.target.value)}>
          <option value="login">login</option>
          <option value="register">register</option>
        </select>
        <input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ display: "block", margin: "8px 0", width: "100%" }} />
        <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ display: "block", margin: "8px 0", width: "100%" }} />
        <button onClick={auth}>Go</button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", height: "100vh", fontFamily: "Arial" }}>
      <aside style={{ borderRight: "1px solid #ddd", padding: 12 }}>
        <h3>Users</h3>
        {users.map((u) => (
          <div key={u.id}>
            <button onClick={() => setPeer(u)} style={{ width: "100%", marginBottom: 6 }}>{u.username}</button>
          </div>
        ))}
      </aside>

      <main style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ borderBottom: "1px solid #ddd", padding: 12 }}>
          <b>{peer ? `Chat with ${peer.username}` : "Pick a user"}</b>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 8 }}>
              <small>{m.senderId === peer?.id ? peer.username : "You"}</small>
              <div>{m.body}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #ddd" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type..." style={{ flex: 1 }} />
          <button onClick={send}>Send</button>
        </div>
      </main>
    </div>
  );
}
