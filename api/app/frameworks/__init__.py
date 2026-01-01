"""
BeBrahma v0.3 - Frameworks

Recommendation frameworks for different business stages.
"""

from app.frameworks.base import Framework
from app.frameworks.critical_unknown import CriticalUnknownFramework

__all__ = [
    "Framework",
    "CriticalUnknownFramework",
]
