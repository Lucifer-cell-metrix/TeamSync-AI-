/**
 * store.js — In-memory + file-backed data store
 * Handles channels, messages, and online users
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "db.json");

// ── Default data structure ────────────────────────────────
const DEFAULT_DATA = {
  channels: [
    { id: "general",    name: "general",    icon: "💬", description: "Team-wide discussion", category: "text" },
    { id: "dev",        name: "dev",        icon: "💻", description: "Development talk",     category: "text" },
    { id: "ai-lab",     name: "ai-lab",     icon: "🤖", description: "AI experiments",       category: "text" },
    { id: "random",     name: "random",     icon: "🎲", description: "Off-topic chatter",    category: "text" },
    { id: "bug-bounty", name: "bug-bounty", icon: "🐛", description: "Security findings",    category: "text" },
  ],
  messages: {},   // keyed by channelId
  users: {},      // keyed by socketId
};

// ── Load / Save ───────────────────────────────────────────

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Store load error:", e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function save(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Store save error:", e.message);
  }
}

// ── In-memory state ───────────────────────────────────────
let db = load();

// Ensure all channels have message arrays
db.channels.forEach(ch => {
  if (!db.messages[ch.id]) db.messages[ch.id] = [];
});

// Online users — never persisted (ephemeral)
const onlineUsers = new Map(); // socketId → { username, avatar, color, channel }

// ── API ───────────────────────────────────────────────────

const store = {
  // Channels
  getChannels: () => db.channels,

  // Messages
  getMessages: (channelId, limit = 50) => {
    const msgs = db.messages[channelId] || [];
    return msgs.slice(-limit);
  },

  addMessage: (channelId, msg) => {
    if (!db.messages[channelId]) db.messages[channelId] = [];
    db.messages[channelId].push(msg);
    // Keep only last 200 messages per channel
    if (db.messages[channelId].length > 200) {
      db.messages[channelId] = db.messages[channelId].slice(-200);
    }
    save(db);
    return msg;
  },

  clearChannel: (channelId) => {
    db.messages[channelId] = [];
    save(db);
  },

  // Online users (in-memory only)
  addUser: (socketId, userInfo) => {
    onlineUsers.set(socketId, userInfo);
  },

  removeUser: (socketId) => {
    const user = onlineUsers.get(socketId);
    onlineUsers.delete(socketId);
    return user;
  },

  getOnlineUsers: () => Array.from(onlineUsers.values()),

  getUserBySocket: (socketId) => onlineUsers.get(socketId),

  updateUserChannel: (socketId, channelId) => {
    const user = onlineUsers.get(socketId);
    if (user) {
      user.channel = channelId;
      onlineUsers.set(socketId, user);
    }
  },
};

module.exports = store;
