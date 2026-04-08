/**
 * events.js — Socket.io event handlers
 * Manages: join, message, AI commands, typing, disconnect
 */

const { v4: uuidv4 } = require("uuid");
const store = require("../data/store");
const { getAIResponse } = require("../ai");

// Avatar colors for users
const COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#f43f5e", "#06b6d4", "#84cc16", "#ec4899",
];

let colorIndex = 0;
const getNextColor = () => COLORS[colorIndex++ % COLORS.length];

// Typing debounce timers
const typingTimers = new Map();

module.exports = function registerSocketEvents(io, socket) {

  // ── Join ───────────────────────────────────────────────
  socket.on("join", ({ username, avatar }) => {
    const userColor = getNextColor();
    const userInfo = {
      id: socket.id,
      username: username || "Anonymous",
      avatar: avatar || username?.[0]?.toUpperCase() || "?",
      color: userColor,
      channel: "general",
      joinedAt: new Date().toISOString(),
    };

    store.addUser(socket.id, userInfo);

    // Join the default channel room
    socket.join("general");

    // Send initial data to the joining user
    socket.emit("init", {
      user: userInfo,
      channels: store.getChannels(),
      onlineUsers: store.getOnlineUsers(),
      messages: store.getMessages("general", 50),
    });

    // Tell everyone else someone joined
    socket.broadcast.emit("user:joined", { user: userInfo });
    io.emit("users:update", { users: store.getOnlineUsers() });

    // System message in general
    const sysMsg = {
      id: uuidv4(),
      type: "system",
      content: `${userInfo.username} joined the server`,
      channelId: "general",
      timestamp: new Date().toISOString(),
    };
    store.addMessage("general", sysMsg);
    io.to("general").emit("message:new", sysMsg);

    console.log(`[+] ${userInfo.username} connected (${socket.id})`);
  });

  // ── Switch Channel ─────────────────────────────────────
  socket.on("channel:join", ({ channelId }) => {
    const user = store.getUserBySocket(socket.id);
    if (!user) return;

    // Leave old channel room
    socket.leave(user.channel);
    store.updateUserChannel(socket.id, channelId);
    socket.join(channelId);

    // Send history for new channel
    socket.emit("channel:history", {
      channelId,
      messages: store.getMessages(channelId, 50),
    });

    console.log(`[~] ${user.username} → #${channelId}`);
  });

  // ── Send Message ───────────────────────────────────────
  socket.on("message:send", async ({ channelId, content }) => {
    const user = store.getUserBySocket(socket.id);
    if (!user || !content?.trim()) return;

    const trimmed = content.trim();

    // ── AI Command: /ai <prompt> ──────────────────────
    if (trimmed.startsWith("/ai ") || trimmed === "/ai") {
      const prompt = trimmed.replace(/^\/ai\s*/, "").trim() || "Analyze this conversation";

      // Echo the user's command as a message
      const userMsg = {
        id: uuidv4(),
        type: "message",
        username: user.username,
        avatar: user.avatar,
        color: user.color,
        content: trimmed,
        channelId,
        timestamp: new Date().toISOString(),
        role: "user",
      };
      store.addMessage(channelId, userMsg);
      io.to(channelId).emit("message:new", userMsg);

      // Emit typing indicator for AI
      io.to(channelId).emit("ai:thinking", { channelId });

      // Get recent context
      const context = store.getMessages(channelId, 20).filter(m => m.type === "message");

      try {
        const { response, source } = await getAIResponse(prompt, context);

        const aiMsg = {
          id: uuidv4(),
          type: "ai",
          username: "TeamSync AI",
          avatar: "🤖",
          color: "#8b5cf6",
          content: response,
          source,
          channelId,
          timestamp: new Date().toISOString(),
          role: "ai",
        };
        store.addMessage(channelId, aiMsg);
        io.to(channelId).emit("message:new", aiMsg);
      } catch (err) {
        console.error("[AI Error]", err.message);
        const errMsg = {
          id: uuidv4(),
          type: "ai",
          username: "TeamSync AI",
          avatar: "🤖",
          color: "#f43f5e",
          content: "⚠️ AI is temporarily unavailable. Please try again.",
          channelId,
          timestamp: new Date().toISOString(),
          role: "ai",
        };
        io.to(channelId).emit("message:new", errMsg);
      }

      io.to(channelId).emit("ai:done", { channelId });
      return;
    }

    // ── Regular Message ────────────────────────────────
    const msg = {
      id: uuidv4(),
      type: "message",
      username: user.username,
      avatar: user.avatar,
      color: user.color,
      content: trimmed,
      channelId,
      timestamp: new Date().toISOString(),
      role: "user",
    };

    store.addMessage(channelId, msg);
    io.to(channelId).emit("message:new", msg);
  });

  // ── Typing Indicators ──────────────────────────────────
  socket.on("typing:start", ({ channelId }) => {
    const user = store.getUserBySocket(socket.id);
    if (!user) return;

    socket.to(channelId).emit("user:typing", { username: user.username, channelId });

    // Auto-stop after 3s
    if (typingTimers.has(socket.id)) clearTimeout(typingTimers.get(socket.id));
    typingTimers.set(socket.id, setTimeout(() => {
      socket.to(channelId).emit("user:stopTyping", { username: user.username, channelId });
    }, 3000));
  });

  socket.on("typing:stop", ({ channelId }) => {
    const user = store.getUserBySocket(socket.id);
    if (!user) return;
    if (typingTimers.has(socket.id)) {
      clearTimeout(typingTimers.get(socket.id));
      typingTimers.delete(socket.id);
    }
    socket.to(channelId).emit("user:stopTyping", { username: user.username, channelId });
  });

  // ── Disconnect ─────────────────────────────────────────
  socket.on("disconnect", () => {
    const user = store.removeUser(socket.id);
    if (typingTimers.has(socket.id)) {
      clearTimeout(typingTimers.get(socket.id));
      typingTimers.delete(socket.id);
    }
    if (user) {
      io.emit("user:left", { user });
      io.emit("users:update", { users: store.getOnlineUsers() });

      // System message
      const sysMsg = {
        id: uuidv4(),
        type: "system",
        content: `${user.username} left the server`,
        channelId: user.channel,
        timestamp: new Date().toISOString(),
      };
      store.addMessage(user.channel, sysMsg);
      io.to(user.channel).emit("message:new", sysMsg);

      console.log(`[-] ${user.username} disconnected`);
    }
  });

};
