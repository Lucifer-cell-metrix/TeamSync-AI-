/**
 * ai.js — AI integration module
 * Tries Ollama first, falls back to built-in smart analysis
 * Features: /ai command handler + Analyze Conversation button
 */

const axios = require("axios");

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "mistral"; // Change if you use a different model

/**
 * Ask Ollama (local LLM) a question.
 * Returns the full response text or throws.
 */
async function askOllama(prompt) {
  const response = await axios.post(
    OLLAMA_URL,
    { model: OLLAMA_MODEL, prompt, stream: false },
    { timeout: 30000 }
  );
  return response.data.response;
}

/**
 * Smart built-in fallback — analyzes channel messages
 */
function builtinAnalysis(messages, prompt) {
  if (!messages || messages.length === 0) {
    return "📭 No messages in this channel yet. Start chatting first!";
  }

  const userMessages = messages.filter(m => m.role !== "ai");
  const userCount = new Set(userMessages.map(m => m.username)).size;
  const keywords = extractKeywords(userMessages);
  const topics = inferTopics(userMessages);

  let reply = `## 🧠 AI Analysis\n\n`;
  reply += `**Prompt:** ${prompt}\n\n`;
  reply += `**Channel Stats:** ${userMessages.length} messages from ${userCount} members\n\n`;

  if (topics.length > 0) {
    reply += `### 🔍 Detected Topics\n`;
    topics.forEach(t => reply += `- ${t}\n`);
    reply += `\n`;
  }

  if (keywords.length > 0) {
    reply += `### 💡 Key Points\n`;
    keywords.slice(0, 5).forEach((k, i) => reply += `${i + 1}. ${k}\n`);
    reply += `\n`;
  }

  reply += `### ✅ Suggested Actions\n`;
  reply += `- Review and validate the points above\n`;
  reply += `- Assign owners to each task\n`;
  reply += `- Set a deadline and track progress\n\n`;
  reply += `> 💡 *Connect Ollama for richer AI responses: \`ollama run mistral\`*`;

  return reply;
}

function extractKeywords(messages) {
  const stopWords = new Set(["the","a","an","is","in","it","to","of","and","or","but","i","we","you","this","that","with","for","on","at","by"]);
  const freq = {};
  messages.forEach(m => {
    m.content.toLowerCase().split(/\W+/).forEach(w => {
      if (w.length > 3 && !stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function inferTopics(messages) {
  const topicPatterns = [
    { pattern: /bug|error|issue|fix|crash|problem/i, label: "🐛 Bug / Issue Tracking" },
    { pattern: /feature|build|develop|implement|create|add/i, label: "🔧 Feature Development" },
    { pattern: /deploy|server|docker|cloud|aws|k8s/i, label: "☁️ DevOps / Deployment" },
    { pattern: /ai|model|llm|ml|train|data/i, label: "🤖 AI / Machine Learning" },
    { pattern: /security|vuln|exploit|auth|token|hack/i, label: "🔐 Security" },
    { pattern: /design|ui|ux|frontend|style|component/i, label: "🎨 Design / Frontend" },
    { pattern: /api|endpoint|route|rest|graphql/i, label: "🌐 API Development" },
    { pattern: /test|spec|unit|integration|qa/i, label: "✅ Testing / QA" },
  ];

  const combined = messages.map(m => m.content).join(" ");
  return topicPatterns
    .filter(({ pattern }) => pattern.test(combined))
    .map(({ label }) => label);
}

/**
 * Main AI handler — tries Ollama, falls back to builtin
 * Used by /ai command in chat
 */
async function getAIResponse(prompt, context = []) {
  const contextStr = context.length > 0
    ? `\n\nRecent channel messages:\n${context.map(m => `[${m.username}]: ${m.content}`).join("\n")}\n\n`
    : "";

  const fullPrompt = contextStr + `User asked: ${prompt}\n\nRespond helpfully and concisely. You are TeamSync AI, an intelligent team assistant.`;

  try {
    const response = await askOllama(fullPrompt);
    return { response, source: "ollama" };
  } catch (err) {
    console.log("[AI] Ollama unavailable, using builtin analysis");
    const response = builtinAnalysis(context, prompt);
    return { response, source: "builtin" };
  }
}

/**
 * analyzeConversation — reads full channel chat and returns deep analysis.
 * Called by the "Analyze Conversation" button (POST /api/analyze-chat).
 * Sends last 50 user messages to avoid overwhelming the context window.
 */
async function analyzeConversation(channelId, messages) {
  // Only include real user messages (skip system/AI messages)
  const userMessages = messages
    .filter(m => m.type === "message" && m.role !== "ai")
    .slice(-50); // Last 50 — best practice for context window

  if (userMessages.length === 0) {
    return {
      response: "📭 **No conversation to analyze yet.**\n\nSend some messages in this channel first, then click Analyze Conversation!",
      source: "builtin",
      stats: { total: 0, participants: 0 },
    };
  }

  // Collect stats
  const participants = [...new Set(userMessages.map(m => m.username))];
  const stats = {
    total: userMessages.length,
    participants: participants.length,
    names: participants,
    channel: channelId,
  };

  // Format chat transcript for the AI
  const transcript = userMessages
    .map(m => {
      const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      return `[${time}] ${m.username}: ${m.content}`;
    })
    .join("\n");

  const prompt = `You are TeamSync AI, an intelligent team collaboration assistant.

Analyze the following group chat conversation from channel #${channelId}:

---
${transcript}
---

Participants: ${participants.join(", ")}
Total messages analyzed: ${userMessages.length}

Provide a structured analysis with these exact sections:

## 📋 Summary
A concise 2-3 sentence overview of what the team discussed.

## 🎯 Key Points
Bullet list of the most important decisions, ideas, or topics raised.

## ✅ Action Items
Specific tasks or next steps the team should take, based on the discussion.

## 💡 Suggestions
Your recommendations to help the team move forward effectively.

Be specific, practical, and use the actual names and content from the conversation.`;

  try {
    const response = await askOllama(prompt);
    return { response, source: "ollama", stats };
  } catch (err) {
    console.log("[AI] Ollama unavailable — using built-in conversation analysis");
    const response = builtinConversationAnalysis(channelId, userMessages, participants, stats);
    return { response, source: "builtin", stats };
  }
}

/**
 * Built-in deep conversation analysis (no Ollama needed)
 */
function builtinConversationAnalysis(channelId, messages, participants, stats) {
  const topics = inferTopics(messages);
  const keywords = extractKeywords(messages);

  // Extract sentences that look like decisions or action items
  const actionPatterns = /\b(should|will|need to|going to|must|plan to|let's|lets|gonna|we'll|i'll|todo|task|build|add|fix|create|update|deploy|check|review|test)\b/i;
  const actionMessages = messages
    .filter(m => actionPatterns.test(m.content))
    .slice(0, 5);

  let reply = `## 📋 Summary\n`;
  reply += `This conversation in **#${channelId}** involved **${participants.join(", ")}** `;
  reply += `across **${stats.total} messages**. `;
  if (topics.length > 0) {
    reply += `The team focused on: ${topics.join(", ")}.\n\n`;
  } else {
    reply += `The discussion covered general team collaboration topics.\n\n`;
  }

  reply += `## 🎯 Key Points\n`;
  if (keywords.length > 0) {
    keywords.slice(0, 6).forEach(k => reply += `- **${k}** was a recurring topic\n`);
  } else {
    reply += `- General discussion without specific repeated topics\n`;
  }
  reply += `\n`;

  reply += `## ✅ Action Items\n`;
  if (actionMessages.length > 0) {
    actionMessages.forEach(m => {
      reply += `- **${m.username}:** *"${m.content.length > 80 ? m.content.slice(0, 80) + "..." : m.content}"*\n`;
    });
  } else {
    reply += `- No specific action items detected — continue the discussion\n`;
    reply += `- Assign clear owners for each decision\n`;
    reply += `- Set deadlines for agreed tasks\n`;
  }
  reply += `\n`;

  reply += `## 💡 Suggestions\n`;
  reply += `- Summarize decisions in a shared doc or task board\n`;
  reply += `- Clarify ownership of each action item\n`;
  reply += `- Schedule a follow-up to check progress\n`;
  reply += `- Use \`/ai <question>\` anytime to get AI help inline\n\n`;
  reply += `> ⚡ *Install Ollama + run \`ollama pull mistral\` for deeper LLM analysis*`;

  return reply;
}

// ─────────────────────────────────────────────────────────
// DOCUMENTATION GENERATOR
// ─────────────────────────────────────────────────────────

const DOC_MODES = {
  full: {
    label: "Full SRS",
    icon: "📄",
    prompt: (transcript, participants, channel) => `
You are a senior software architect and product manager working at a top-tier tech company.

Based on the following team discussion from channel #${channel}, generate COMPLETE and PROFESSIONAL software documentation.

PARTICIPANTS: ${participants.join(", ")}

TEAM DISCUSSION:
---
${transcript}
---

Generate the following documentation sections. Be specific, use real details from the conversation, and write like a professional engineer:

## 1. 📋 Project Overview
Brief description of what is being built and why.

## 2. 🎯 Problem Statement
What problem does this solve? Who is affected?

## 3. 💡 Proposed Solution
High-level description of the solution approach.

## 4. 🧩 Features List
Complete numbered list of all features discussed.

## 5. ✅ Functional Requirements (SRS)
Detailed functional requirements in the format:
- FR-001: [requirement]
- FR-002: [requirement]

## 6. ⚙️ Non-Functional Requirements
Performance, security, scalability, reliability requirements.

## 7. 🏗️ System Architecture
High-level architecture description (Frontend, Backend, Database, AI, etc.)

## 8. 🌐 API Design
Key API endpoints in the format:
- POST /api/[endpoint] — description
- GET /api/[endpoint] — description

## 9. 🗄️ Database Design
Key tables/collections with fields.

## 10. 👤 User Flow
Step-by-step user journey through the system.

## 11. ⏱️ Timeline Estimation
Development phases with time estimates (weeks/sprints).

## 12. ⚠️ Risks & Challenges
Potential risks and mitigation strategies.

Write professionally. This will be used by a development team to build the system.`,
  },

  srs: {
    label: "SRS Only",
    icon: "📋",
    prompt: (transcript, participants, channel) => `
You are a senior business analyst writing a Software Requirements Specification (SRS) document.

Based on this team discussion from #${channel}:
---
${transcript}
---

Generate a formal SRS document:

## 📋 Software Requirements Specification

### 1. Introduction
- Purpose
- Scope
- Definitions & Abbreviations

### 2. Functional Requirements
List all FRs in format:
**FR-XXX**: Description
- Input: [what triggers it]
- Process: [what happens]
- Output: [result]

### 3. Non-Functional Requirements
- Performance: [targets]
- Security: [requirements]
- Scalability: [targets]
- Availability: [uptime]

### 4. Use Cases
For each main feature write:
**UC-XXX**: Name
- Actor: [who]
- Precondition: [state before]
- Steps: [numbered actions]
- Postcondition: [state after]

### 5. Constraints
Technical, business, or regulatory constraints.

Be detailed, professional, and complete.`,
  },

  architecture: {
    label: "Architecture",
    icon: "🏗️",
    prompt: (transcript, participants, channel) => `
You are a principal software architect designing a system.

Based on this team discussion from #${channel}:
---
${transcript}
---

Generate a detailed SYSTEM ARCHITECTURE document:

## 🏗️ System Architecture Design

### 1. Architecture Overview
High-level pattern (Microservices / Monolith / Event-driven / etc.)

### 2. System Components
For each component:
- **Component Name**
  - Responsibility
  - Technology stack
  - Interfaces

### 3. Technology Stack
| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | ... | ... |
| Backend | ... | ... |
| Database | ... | ... |
| AI/ML | ... | ... |
| Infrastructure | ... | ... |

### 4. API Design
All key endpoints with method, path, request body, response.

### 5. Database Schema
Tables/collections with key fields and relationships.

### 6. Data Flow
Step-by-step data flow for the most important user actions.

### 7. Security Architecture
Auth, authorization, encryption, rate limiting.

### 8. Scalability Plan
How will the system handle growth?

### 9. Infrastructure & Deployment
Cloud provider, containers, CI/CD pipeline.

Be technical, specific, and production-ready.`,
  },

  timeline: {
    label: "Timeline",
    icon: "⏱️",
    prompt: (transcript, participants, channel) => `
You are a senior project manager and technical lead.

Based on this team discussion from #${channel}:
---
${transcript}
---

Generate a detailed PROJECT TIMELINE and ESTIMATION document:

## ⏱️ Project Timeline & Estimation

### 1. Project Summary
- Project type
- Estimated complexity: [Low / Medium / High / Very High]
- Recommended team size

### 2. Team Composition
| Role | Count | Responsibility |
|------|-------|----------------|
| ... | ... | ... |

### 3. Development Phases
For each phase:
**Phase N: [Name]** — [X weeks]
- Deliverables
- Tasks breakdown
- Dependencies

### 4. Sprint Plan (2-week sprints)
| Sprint | Goals | Story Points |
|--------|-------|-------------|
| Sprint 1 | ... | ... |

### 5. Milestones
Key milestones with target dates (relative to start).

### 6. Effort Breakdown
| Component | Hours | Description |
|-----------|-------|-------------|
| Backend | ... | ... |
| Frontend | ... | ... |
| AI/ML | ... | ... |
| Testing | ... | ... |
| DevOps | ... | ... |
| **Total** | ... | ... |

### 7. Risk Buffer
Recommended buffer time and reasons.

### 8. Total Estimate
- Optimistic: X weeks
- Realistic: Y weeks  
- Pessimistic: Z weeks

Be realistic and specific to the discussed features.`,
  },

  tests: {
    label: "Test Cases",
    icon: "🧪",
    prompt: (transcript, participants, channel) => `
You are a senior QA engineer and test architect.

Based on this team discussion from #${channel}:
---
${transcript}
---

Generate a comprehensive TEST PLAN and TEST CASES document:

## 🧪 Test Plan & Test Cases

### 1. Test Strategy
- Testing levels: Unit, Integration, E2E, Performance
- Tools recommended
- Coverage targets

### 2. Test Cases
For each feature, write test cases in format:

**TC-XXX: [Test Case Name]**
- **Priority**: High / Medium / Low
- **Type**: Positive / Negative / Edge Case
- **Precondition**: [setup required]
- **Steps**: [numbered steps]
- **Expected Result**: [what should happen]

### 3. Edge Cases
Critical edge cases and boundary conditions to test.

### 4. Security Test Cases
Authentication, authorization, injection tests.

### 5. Performance Test Cases
Load tests, stress tests, response time targets.

### 6. Regression Test Suite
Core functionality that must always work.

Write at least 10 detailed test cases covering happy path, error cases, and edge cases.`,
  },
};

/**
 * generateDocs — turns chat conversation into professional software documentation.
 * Supports 5 modes: full, srs, architecture, timeline, tests
 */
async function generateDocs(channelId, messages, mode = "full") {
  const modeConfig = DOC_MODES[mode] || DOC_MODES.full;

  // Filter to real user messages only — last 60
  const userMessages = messages
    .filter(m => m.type === "message" && m.role !== "ai")
    .slice(-60);

  if (userMessages.length === 0) {
    return {
      docs: `📭 **No conversation found in #${channelId}.**\n\nStart discussing your project idea in the channel first, then generate documentation!`,
      source: "builtin",
      mode,
      stats: { total: 0, participants: 0 },
    };
  }

  const participants = [...new Set(userMessages.map(m => m.username))];
  const stats = {
    total: userMessages.length,
    participants: participants.length,
    names: participants,
    channel: channelId,
    mode,
  };

  // Build clean transcript
  const transcript = userMessages
    .map(m => {
      const time = m.timestamp
        ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";
      return `[${time}] ${m.username}: ${m.content}`;
    })
    .join("\n");

  const prompt = modeConfig.prompt(transcript, participants, channelId);

  console.log(`[Docs] Mode=${mode}, Channel=#${channelId}, Messages=${userMessages.length}`);

  try {
    // Ollama needs more time for doc generation — extend timeout to 90s
    const response = await axios.post(
      OLLAMA_URL,
      { model: OLLAMA_MODEL, prompt, stream: false },
      { timeout: 90000 }
    );
    return { docs: response.data.response, source: "ollama", mode, stats };
  } catch (err) {
    console.log(`[Docs] Ollama unavailable — using built-in doc generator (mode: ${mode})`);
    const docs = builtinDocGenerator(channelId, userMessages, participants, stats, mode, modeConfig);
    return { docs, source: "builtin", mode, stats };
  }
}

/**
 * Built-in documentation generator — produces structured docs without Ollama
 */
function builtinDocGenerator(channelId, messages, participants, stats, mode, modeConfig) {
  const topics     = inferTopics(messages);
  const keywords   = extractKeywords(messages);
  const allText    = messages.map(m => m.content).join(" ");

  // Try to detect project name from conversation
  const nameMatch  = allText.match(/build(?:ing)?\s+([\w\s]+?)(?:\s+app|\s+system|\s+platform|\s+tool|\.|,)/i);
  const projectName = nameMatch ? nameMatch[1].trim() : `${channelId} Project`;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  let doc = `# ${modeConfig.icon} ${modeConfig.label} — ${projectName}\n`;
  doc += `**Generated:** ${dateStr} | **Channel:** #${channelId} | **Participants:** ${participants.join(", ")}\n\n`;
  doc += `---\n\n`;

  if (mode === "full" || mode === "srs") {
    doc += `## 📋 Project Overview\n`;
    doc += `**${projectName}** is a software system discussed by ${participants.join(" and ")} `;
    doc += `across ${stats.total} messages. `;
    if (topics.length > 0) {
      doc += `The project covers: ${topics.join(", ")}.\n\n`;
    } else {
      doc += `The team discussed requirements, features, and implementation approach.\n\n`;
    }

    doc += `## 🎯 Problem Statement\n`;
    doc += `The team identified the need for a ${channelId}-related solution to improve efficiency and collaboration.\n\n`;

    doc += `## 🧩 Features List\n`;
    const featurePatterns = messages.filter(m =>
      /\b(should|need|want|add|build|implement|create|feature|module)\b/i.test(m.content)
    ).slice(0, 8);
    if (featurePatterns.length > 0) {
      featurePatterns.forEach((m, i) => {
        doc += `${i + 1}. ${m.content.slice(0, 120)}\n`;
      });
    } else {
      keywords.slice(0, 6).forEach((k, i) => doc += `${i + 1}. ${k} module\n`);
    }
    doc += `\n`;

    doc += `## ✅ Functional Requirements\n`;
    doc += `- **FR-001**: System shall allow user authentication and role management\n`;
    doc += `- **FR-002**: System shall support real-time communication between team members\n`;
    doc += `- **FR-003**: System shall integrate AI for automated analysis\n`;
    doc += `- **FR-004**: System shall provide dashboard with key metrics\n`;
    doc += `- **FR-005**: System shall export reports in multiple formats\n\n`;

    doc += `## ⚙️ Non-Functional Requirements\n`;
    doc += `- **Performance**: API response time < 500ms for 95% of requests\n`;
    doc += `- **Scalability**: Support 1,000+ concurrent users\n`;
    doc += `- **Security**: JWT auth, HTTPS, input validation, rate limiting\n`;
    doc += `- **Availability**: 99.9% uptime target\n\n`;
  }

  if (mode === "full" || mode === "architecture") {
    doc += `## 🏗️ System Architecture\n`;
    doc += `**Pattern**: REST API + WebSocket + AI Layer\n\n`;
    doc += `| Layer | Technology | Purpose |\n`;
    doc += `|-------|-----------|--------|\n`;
    doc += `| Frontend | React / HTML+JS | User interface |\n`;
    doc += `| Backend | Node.js + Express | API server |\n`;
    doc += `| Real-time | Socket.io | Live updates |\n`;
    doc += `| AI Engine | Ollama (Mistral) | Intelligence layer |\n`;
    doc += `| Database | PostgreSQL | Persistent storage |\n`;
    doc += `| Cache | Redis | Sessions & rate limiting |\n\n`;

    doc += `## 🌐 API Design\n`;
    doc += `| Method | Endpoint | Description |\n`;
    doc += `|--------|----------|-------------|\n`;
    doc += `| POST | /api/auth/login | User authentication |\n`;
    doc += `| GET | /api/channels | List all channels |\n`;
    doc += `| GET | /api/messages/:id | Fetch message history |\n`;
    doc += `| POST | /api/analyze-chat | AI conversation analysis |\n`;
    doc += `| POST | /api/generate-docs | Generate documentation |\n\n`;

    doc += `## 🗄️ Database Design\n`;
    doc += `**users** (id, username, email, role, created_at)\n`;
    doc += `**channels** (id, name, description, category, created_at)\n`;
    doc += `**messages** (id, channel_id, user_id, content, type, created_at)\n`;
    doc += `**documents** (id, channel_id, mode, content, created_by, created_at)\n\n`;
  }

  if (mode === "full" || mode === "timeline") {
    doc += `## ⏱️ Timeline Estimation\n`;
    doc += `| Phase | Description | Duration |\n`;
    doc += `|-------|-------------|----------|\n`;
    doc += `| Phase 1 | Setup, Auth, Core API | 2 weeks |\n`;
    doc += `| Phase 2 | Real-time Chat + Channels | 2 weeks |\n`;
    doc += `| Phase 3 | AI Integration | 2 weeks |\n`;
    doc += `| Phase 4 | Dashboard + Reports | 1 week |\n`;
    doc += `| Phase 5 | Testing + Deployment | 1 week |\n`;
    doc += `| **Total** | | **8 weeks** |\n\n`;
  }

  if (mode === "full" || mode === "tests") {
    doc += `## 🧪 Test Cases\n`;
    doc += `**TC-001**: User Login — Valid credentials → success\n`;
    doc += `**TC-002**: User Login — Invalid password → 401 error\n`;
    doc += `**TC-003**: Send message — Real-time delivery to all channel members\n`;
    doc += `**TC-004**: AI Analysis — Returns structured report from conversation\n`;
    doc += `**TC-005**: Doc Generation — Produces formatted SRS from chat\n`;
    doc += `**TC-006**: Channel switch — History loads correctly\n`;
    doc += `**TC-007**: Typing indicator — Shows/hides correctly\n`;
    doc += `**TC-008**: Disconnect — Graceful handling, user shown offline\n\n`;
  }

  if (mode === "full") {
    doc += `## ⚠️ Risks & Challenges\n`;
    doc += `| Risk | Impact | Likelihood | Mitigation |\n`;
    doc += `|------|--------|-----------|------------|\n`;
    doc += `| AI latency | Medium | Medium | Streaming responses, fallback |\n`;
    doc += `| Scalability | High | Low | Horizontal scaling, Redis |\n`;
    doc += `| Data security | High | Low | Encryption, RBAC, auditing |\n`;
    doc += `| Scope creep | Medium | High | Sprint planning, backlog grooming |\n\n`;
  }

  doc += `---\n`;
  doc += `> 💡 *Connect Ollama (\`ollama run mistral\`) for richer, context-aware documentation*\n`;
  doc += `> *Generated by TeamSync AI Documentation Engine*`;

  return doc;
}

module.exports = { getAIResponse, analyzeConversation, generateDocs };

