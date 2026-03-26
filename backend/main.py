from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from pathlib import Path
from ai import get_ai_response
from memory import load_memory, save_memory

app = FastAPI()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to frontend
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

class Message(BaseModel):
    user: str
    role: str
    content: str

@app.get("/", response_class=HTMLResponse)
def home():
    html_file = FRONTEND_DIR / "index.html"
    return html_file.read_text(encoding="utf-8")

@app.get("/history")
def history():
    return load_memory()

@app.post("/chat")
def chat(msg: Message):
    """Add a team member message (no AI response)."""
    memory = load_memory()

    memory.append({
        "user": msg.user,
        "role": msg.role,
        "content": msg.content
    })

    save_memory(memory)

    return {"status": "ok"}

@app.post("/ask-ai")
def ask_ai():
    """Call AI to analyze the conversation and generate insights."""
    memory = load_memory()

    ai_reply, doc, tasks = get_ai_response(memory)

    # Add AI response to memory
    memory.append({
        "user": "TeamMind AI",
        "role": "agent",
        "content": ai_reply
    })

    save_memory(memory)

    return {
        "reply": ai_reply,
        "documentation": doc,
        "tasks": tasks
    }

@app.delete("/clear")
def clear():
    save_memory([])
    return {"message": "Chat cleared"}
