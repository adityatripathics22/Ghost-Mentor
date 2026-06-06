"use client";

import { FormEvent, useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type MemoryFormState = {
  conversation: string;
  emotion: string;
  topic: string;
};

type MemoryRecord = {
  conversation: string;
  emotion: string;
  topic: string;
  timestamp?: string | null;
};

type ChatResponse = {
  reply: string;
  memories: MemoryRecord[];
};

type TimelineResponse = {
  memories: MemoryRecord[];
};

const initialMemoryForm: MemoryFormState = {
  conversation: "",
  emotion: "stress",
  topic: "placements",
};

function formatTimestamp(timestamp?: string | null) {
  if (!timestamp) {
    return "Time not available";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export default function Home() {
  const [memoryForm, setMemoryForm] = useState<MemoryFormState>(initialMemoryForm);
  const [memoryStatus, setMemoryStatus] = useState<string>("");
  const [memoryLoading, setMemoryLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [relatedMemories, setRelatedMemories] = useState<MemoryRecord[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const [timeline, setTimeline] = useState<MemoryRecord[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState("");

  async function loadTimeline() {
    setTimelineLoading(true);
    setTimelineError("");

    try {
      const response = await fetch(`${API_BASE_URL}/timeline?limit=12`);
      if (!response.ok) {
        const data = (await response.json()) as { detail?: string };
        throw new Error(data.detail ?? "Failed to load the memory timeline.");
      }

      const data = (await response.json()) as TimelineResponse;
      setTimeline(data.memories);
    } catch (error) {
      setTimelineError(
        error instanceof Error ? error.message : "Something went wrong while loading timeline.",
      );
    } finally {
      setTimelineLoading(false);
    }
  }

  useEffect(() => {
    void loadTimeline();
  }, []);

  async function handleSaveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMemoryLoading(true);
    setMemoryStatus("");

    try {
      const response = await fetch(`${API_BASE_URL}/memory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(memoryForm),
      });

      if (!response.ok) {
        const data = (await response.json()) as { detail?: string };
        throw new Error(data.detail ?? "Failed to save memory.");
      }

      setMemoryStatus("Memory stored successfully.");
      setMemoryForm(initialMemoryForm);
      await loadTimeline();
    } catch (error) {
      setMemoryStatus(
        error instanceof Error ? error.message : "Something went wrong while saving memory.",
      );
    } finally {
      setMemoryLoading(false);
    }
  }

  async function handleMentorChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChatLoading(true);
    setChatError("");

    try {
      const response = await fetch(`${API_BASE_URL}/mentor/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          limit: 3,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { detail?: string };
        throw new Error(data.detail ?? "Failed to talk to Ghost Mentor.");
      }

      const data = (await response.json()) as ChatResponse;
      setChatReply(data.reply);
      setRelatedMemories(data.memories);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Something went wrong while chatting.",
      );
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1b2c52_0%,_#09111f_42%,_#050814_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">
                Ghost Mentor
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                A memory-aware mentor with a live timeline.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                Save a moment, see it appear in the growth history, and ask for support grounded
                in recalled memories.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
              Backend: <span className="font-medium">{API_BASE_URL}</span>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.7fr_0.9fr_1.1fr]">
          <aside className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-black/20">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Growth Timeline</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Recent memories pulled directly from your Qdrant collection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadTimeline()}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            {timelineError ? (
              <p className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                {timelineError}
              </p>
            ) : null}

            <div className="space-y-4">
              {timelineLoading ? (
                <p className="text-sm text-slate-400">Loading timeline...</p>
              ) : timeline.length > 0 ? (
                timeline.map((memory, index) => (
                  <article
                    key={`${memory.timestamp ?? "timeline"}-${index}`}
                    className="rounded-2xl border border-white/8 bg-white/5 p-4"
                  >
                    <p className="text-sm leading-6 text-slate-100">{memory.conversation}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/8 px-3 py-1">
                        Emotion: {memory.emotion}
                      </span>
                      <span className="rounded-full bg-white/8 px-3 py-1">
                        Topic: {memory.topic}
                      </span>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">
                      {formatTimestamp(memory.timestamp)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  No memories yet. Save your first one to start the timeline.
                </p>
              )}
            </div>
          </aside>

          <form
            onSubmit={handleSaveMemory}
            className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-black/20"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Store Memory</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Capture a user moment with emotion and topic metadata so it can be recalled later.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Conversation</span>
                <textarea
                  value={memoryForm.conversation}
                  onChange={(event) =>
                    setMemoryForm((current) => ({
                      ...current,
                      conversation: event.target.value,
                    }))
                  }
                  className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                  placeholder="I feel nervous about placements."
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Emotion</span>
                  <input
                    value={memoryForm.emotion}
                    onChange={(event) =>
                      setMemoryForm((current) => ({
                        ...current,
                        emotion: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                    placeholder="stress"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Topic</span>
                  <input
                    value={memoryForm.topic}
                    onChange={(event) =>
                      setMemoryForm((current) => ({
                        ...current,
                        topic: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                    placeholder="placements"
                    required
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={memoryLoading}
                className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {memoryLoading ? "Saving..." : "Save memory"}
              </button>
              <p className="text-sm text-slate-300">{memoryStatus}</p>
            </div>
          </form>

          <form
            onSubmit={handleMentorChat}
            className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-black/20"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Talk To Ghost Mentor</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Ask a question and the API will retrieve related memories before generating a
                supportive response.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                placeholder="I feel nervous again. How have I improved?"
                required
              />
            </label>

            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={chatLoading}
                className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chatLoading ? "Thinking..." : "Ask mentor"}
              </button>
              <p className="text-sm text-rose-300">{chatError}</p>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Reply</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                  {chatReply || "Your mentor response will appear here."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Related Memories
                </p>
                <div className="mt-3 space-y-3">
                  {relatedMemories.length > 0 ? (
                    relatedMemories.map((memory, index) => (
                      <article
                        key={`${memory.timestamp ?? "memory"}-${index}`}
                        className="rounded-2xl border border-white/8 bg-white/5 p-4"
                      >
                        <p className="text-sm leading-6 text-slate-100">{memory.conversation}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          <span className="rounded-full bg-white/8 px-3 py-1">
                            Emotion: {memory.emotion}
                          </span>
                          <span className="rounded-full bg-white/8 px-3 py-1">
                            Topic: {memory.topic}
                          </span>
                          <span className="rounded-full bg-white/8 px-3 py-1">
                            {formatTimestamp(memory.timestamp)}
                          </span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      Retrieved memories will appear here after your first chat request.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
