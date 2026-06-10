"""Pipeline signal exceptions for non-error flow control."""


class EarlyExitSignal(Exception):
    """Raised to terminate the pipeline early without error.

    E.g., when data is already up to date and no further processing is needed.
    Caught by PipelineOrchestrator; all subsequent steps (including NotifyStep) are skipped.
    """
