export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Message {
  role: "interviewer" | "candidate";
  content: string;
}

export interface InterviewTurn {
  message: string;
  ended: boolean;
}

export type Rating = "Excellent" | "Good" | "Adequate" | "Weak";
export type Result = "Pass" | "Fail";

export interface Report {
  score: number;
  rating: Rating;
  strengths: string[];
  weaknesses: string[];
  topics_to_revise: string[];
  verdict: string;
  result: Result;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {}

export async function startInterview(
  topic: string,
  difficulty: Difficulty
): Promise<InterviewTurn> {
  const res = await postJson("/interview/start", { topic, difficulty });
  return res.json();
}

export async function submitAnswer(
  topic: string,
  difficulty: Difficulty,
  history: Message[]
): Promise<InterviewTurn> {
  const res = await postJson("/interview/answer", { topic, difficulty, history });
  return res.json();
}

export async function generateReport(
  topic: string,
  difficulty: Difficulty,
  history: Message[]
): Promise<Report> {
  const res = await postJson("/interview/report", { topic, difficulty, history });
  return res.json();
}

const REQUEST_TIMEOUT_MS = 60_000;

async function postJson(path: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("The request took too long. Please try again.");
    }
    throw new ApiError(
      "Couldn't reach the server. Make sure the backend is running and try again."
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new ApiError(
      (await extractErrorDetail(res)) ??
        "Something went wrong on the server. Please try again."
    );
  }

  return res;
}

async function extractErrorDetail(res: Response): Promise<string | null> {
  try {
    const data = await res.json();
    return typeof data?.detail === "string" ? data.detail : null;
  } catch {
    return null;
  }
}
