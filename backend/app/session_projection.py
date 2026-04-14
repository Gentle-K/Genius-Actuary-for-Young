from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.adapters.llm_analysis import (
    _build_rwa_calculation_tasks,
    _is_rwa_session,
    _merged_rwa_context,
)
from app.config import Settings
from app.domain.models import AnalysisReport, AnalysisSession, CalculationTask
from app.i18n import normalize_locale
from app.rwa.catalog import build_asset_library, build_chain_config
from app.rwa.engine import build_rwa_report

_MOJIBAKE_MARKERS = (
    "鍩",
    "鏀",
    "缁",
    "閲",
    "鍙",
    "鏈€",
    "绛",
    "棰",
    "鍚",
    "璧勪骇",
    "绫诲瀷",
)


def _contains_mojibake(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return any(marker in value for marker in _MOJIBAKE_MARKERS)
    if isinstance(value, BaseModel):
        return _contains_mojibake(value.model_dump(mode="json"))
    if isinstance(value, dict):
        return any(_contains_mojibake(item) for item in value.values())
    if isinstance(value, (list, tuple, set)):
        return any(_contains_mojibake(item) for item in value)
    return False


def _is_numeric_text(value: str) -> bool:
    normalized = value.strip().replace(",", "")
    if not normalized:
        return False
    allowed = set("0123456789.-+%/ :")
    return all(char in allowed for char in normalized)


def _project_calculation_tasks(
    session: AnalysisSession,
    original_tasks: list[CalculationTask],
) -> list[CalculationTask]:
    localized_tasks = _build_rwa_calculation_tasks(session)
    if not localized_tasks:
        return [task.model_copy(deep=True) for task in original_tasks]

    projected: list[CalculationTask] = []
    for index, task in enumerate(localized_tasks):
        original = original_tasks[index] if index < len(original_tasks) else None
        if original is None:
            projected.append(task)
            continue

        localized = task.model_copy(
            update={
                "task_id": original.task_id,
                "result_value": original.result_value,
                "result_payload": dict(original.result_payload),
                "error_margin": original.error_margin,
                "status": original.status,
                "validation_state": original.validation_state,
                "failure_reason": original.failure_reason,
                "user_visible": original.user_visible,
                "report_section_keys": list(original.report_section_keys),
                "execution_step_ids": list(original.execution_step_ids),
            }
        )
        localized.result_text = (
            original.result_text if _is_numeric_text(original.result_text or "") else ""
        )
        projected.append(localized)
    return projected


def _copy_runtime_report_fields(
    localized_report: AnalysisReport,
    original_report: AnalysisReport,
    session: AnalysisSession,
) -> None:
    localized_report.chart_refs = list(original_report.chart_refs)
    localized_report.reanalysis_diff = original_report.reanalysis_diff
    localized_report.transaction_receipts = list(session.transaction_receipts)
    localized_report.report_anchor_records = list(session.report_anchor_records)
    localized_report.position_snapshots = list(session.position_snapshots)

    if original_report.attestation_draft and localized_report.attestation_draft:
        localized_report.attestation_draft = localized_report.attestation_draft.model_copy(
            update={
                "transaction_hash": original_report.attestation_draft.transaction_hash,
                "transaction_url": original_report.attestation_draft.transaction_url,
                "submitted_by": original_report.attestation_draft.submitted_by,
                "submitted_at": original_report.attestation_draft.submitted_at,
                "block_number": original_report.attestation_draft.block_number,
            }
        )


def project_session_for_locale(session: AnalysisSession, locale: str | None) -> AnalysisSession:
    resolved_locale = normalize_locale(locale or session.locale)
    projected = session.model_copy(deep=True)
    projected.locale = resolved_locale

    if not _is_rwa_session(session):
        return projected

    needs_report_projection = bool(
        session.report
        and (
            normalize_locale(session.report.locale or session.locale) != resolved_locale
            or resolved_locale == "zh-HK"
            or _contains_mojibake(session.report)
            or not session.report.title
        )
    )
    needs_task_projection = bool(
        session.calculation_tasks
        and (
            normalize_locale(session.locale) != resolved_locale
            or resolved_locale == "zh-HK"
            or _contains_mojibake(session.calculation_tasks)
        )
    )

    if not needs_report_projection and not needs_task_projection:
        return projected

    localized_session = session.model_copy(deep=True)
    localized_session.locale = resolved_locale

    if needs_report_projection and session.report is not None:
        settings = Settings.from_env()
        chain_config = build_chain_config(settings)
        asset_library = build_asset_library(chain_config, locale=resolved_locale)
        localized_report, localized_evidence = build_rwa_report(
            mode=session.mode,
            problem_statement=session.problem_statement,
            context=_merged_rwa_context(localized_session),
            chain_config=chain_config,
            asset_library=asset_library,
            locale=resolved_locale,
        )
        _copy_runtime_report_fields(localized_report, session.report, session)
        projected.report = localized_report
        projected.evidence_items = localized_evidence

    if needs_task_projection:
        projected.calculation_tasks = _project_calculation_tasks(
            localized_session,
            session.calculation_tasks,
        )

    return projected
