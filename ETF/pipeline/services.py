"""Pipeline Services

Service instances shared across pipeline steps.
Separated from PipelineContext to keep context as a pure data container.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class PipelineServices:
    """Service instances for pipeline steps.

    Initialized by PipelineOrchestrator and passed to each step's run().
    """

    storage: Any
    notifier: Any
    finlab_srv: Any
    sql_storage: Any
