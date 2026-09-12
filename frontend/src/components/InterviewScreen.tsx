"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { ApiError, Difficulty, Message, submitAnswer } from "@/lib/api";

interface InterviewScreenProps {
  topic: string;
  difficulty: Difficulty;
  firstMessage: string;
  onEnded: (history: Message[]) => void;
}

export default function InterviewScreen({
  topic,
  difficulty,
  firstMessage,
  onEnded,
}: InterviewScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "interviewer", content: firstMessage },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function sendToServer(nextHistory: Message[]) {
    setSending(true);
    setError(null);
    let didEnd = false;
    try {
      const turn = await submitAnswer(topic, difficulty, nextHistory);
      const updated: Message[] = [
        ...nextHistory,
        { role: "interviewer", content: turn.message },
      ];
      setMessages(updated);
      if (turn.ended) {
        didEnd = true;
        setEnded(true);
        window.setTimeout(() => onEnded(updated), 900);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSending(false);
      if (!didEnd) textareaRef.current?.focus();
    }
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending || ended) return;
    const nextHistory: Message[] = [
      ...messages,
      { role: "candidate", content: trimmed },
    ];
    setMessages(nextHistory);
    setInput("");
    void sendToServer(nextHistory);
  }

  function handleRetry() {
    void sendToServer(messages);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-4 sm:px-6">
        <h1 className="truncate text-base font-medium text-neutral-100">
          {topic}
        </h1>
        <span className="shrink-0 rounded-full border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-300">
          {difficulty}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((message, i) => (
            <ChatBubble key={i} message={message} />
          ))}
          {sending && <ThinkingBubble />}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-neutral-800 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-900 bg-rose-950/40 px-4 py-2.5 text-sm text-rose-300">
              <span>{error}</span>
              <button
                type="button"
                onClick={handleRetry}
                className="shrink-0 rounded font-medium text-rose-200 underline underline-offset-2 outline-none hover:text-rose-100 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                Retry
              </button>
            </div>
          )}

          {ended ? (
            <p className="py-2 text-center text-sm text-neutral-500">
              Interview complete — preparing your report…
            </p>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                autoFocus
                rows={1}
                placeholder="Type your answer…"
                className="max-h-40 flex-1 resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="flex h-[42px] shrink-0 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-neutral-950 outline-none transition-colors hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isCandidate = message.role === "candidate";
  return (
    <div className={`flex ${isCandidate ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isCandidate
            ? "bg-emerald-500 text-neutral-950"
            : "border border-neutral-800 bg-neutral-900/60 text-neutral-100"
        }`}
      >
        {!isCandidate && (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Interviewer
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
        <span className="sr-only">Interviewer is thinking</span>
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500"
      style={{ animationDelay: delay }}
    />
  );
}
