import json
from typing import List

from app.groq_client import MODEL, get_client
from app.schemas import Difficulty, InterviewTurnResponse, Message, Role

DIFFICULTY_GUIDANCE = {
    "Easy": "Ask basic definitional and recall-level questions.",
    "Medium": "Ask applied, scenario-based problems that require using the concept, not just naming it.",
    "Hard": "Ask questions about trade-offs, edge cases, and system-level thinking.",
}

SYSTEM_TEMPLATE = """You are a professional technical interviewer conducting a live interview on the topic: "{topic}".
Difficulty level: {difficulty} — {difficulty_guidance}

Rules you must always follow:
- Ask exactly one question at a time. Never ask more than one question in a single message.
- If the candidate's last answer is strong: acknowledge it briefly (a short phrase, no lengthy praise), then move on to a different aspect of the topic.
- If the candidate's last answer is partly right: ask exactly one probing follow-up question about the specific gap, without revealing or hinting at the correct answer.
- If the candidate's last answer is wrong: note the gap in one short, neutral line, then move on to a different question. Do not explain or reveal the correct answer.
- Never teach, never explain concepts, never give hints toward an answer, at any point.
- Stay professional, concise, and encouraging in tone at all times.
- Judge the candidate's performance across the whole conversation so far, not just the latest answer.
- If the candidate is clearly struggling across several consecutive questions, end the interview early, kindly, and without making them feel bad about it.
- If the candidate is doing very well and the key areas of the topic for this difficulty have been covered, wrap up once you judge coverage to be sufficient — do not drag it out.
- A typical interview covers roughly 4 to 7 questions before ending, but let the candidate's demonstrated performance and topic coverage, not a fixed count, decide when to stop.
- If the conversation so far is empty, this is the very first turn: greet the candidate briefly and ask your first question.

You must respond with ONLY a single JSON object, no other text before or after it, matching exactly this shape:
{{"message": "<what you say to the candidate next>", "ended": <true or false>}}

Set "ended" to true only on the one message where you are wrapping up and ending the interview for good — that message should be your closing remark (e.g. thanking the candidate and letting them know the interview is complete). Set "ended" to false on every other turn.
"""


def _groq_role(role: Role) -> str:
    return "assistant" if role == "interviewer" else "user"


def get_next_turn(
    topic: str, difficulty: Difficulty, history: List[Message]
) -> InterviewTurnResponse:
    client = get_client()

    system_prompt = SYSTEM_TEMPLATE.format(
        topic=topic,
        difficulty=difficulty,
        difficulty_guidance=DIFFICULTY_GUIDANCE[difficulty],
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": _groq_role(m.role), "content": m.content} for m in history]
    messages.append(
        {
            "role": "system",
            "content": "Respond now with only the JSON object for your next turn, as instructed above.",
        }
    )

    completion = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.5,
    )
    raw = completion.choices[0].message.content

    try:
        data = json.loads(raw)
        message = str(data["message"])
        ended = bool(data.get("ended", False))
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise ValueError("Groq returned an unexpected interview turn format") from exc

    return InterviewTurnResponse(message=message, ended=ended)
