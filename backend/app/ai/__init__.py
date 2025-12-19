"""AI interpretation layer (Phase 7).

AI agents explain existing backend-computed data. They do not generate
new analytics, predict returns, or suggest trades.

See PHASE_7_RULES.md for complete ground rules and constraints.
"""

from app.ai.analyst import AnalystAgent
from app.ai.auditor import AuditorAgent
from app.ai.coach import CoachAgent
from app.ai.planner import PlannerAgent
from app.ai.base import LLMClient, MockLLMClient

__all__ = [
    "AnalystAgent",
    "AuditorAgent",
    "CoachAgent",
    "PlannerAgent",
    "LLMClient",
    "MockLLMClient",
]

