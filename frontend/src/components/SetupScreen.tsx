"use client";

import { FormEvent, useState } from "react";
import { ApiError, Difficulty, startInterview } from "@/lib/api";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

export interface StartedInterview {
  topic: string;
  difficulty: Difficulty;
  firstMessage: string;
}

interface SetupScreenProps {
  onStart: (session: StartedInterview) => void;
}

export default function SetupScreen({ onStart }: SetupScreenProps) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [difficultyError, setDifficultyError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedTopic = topic.trim();
    const missingTopic = trimmedTopic.length === 0;
    const missingDifficulty = difficulty === null;

    setTopicError(missingTopic ? "Enter a topic to continue." : null);
    setDifficultyError(missingDifficulty ? "Choose a difficulty." : null);
    setServerError(null);

    if (missingTopic || missingDifficulty) return;

    setLoading(true);
    try {
      const turn = await startInterview(trimmedTopic, difficulty);
      onStart({ topic: trimmedTopic, difficulty, firstMessage: turn.message });
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-50">
            AI Interview Coach
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            Practice technical interviews with an AI interviewer that adapts
            to your answers, one question at a time.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-10 flex flex-col gap-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-7 shadow-2xl shadow-black/40"
        >
          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-neutral-300"
            >
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder="e.g. React Hooks, SQL Joins, System Design"
              aria-invalid={topicError ? "true" : "false"}
              className={`mt-1.5 w-full rounded-lg border bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:ring-1 disabled:opacity-60 ${
                topicError
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                  : "border-neutral-700 focus:border-emerald-500 focus:ring-emerald-500"
              }`}
            />
            {topicError && (
              <p className="mt-1.5 text-xs text-rose-400">{topicError}</p>
            )}
          </div>

          <div>
            <span className="block text-sm font-medium text-neutral-300">
              Difficulty
            </span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((level) => {
                const selected = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setDifficulty(level);
                      setDifficultyError(null);
                    }}
                    aria-pressed={selected}
                    className={`rounded-lg border py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:opacity-60 ${
                      selected
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800/50"
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            {difficultyError && (
              <p className="mt-1.5 text-xs text-rose-400">{difficultyError}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-neutral-950 outline-none transition-colors hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-950/30 border-t-neutral-950"
              />
            )}
            {loading ? "Starting interview…" : "Start Interview"}
          </button>
        </form>
      </div>
    </div>
  );
}
