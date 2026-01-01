"""
BeBrahma v0.3 - Frameworks

Recommendation frameworks for different business stages.
"""

from app.frameworks.base import Framework
from app.frameworks.critical_unknown import CriticalUnknownFramework
from app.frameworks.problem_solution_fit import ProblemSolutionFitFramework
from app.frameworks.icp_wedge import ICPWedgeFramework

__all__ = [
    "Framework",
    "CriticalUnknownFramework",
    "ProblemSolutionFitFramework",
    "ICPWedgeFramework",
]
