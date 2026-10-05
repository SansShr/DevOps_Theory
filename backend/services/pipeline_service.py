"""
CAMATIS Pipeline Service — with TRUE lazy loading.

The heavy CAMATIS import (torch, lightgbm, catboost, dowhy, …) is deferred
until the first call to run_inference().  FastAPI therefore boots instantly:

  FastAPI starts
  → /api/health  immediately available
  → /metrics     immediately available
  → CAMATIS ML pipeline NOT initialised yet
  → first POST /api/optimize
  → CAMATIS imported + CAMATISDecisionPipeline() constructed (10–60 s)
  → subsequent calls reuse the singleton
"""

import logging
import os
import sys
import threading
import time
import traceback
from typing import Any, Dict, Optional

logger = logging.getLogger("camatis.pipeline_service")

# Add project root to sys.path so camatis.* is importable when the time comes
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
logger.info("PipelineService: project root on path → %s", PROJECT_ROOT)


class PipelineService:
    """Service that wraps the CAMATIS decision pipeline with true lazy loading."""

    def __init__(self):
        self._pipeline = None
        self._lock = threading.Lock()          # protects _pipeline initialisation
        self._last_run_timestamp: Optional[Any] = None
        logger.info(
            "PipelineService created — CAMATIS ML pipeline will be imported on first /api/optimize request"
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _import_and_init(self) -> None:
        """
        Perform the expensive import + construction.
        Must be called while self._lock is held.
        """
        logger.info("Lazy pipeline initialisation STARTED — importing CAMATIS ML stack …")
        t0 = time.perf_counter()

        try:
            # This single import triggers torch, lightgbm, catboost, dowhy, etc.
            from camatis.run_agents_pipeline import CAMATISDecisionPipeline  # noqa: PLC0415

            logger.info("CAMATIS module imported — constructing CAMATISDecisionPipeline …")
            self._pipeline = CAMATISDecisionPipeline()

            elapsed = time.perf_counter() - t0
            logger.info(
                "Lazy pipeline initialisation COMPLETED in %.2f seconds", elapsed
            )
        except Exception:
            elapsed = time.perf_counter() - t0
            logger.error(
                "Lazy pipeline initialisation FAILED after %.2f seconds:\n%s",
                elapsed,
                traceback.format_exc(),
            )
            raise

    def _ensure_pipeline(self) -> None:
        """Thread-safe lazy initialisation guard."""
        if self._pipeline is None:
            with self._lock:
                # Double-checked locking: another thread may have initialised
                # while we were waiting for the lock.
                if self._pipeline is None:
                    self._import_and_init()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run_inference(self) -> Dict[str, Any]:
        """Run the CAMATIS decision pipeline (initialises it on first call)."""
        logger.info("run_inference called — ensuring pipeline is ready …")
        self._ensure_pipeline()

        try:
            logger.info("Running CAMATIS pipeline …")
            decisions = self._pipeline.run()
            count = len(decisions) if decisions else 0
            logger.info("Pipeline run complete — %d decisions produced", count)
            self._last_run_timestamp = decisions
            return {
                "success": True,
                "message": "Pipeline executed successfully",
                "timestamp": self._last_run_timestamp,
            }
        except Exception:
            logger.error("Pipeline run failed:\n%s", traceback.format_exc())
            raise

    @property
    def is_initialised(self) -> bool:
        return self._pipeline is not None


# Singleton — created at import time but DOES NOT touch CAMATIS yet
pipeline_service = PipelineService()
