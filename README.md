<h1 align="center">🧠 TeamSync AI</h1>

<p align="center">
  <strong>Real-Time Communication Platform + AI Product Manager</strong><br/>
  Your team discusses → AI reads the conversation → generates analysis, SRS docs, architecture, timelines & test cases.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/Socket.io-4-010101?style=for-the-badge&logo=socket.io&logoColor=white"/>
  <img src="https://img.shields.io/badge/Ollama-Mistral-purple?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Built%20from-Scratch-ff6b35?style=for-the-badge"/>
</p>

---

## 🚀 What is TeamSync AI?

**TeamSync AI** is a fully custom-built real-time communication platform — built **from scratch**, no Discord, no Slack, no third-party chat service. Your team chats in real-time, then the AI reads the entire conversation and generates professional software documentation automatically.

> Think of it as: **Slack + Notion AI + Jira — combined, built by you.**

---

## ✨ Features

### 💬 Real-Time Communication
- Multi-channel chat (General, Dev, AI Lab, Bug Bounty, Random)
- WebSocket-based instant messaging via Socket.io
- Live typing indicators
- Online presence & members sidebar
- Message history persisted to JSON

### 🤖 AI Assistant (`/ai` command)
- Type `/ai <anything>` directly in chat
- Connects to local **Ollama (mistral)** if running
- **Smart built-in fallback** — works without Ollama too
- Reads recent channel context for relevant answers

### 🔬 Analyze Conversation
- Click **Analyze Chat** button in the header
- AI reads the entire channel conversation (last 50 msgs)
- Returns:
  - 📋 Summary
  - 🎯 Key Points
  - ✅ Action Items
  - 💡 Suggestions
- Shows participant stats, AI source indicator
- Option to post analysis to chat

### 📄 Generate Documentation (AI Product Manager)
- Click **Generate Docs** button — pick a mode:

| Mode | What It Generates |
|------|-------------------|
| 📤 **Full SRS** | 12-section professional software doc |
| 📋 **SRS Only** | FR-001 requirements + use cases |
| 🏗️ **Architecture** | Tech stack, API design, DB schema |
| ⏱️ **Timeline** | Sprint plan, effort breakdown, team size |
| 🧪 **Test Cases** | TC-001 format, edge cases, security tests |

- Export as **PDF** (browser print)
- **Copy to clipboard** (raw markdown)
- **Post to Chat** — share in channel

---

## 🏗️ Project Structure

```
teammind-ai/
├── server/
│   ├── index.js              # Express + Socket.io server entry
│   ├── ai.js                 # AI engine: /ai command + analyze + generateDocs
│   ├── routes/
│   │   └── chat.js           # REST: channels, messages, analyze-chat, generate-docs
│   ├── sockets/
│   │   └── events.js         # All WebSocket event handlers
│   └── data/
│       ├── store.js          # JSON-backed data store
│       └── db.json           # Persisted messages (auto-created)
├── client/
│   └── index.html            # Complete SPA — premium Discord-like UI
├── backend/                  # Original Python/FastAPI prototype (kept for reference)
│   ├── main.py
│   ├── ai.py
│   └── memory.py
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites

- **Node.js 18+**
- **npm**
- *(Optional)* **Ollama** with mistral model for full LLM power

### 1️⃣ Clone

```bash
git clone https://github.com/Lucifer-cell-metrix/TeamSync-AI-.git
cd TeamSync-AI-
```

### 2️⃣ Install Dependencies

```bash
cd server
npm install
```

### 3️⃣ Run the Server

```bash
node index.js
```

### 4️⃣ Open in Browser

Go to **[http://localhost:3000](http://localhost:3000)** 🎉

---

## 🤖 Optional: Enable Full Ollama AI

For richer, context-aware AI responses:

```bash
# Install Ollama from https://ollama.ai
ollama pull mistral
ollama run mistral
```

The server auto-detects Ollama. If not running, the **built-in smart engine** handles all AI features automatically — no setup required.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/channels` | List all channels |
| `GET` | `/api/messages/:channelId` | Fetch channel message history |
| `GET` | `/api/online` | List online users |
| `POST` | `/api/analyze-chat` | AI reads channel → summary + action items |
| `POST` | `/api/generate-docs` | Generate SRS/architecture/timeline/tests from chat |
| `DELETE` | `/api/messages/:channelId` | Clear channel history |

### Doc Generation Modes

```bash
curl -X POST http://localhost:3000/api/generate-docs \
  -H "Content-Type: application/json" \
  -d '{"channelId": "general", "mode": "full"}'

# mode options: full | srs | architecture | timeline | tests
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express 5, Socket.io |
| **Frontend** | HTML5, Vanilla CSS, Vanilla JavaScript |
| **Real-time** | WebSockets via Socket.io |
| **AI Engine** | Ollama (mistral) + custom built-in fallback |
| **Storage** | JSON file-based persistence |
| **Design** | Dark theme, glassmorphism, CSS animations, Inter font |

> 100% built from scratch. No Discord API. No Slack. No boilerplate templates.

---

## 🧠 How the AI Works

### `/ai` Command
Sends recent channel context + your prompt to Ollama → built-in smart analysis fallback if Ollama is offline.

### Analyze Conversation
Fetches last 50 user messages from channel → formats as transcript with timestamps → sends to Ollama with a structured analysis prompt → returns 4-section report.

### Generate Docs
Fetches last 60 messages → applies mode-specific expert prompt (senior architect / BA / QA / PM) → Ollama generates professional structured documentation → built-in fallback produces template-based docs using detected topics/keywords from conversation.

---

## 💬 How to Use

1. Open **http://localhost:3000**
2. Enter your name + pick an avatar emoji
3. **Send messages** in any channel — have a real discussion
4. Use **`/ai <question>`** for inline AI help
5. Click **🔬 Analyze Chat** — AI reads the full conversation
6. Click **📎 Generate Docs** — pick the doc type you need
7. Export, copy, or post the docs to chat

---

<p align="center">
  Built from scratch by <strong>Lucifer</strong> 🔥 | No templates. No shortcuts.
</p>
