# 👻 Ghost Mentor

> *"The AI that remembers who you're becoming."*

A voice-first AI growth companion with **persistent long-term memory**, **emotional intelligence**, and a **multi-agent system** that evolves with the user.

---

## 🏗️ Monorepo Structure

```
Ghost Mentor/
├── frontend/   → Next.js + Tailwind CSS UI
├── backend/    → Python FastAPI server (API, Qdrant, Omi integration)
└── agent/      → Lyzr multi-agent orchestration (Memory, Reflection, Career, Productivity, Motivation, Retrieval)
```

---

## 🧠 Core Concept

| Layer | Tech | Purpose |
|---|---|---|
| Voice | **Omi** | Capture & transcribe voice |
| Memory | **Qdrant** | Persistent semantic memory |
| Intelligence | **Lyzr** | Multi-agent reasoning |
| Backend | **Python / FastAPI** | API & orchestration |
| Frontend | **Next.js + Tailwind** | User interface |

---

## 🌊 Data Flow

```
Voice → Omi (STT) → Embeddings → Qdrant → Lyzr Agents → Personalized Insight
```

---

## 🚀 Getting Started

Setup instructions for each module will be added as we build them out.

- See `frontend/README.md` for UI setup
- See `backend/README.md` for API setup
- See `agent/README.md` for agent system setup

---

## 📜 License

TBD
