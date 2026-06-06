from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

from backend.qdrant_setup import _get_env, list_memories, search_memories, store_memory

app = FastAPI(title="Ghost Mentor API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MemoryCreate(BaseModel):
    conversation: str = Field(..., min_length=1)
    emotion: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1)
    timestamp: str | None = None


class MemoryResponse(BaseModel):
    id: str
    stored: bool = True


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    limit: int = Field(default=3, ge=1, le=10)


class ChatMemory(BaseModel):
    conversation: str
    emotion: str
    topic: str
    timestamp: str | None = None


class ChatResponse(BaseModel):
    reply: str
    memories: list[ChatMemory]


class TimelineResponse(BaseModel):
    memories: list[ChatMemory]


def _serialize_memory_payload(payload: Any) -> ChatMemory | None:
    if not isinstance(payload, dict):
        return None

    conversation = payload.get("conversation")
    emotion = payload.get("emotion")
    topic = payload.get("topic")

    if not all(isinstance(value, str) and value for value in [conversation, emotion, topic]):
        return None

    timestamp = payload.get("timestamp")
    return ChatMemory(
        conversation=conversation,
        emotion=emotion,
        topic=topic,
        timestamp=timestamp if isinstance(timestamp, str) else None,
    )


def _generate_fallback_reply(message: str, memories: list[ChatMemory]) -> str:
    if not memories:
        return (
            "I am here with you. I do not have any related memories yet, "
            f"but I hear that you said: '{message}'. Tell me a little more so I can support you better."
        )

    latest = memories[0]
    return (
        f"You mentioned '{message}'. I found a related memory about {latest.topic} "
        f"when you felt {latest.emotion}. Let us use that progress as context and take the next step calmly."
    )


def _generate_openai_reply(message: str, memories: list[ChatMemory]) -> str:
    api_key = _get_env("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key)

    memory_lines = [
        (
            f"- Conversation: {memory.conversation}\n"
            f"  Emotion: {memory.emotion}\n"
            f"  Topic: {memory.topic}\n"
            f"  Timestamp: {memory.timestamp or 'unknown'}"
        )
        for memory in memories
    ]
    memory_context = "\n".join(memory_lines) if memory_lines else "- No related memories found."

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "system",
                "content": (
                    "You are Ghost Mentor, a supportive AI growth companion. "
                    "Use the retrieved memory context when it is helpful, keep the tone warm, "
                    "and give concise, practical mentorship."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"User message:\n{message}\n\n"
                    f"Retrieved memories:\n{memory_context}"
                ),
            },
        ],
    )
    return response.output_text.strip()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/memory", response_model=MemoryResponse)
def create_memory(memory: MemoryCreate) -> MemoryResponse:
    try:
        memory_id = store_memory(
            conversation=memory.conversation,
            emotion=memory.emotion,
            topic=memory.topic,
            timestamp=memory.timestamp,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return MemoryResponse(id=memory_id)


@app.post("/mentor/chat", response_model=ChatResponse)
def mentor_chat(chat: ChatRequest) -> ChatResponse:
    try:
        results = search_memories(chat.message, limit=chat.limit)
        memories = [
            memory
            for result in results
            if (memory := _serialize_memory_payload(result.payload)) is not None
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    try:
        reply = _generate_openai_reply(chat.message, memories)
    except Exception:
        reply = _generate_fallback_reply(chat.message, memories)

    return ChatResponse(reply=reply, memories=memories)


@app.get("/timeline", response_model=TimelineResponse)
def get_timeline(limit: int = 20) -> TimelineResponse:
    try:
        memories = [
            memory
            for payload in list_memories(limit=limit)
            if (memory := _serialize_memory_payload(payload)) is not None
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return TimelineResponse(memories=memories)
