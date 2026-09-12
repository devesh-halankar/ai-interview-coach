import os
from typing import Optional

from groq import Groq

MODEL = "llama-3.3-70b-versatile"

_PLACEHOLDER_KEY = "your_groq_api_key_here"

_client: Optional[Groq] = None


def _read_api_key() -> Optional[str]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == _PLACEHOLDER_KEY:
        return None
    return api_key


def is_configured() -> bool:
    """Whether a real (non-placeholder) GROQ_API_KEY is set."""
    return _read_api_key() is not None


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = _read_api_key()
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not configured. Set it in backend/.env"
            )
        _client = Groq(api_key=api_key)
    return _client
