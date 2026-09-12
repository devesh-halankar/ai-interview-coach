import json
from typing import List

from app.groq_client import MODEL, get_client
from app.schemas import Difficulty, Message, ReportResponse, Role

REPORT_SYSTEM_TEMPLATE = """You are grading a completed technical interview on the topic: "{topic}" at {difficulty} difficulty.
You will be given the full transcript, with each line prefixed by who said it.

Score the candidate from 0 to 100 based on the correctness, depth, and clarity of their answers relative to the difficulty level.
Use these bands only to calibrate your own scoring, do not restate them in your output: 85+ excellent, 70-84 good, 55-69 adequate, below 55 weak.

"strengths" and "weaknesses" must be based ONLY on things the candidate actually said in the transcript — reference their specific answers, don't invent claims they never made.
"topics_to_revise" should be concise subtopic names within "{topic}" that the candidate should study further, based on gaps shown in the transcript.
"verdict" should be a 2-4 sentence overall narrative assessment of the candidate's performance.

Respond with ONLY a single JSON object, no other text before or after it, matching exactly this shape:
{{
  "score": <integer 0-100>,
  "strengths": ["<specific thing the candidate did well, referencing what they said>", "..."],
  "weaknesses": ["<specific thing the candidate got wrong or missed, referencing what they said>", "..."],
  "topics_to_revise": ["<concise subtopic name>", "..."],
  "verdict": "<2-4 sentence overall narrative assessment>"
}}
"""


def _role_label(role: Role) -> str:
    return "Interviewer" if role == "interviewer" else "Candidate"


def _rating_for_score(score: int) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 55:
        return "Adequate"
    return "Weak"


def _result_for_score(score: int) -> str:
    return "Pass" if score >= 55 else "Fail"


def generate_report(
    topic: str, difficulty: Difficulty, history: List[Message]
) -> ReportResponse:
    client = get_client()

    transcript = "\n".join(f"{_role_label(m.role)}: {m.content}" for m in history)
    system_prompt = REPORT_SYSTEM_TEMPLATE.format(topic=topic, difficulty=difficulty)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Transcript:\n{transcript}"},
    ]

    completion = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    raw = completion.choices[0].message.content

    try:
        data = json.loads(raw)
        score = max(0, min(100, int(data["score"])))
        strengths = [str(s) for s in data.get("strengths", [])]
        weaknesses = [str(s) for s in data.get("weaknesses", [])]
        topics_to_revise = [str(s) for s in data.get("topics_to_revise", [])]
        verdict = str(data["verdict"])
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise ValueError("Groq returned an unexpected report format") from exc

    return ReportResponse(
        score=score,
        rating=_rating_for_score(score),
        strengths=strengths,
        weaknesses=weaknesses,
        topics_to_revise=topics_to_revise,
        verdict=verdict,
        result=_result_for_score(score),
    )
