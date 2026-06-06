from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import os

load_dotenv()

COLLECTION_NAME = "ghost_memories"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


def _get_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


model = SentenceTransformer(EMBEDDING_MODEL_NAME)


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(
        url=_get_env("QDRANT_URL"),
        api_key=_get_env("QDRANT_API_KEY"),
    )


def ensure_collection(client: QdrantClient) -> None:
    collections = client.get_collections().collections
    if any(collection.name == COLLECTION_NAME for collection in collections):
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=model.get_sentence_embedding_dimension(),
            distance=models.Distance.COSINE,
        ),
    )


def embed_text(text: str) -> list[float]:
    return model.encode(text).tolist()


def build_memory_payload(
    conversation: str,
    emotion: str,
    topic: str,
    timestamp: str | None = None,
) -> dict[str, Any]:
    return {
        "conversation": conversation,
        "emotion": emotion,
        "topic": topic,
        "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
    }


def store_memory(conversation: str, emotion: str, topic: str) -> str:
    client = get_qdrant_client()
    ensure_collection(client)

    payload = build_memory_payload(
        conversation=conversation,
        emotion=emotion,
        topic=topic,
    )
    vector = embed_text(conversation)
    point_id = str(uuid.uuid4())

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            models.PointStruct(
                id=point_id,
                vector=vector,
                payload=payload,
            )
        ],
    )
    return point_id


def search_memories(query: str, limit: int = 3) -> list[models.ScoredPoint]:
    client = get_qdrant_client()
    ensure_collection(client)
    query_vector = embed_text(query)

    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=limit,
    )
    return response.points


if __name__ == "__main__":
    # Quick local smoke check after you add real credentials in .env.
    memory_id = store_memory(
        conversation="I feel nervous about placements.",
        emotion="stress",
        topic="placements",
    )
    print(f"Stored memory: {memory_id}")

    results = search_memories("I feel nervous again")
    for result in results:
        print(result.payload)
