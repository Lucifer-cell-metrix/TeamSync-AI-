/**
 * chat.js — REST routes for channels and message history
 */

const express = require("express");
const router = express.Router();
const store = require("../data/store");
const { analyzeConversation, generateDocs } = require("../ai");

// GET /api/channels — list all channels
router.get("/channels", (req, res) => {
  const channels = store.getChannels();
  res.json({ channels });
});

// GET /api/messages/:channelId — fetch message history
router.get("/messages/:channelId", (req, res) => {
  const { channelId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const messages = store.getMessages(channelId, limit);
  res.json({ messages });
});

// GET /api/online — list online users
router.get("/online", (req, res) => {
  res.json({ users: store.getOnlineUsers() });
});

// DELETE /api/messages/:channelId — clear channel
router.delete("/messages/:channelId", (req, res) => {
  store.clearChannel(req.params.channelId);
  res.json({ success: true });
});

// POST /api/analyze-chat — AI reads entire channel and returns structured analysis
router.post("/analyze-chat", async (req, res) => {
  const { channelId } = req.body;

  if (!channelId) {
    return res.status(400).json({ error: "channelId is required" });
  }

  try {
    // Fetch up to 100 messages (analyzeConversation will filter + limit to 50 user msgs)
    const messages = store.getMessages(channelId, 100);

    console.log(`[Analyze] #${channelId}: ${messages.length} messages → AI`);

    const result = await analyzeConversation(channelId, messages);

    res.json({
      success: true,
      channelId,
      ...result,
    });
  } catch (err) {
    console.error("[Analyze Error]", err.message);
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

// POST /api/generate-docs — AI generates professional software documentation from chat
// modes: full | srs | architecture | timeline | tests
router.post("/generate-docs", async (req, res) => {
  const { channelId, mode = "full" } = req.body;

  const validModes = ["full", "srs", "architecture", "timeline", "tests"];
  if (!channelId) {
    return res.status(400).json({ error: "channelId is required" });
  }
  if (!validModes.includes(mode)) {
    return res.status(400).json({ error: `mode must be one of: ${validModes.join(", ")}` });
  }

  try {
    const messages = store.getMessages(channelId, 100);
    console.log(`[Docs] #${channelId} mode=${mode}: ${messages.length} messages`);

    const result = await generateDocs(channelId, messages, mode);
    res.json({ success: true, channelId, ...result });
  } catch (err) {
    console.error("[Docs Error]", err.message);
    res.status(500).json({ error: "Documentation generation failed. Please try again." });
  }
});

module.exports = router;

