from typing import Annotated, List, Literal

from pydantic import BaseModel, Field, StringConstraints

Difficulty = Literal["Easy", "Medium", "Hard"]
Role = Literal["interviewer", "candidate"]
Rating = Literal["Excellent", "Good", "Adequate", "Weak"]
Result = Literal["Pass", "Fail"]

# Trimmed, non-blank, length-bounded strings — protects against empty/whitespace-only
# input and against pathologically large payloads being forwarded to the AI provider.
Topic = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
MessageContent = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)
]


class Message(BaseModel):
    role: Role
    content: MessageContent


class InterviewStartRequest(BaseModel):
    topic: Topic
    difficulty: Difficulty


class InterviewAnswerRequest(BaseModel):
    topic: Topic
    difficulty: Difficulty
    history: List[Message] = Field(max_length=100)


class InterviewTurnResponse(BaseModel):
    message: str
    ended: bool


class ReportRequest(BaseModel):
    topic: Topic
    difficulty: Difficulty
    history: List[Message] = Field(max_length=100)


class ReportResponse(BaseModel):
    score: int
    rating: Rating
    strengths: List[str]
    weaknesses: List[str]
    topics_to_revise: List[str]
    verdict: str
    result: Result
