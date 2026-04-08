/**
 * index.js — TeamSync AI Server
 * Express + Socket.io real-time communication platform
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const chatRoutes = require("./routes/chat");
const registerSocketEvents = require("./sockets/events");

// ── App Setup ─────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve client files
const CLIENT_DIR = path.join(__dirname, "..", "client");
app.use(express.static(CLIENT_DIR));

// ── REST API ──────────────────────────────────────────────
app.use("/api", chatRoutes);

// ── Catch-all → serve index.html ─────────────────────────
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

// ── Socket.io ─────────────────────────────────────────────
io.on("connection", (socket) => {
  registerSocketEvents(io, socket);
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 TeamSync AI Server running at http://localhost:${PORT}`);
  console.log(`   📡 WebSocket ready`);
  console.log(`   🤖 AI mode: Ollama (fallback: built-in)\n`);
});
