import json

def get_ai_response(messages):
    """
    Analyzes the full conversation and extracts:
    - A summary of the discussion
    - Requirements mentioned by team members
    - Suggested tasks
    """

    if not messages:
        return "No messages yet. Start a team discussion first!", "", []

    # Separate user messages (ignore previous AI messages)
    user_messages = [m for m in messages if m["role"] != "agent"]

    if not user_messages:
        return "No team messages to analyze yet.", "", []

    # Group messages by user
    by_user = {}
    for m in user_messages:
        name = m["user"]
        if name not in by_user:
            by_user[name] = {"role": m["role"], "messages": []}
        by_user[name]["messages"].append(m["content"])

    # ── Build Smart Reply ────────────────────────────────

    reply = "## 🧠 TeamMind AI Analysis\n\n"

    # Summarize what each person said
    reply += "### 💬 Discussion Summary\n"
    for user, data in by_user.items():
        role_label = data["role"].capitalize()
        reply += f"\n**{user}** ({role_label}):\n"
        for msg in data["messages"]:
            reply += f"  - {msg}\n"

    # Extract requirements from the conversation
    all_content = " ".join([m["content"] for m in user_messages])
    keywords = extract_requirements(all_content, user_messages)

    reply += "\n### 📋 Extracted Requirements\n"
    if keywords:
        for i, req in enumerate(keywords, 1):
            reply += f"{i}. {req}\n"
    else:
        reply += "- No specific requirements detected yet. Keep discussing!\n"

    reply += f"\n### 📊 Stats\n"
    reply += f"- **{len(user_messages)}** messages from **{len(by_user)}** team members\n"
    reply += f"- **{len(keywords)}** requirements identified\n"

    # ── Documentation ────────────────────────────────────

    documentation = "# 📄 Auto-Generated Project Brief\n\n"
    documentation += "## Team Members\n"
    for user, data in by_user.items():
        documentation += f"- **{user}** — {data['role'].capitalize()}\n"

    documentation += "\n## Requirements\n"
    for i, req in enumerate(keywords, 1):
        documentation += f"{i}. {req}\n"

    documentation += "\n## Discussion Log\n"
    for m in user_messages:
        documentation += f"- **{m['user']}**: {m['content']}\n"

    # ── Tasks ────────────────────────────────────────────

    tasks = generate_tasks(keywords, by_user)

    return reply, documentation, tasks


def extract_requirements(all_content, messages):
    """Extract requirements from team messages."""
    requirements = []

    for m in messages:
        content = m["content"].strip()
        # Skip very short messages (greetings, etc.)
        if len(content) < 5:
            continue

        # Detect requirement-like messages
        lower = content.lower()
        skip_words = ["hi", "hello", "hey", "ok", "okay", "yes", "no", "sure",
                       "thanks", "thank", "good", "great", "nice", "cool", "hloo"]

        if any(lower.startswith(w) for w in skip_words) and len(content) < 20:
            continue

        # This looks like a real requirement or discussion point
        user = m["user"]
        role = m["role"].capitalize()
        requirements.append(f"{content} *(by {user}, {role})*")

    return requirements


def generate_tasks(requirements, by_user):
    """Generate tasks based on extracted requirements."""
    tasks = []

    if not requirements:
        return ["💬 Continue team discussion to generate tasks"]

    for i, req in enumerate(requirements):
        # Clean the requirement text (remove the "by user" part)
        clean = req.split(" *(by")[0].strip()
        tasks.append(f"📌 {clean}")

    # Add meta tasks
    tasks.append("📝 Review and finalize requirements")
    tasks.append("🚀 Create project plan from requirements")

    return tasks
