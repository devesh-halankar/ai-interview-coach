"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  Difficulty,
  generateReport,
  Message,
  Rating,
  Report,
  Result,
} from "@/lib/api";

interface ReportScreenProps {
  topic: string;
  difficulty: Difficulty;
  history: Message[];
  onRestart: () => void;
}

export default function ReportScreen({
  topic,
  difficulty,
  history,
  onRestart,
}: ReportScreenProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    generateReport(topic, difficulty, history)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Something went wrong. Please try again."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topic, difficulty, history, attempt]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-3">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-emerald-400" />
          <p className="text-sm text-neutral-400">Scoring your interview…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-rose-900 bg-rose-950/40 px-6 py-8 text-center">
          <p className="text-sm text-rose-300">
            {error ?? "Couldn't generate the report."}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="rounded-lg border border-rose-700 px-4 py-2 text-sm font-medium text-rose-200 outline-none transition-colors hover:bg-rose-900/40 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center overflow-y-auto px-4 py-12 sm:py-16">
      <div className="w-full max-w-2xl">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-400">
            Interview Complete
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-50">
            {topic}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {difficulty} difficulty
          </p>
        </header>

        <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
          <span className={`text-6xl font-bold ${scoreColor(report.rating)}`}>
            {report.score}
          </span>
          <span className="text-sm text-neutral-400">{report.rating}</span>
          <span
            className={`mt-3 rounded-full border px-5 py-1.5 text-sm font-bold tracking-wide ${resultBadge(
              report.result
            )}`}
          >
            {report.result === "Pass" ? "PASS" : "FAIL"}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <Section
            title="Strengths"
            items={report.strengths}
            emptyText="No particular strengths noted."
          />
          <Section
            title="Areas for Improvement"
            items={report.weaknesses}
            emptyText="No major gaps noted."
          />
          <Section
            title="Topics to Revise"
            items={report.topics_to_revise}
            emptyText="Nothing specific to revise."
          />
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
            <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Interviewer&apos;s Verdict
            </h2>
            <p className="mt-2 break-words text-sm leading-relaxed text-neutral-200">
              {report.verdict}
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-neutral-950 outline-none transition-colors hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
          >
            Start New Interview
          </button>
        </div>
      </div>
    </div>
  );
}

function scoreColor(rating: Rating): string {
  if (rating === "Excellent" || rating === "Good") return "text-emerald-400";
  if (rating === "Adequate") return "text-amber-400";
  return "text-rose-400";
}

function resultBadge(result: Result): string {
  return result === "Pass"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
    : "border-rose-500/30 bg-rose-500/10 text-rose-400";
}

function Section({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {items.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-neutral-200">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-neutral-600">•</span>
              <span className="break-words">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-neutral-500">{emptyText}</p>
      )}
    </div>
  );
}
