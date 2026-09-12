import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import AuthenticationError, GroqError, RateLimitError

from app.groq_client import MODEL, is_configured
from app.interviewer import get_next_turn
from app.report import generate_report
from app.schemas import (
    InterviewAnswerRequest,
    InterviewStartRequest,
    InterviewTurnResponse,
    ReportRequest,
    ReportResponse,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)
logger = logging.getLogger("ai_interview_coach")

# Extra origins to allow beyond localhost, e.g. a deployed Vercel frontend.
# Comma-separated exact origins, set via the ALLOWED_ORIGINS env var, for example:
#   ALLOWED_ORIGINS=https://ai-interview-coach.vercel.app
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    key_status = (
        "configured"
        if is_configured()
        else "NOT CONFIGURED - set GROQ_API_KEY in backend/.env"
    )
    origins_status = ", ".join(ALLOWED_ORIGINS) if ALLOWED_ORIGINS else "none set (only localhost allowed)"
    print(
        "\n"
        + "=" * 60
        + "\n AI Interview Coach API is running\n"
        + f" Model:            {MODEL}\n"
        + f" Groq API key:     {key_status}\n"
        + f" Allowed origins:  {origins_status}\n"
        + " Docs:             http://127.0.0.1:8000/docs\n"
        + "=" * 60,
        flush=True,
    )
    if not is_configured():
        logger.warning(
            "GROQ_API_KEY is not configured - interview requests will fail "
            "until a real key is set in backend/.env"
        )
    yield


app = FastAPI(title="AI Interview Coach API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Deployed frontend origin(s), configured via ALLOWED_ORIGINS.
    allow_origins=ALLOWED_ORIGINS,
    # Any localhost/127.0.0.1 port, so the Next.js dev server is always allowed
    # regardless of which port it happens to start on.
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Flatten Pydantic's error list into one readable message."""
    messages = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err["loc"] if p != "body")
        messages.append(f"{loc}: {err['msg']}" if loc else err["msg"])
    return JSONResponse(
        status_code=422,
        content={"detail": "; ".join(messages) or "Invalid request."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Last-resort safety net: log the real error, never leak it to the client."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again."},
    )


def _run_ai(fn, *args):
    try:
        return fn(*args)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=502,
            detail="The Groq API key was rejected. Check GROQ_API_KEY in backend/.env.",
        ) from exc
    except RateLimitError as exc:
        raise HTTPException(
            status_code=502,
            detail="The AI provider is rate-limiting requests right now. Please wait a moment and try again.",
        ) from exc
    except GroqError as exc:
        raise HTTPException(
            status_code=502, detail="Failed to reach the AI provider. Please try again."
        ) from exc


@app.get("/health")
def health():
    return {"status": "ok", "groq_key_configured": is_configured()}


@app.post("/interview/start", response_model=InterviewTurnResponse)
def interview_start(payload: InterviewStartRequest):
    """Begin an interview: given a topic and difficulty, return the first question."""
    return _run_ai(get_next_turn, payload.topic, payload.difficulty, [])


@app.post("/interview/answer", response_model=InterviewTurnResponse)
def interview_answer(payload: InterviewAnswerRequest):
    """Submit the candidate's latest answer (as the tail of `history`) and get the interviewer's next message."""
    if not payload.history:
        raise HTTPException(
            status_code=400,
            detail="history must include at least the first interviewer question",
        )
    return _run_ai(get_next_turn, payload.topic, payload.difficulty, payload.history)


@app.post("/interview/report", response_model=ReportResponse)
def interview_report(payload: ReportRequest):
    """Generate the final scored report from the full conversation."""
    if not payload.history:
        raise HTTPException(
            status_code=400, detail="Cannot generate a report for an empty interview"
        )
    return _run_ai(generate_report, payload.topic, payload.difficulty, payload.history)
