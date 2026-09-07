"""Shared coverage threshold resolution for legacy and registry pools.

The public contract is deliberately small: every population pool has ordered
``minimum <= healthy <= target`` thresholds and one machine-readable status.
Older configuration shapes are normalized here so callers do not need their
own compatibility policy.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
import math
from typing import Any, Mapping


GOAL_POLICIES = ("minimum", "healthy", "target")
QUEUE_GOALS = {name: f"bring-to-{name}" for name in GOAL_POLICIES}


@dataclass(frozen=True)
class CoverageThresholds:
    minimum: int
    healthy: int
    target: int
    saturated: int | None = None

    def __post_init__(self) -> None:
        values = (self.minimum, self.healthy, self.target)
        if any(isinstance(value, bool) or not isinstance(value, int) for value in values):
            raise ValueError("coverage thresholds must be integers")
        if self.minimum < 1 or self.healthy < self.minimum or self.target < self.healthy:
            raise ValueError("coverage thresholds require target >= healthy >= minimum >= 1")
        if self.saturated is not None and (
            isinstance(self.saturated, bool)
            or not isinstance(self.saturated, int)
            or self.saturated < self.target
        ):
            raise ValueError("saturated must be an integer at or above target")

    def threshold_for(self, goal: str) -> int:
        normalized = normalize_goal(goal)
        return int(getattr(self, normalized))

    def describe(self, count: int) -> dict[str, Any]:
        result = {
            "current": count,
            "count": count,
            **asdict(self),
            "status": coverage_status(count, self),
            "needed_to_minimum": max(0, self.minimum - count),
            "needed_to_healthy": max(0, self.healthy - count),
            "needed_to_target": max(0, self.target - count),
        }
        if self.saturated is None:
            result.pop("saturated")
        else:
            result["needed_to_saturated"] = max(0, self.saturated - count)
        return result


def normalize_goal(goal: str | None, default: str = "minimum") -> str:
    value = (goal or default).strip().casefold().replace("_", "-")
    if value.startswith("bring-to-"):
        value = value[len("bring-to-"):]
    if value not in GOAL_POLICIES:
        raise ValueError(f"coverage goal must be one of: {', '.join(GOAL_POLICIES)}")
    return value


def coverage_status(count: int, thresholds: CoverageThresholds) -> str:
    if count < thresholds.minimum:
        return "deficient"
    if count < thresholds.healthy:
        return "minimum"
    if count < thresholds.target:
        return "healthy"
    if thresholds.saturated is not None and count >= thresholds.saturated:
        return "saturated"
    return "target_met"


def _positive_int(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{label} must be a positive integer")
    return value


def resolve_thresholds(
    definition: Mapping[str, Any] | None = None,
    *,
    defaults: Mapping[str, Any] | None = None,
) -> CoverageThresholds:
    """Merge a threshold definition over defaults and validate ordering."""
    merged = {**(defaults or {}), **(definition or {})}
    minimum = _positive_int(merged.get("minimum", 10), "minimum")
    healthy = _positive_int(merged.get("healthy", max(minimum, minimum * 2)), "healthy")
    target = _positive_int(merged.get("target", max(healthy, healthy * 2)), "target")
    saturated = merged.get("saturated")
    if saturated is not None:
        saturated = _positive_int(saturated, "saturated")
    return CoverageThresholds(minimum, healthy, target, saturated)


def legacy_thresholds(config: Mapping[str, Any], branch: str, category: str) -> CoverageThresholds:
    """Resolve legacy category/subcategory thresholds with old-config defaults."""
    defaults = config.get("defaults", {})
    definition = config.get("targets", {}).get(branch, config.get("targets", {}).get(category, {}))
    return resolve_thresholds(definition, defaults=defaults)


def deep_thresholds(pool: Mapping[str, Any], override: Mapping[str, Any] | None = None) -> CoverageThresholds:
    """Resolve a registry leaf, migrating its historic single target in memory.

    A v0.2.6 registry ``target`` remains the long-term target. Minimum and
    healthy are inferred at 50% and 80%. Historic deep overrides containing
    only minimum/healthy treated ``healthy`` as their completion target, so
    that value is retained as the new target while readiness levels are
    inferred beneath it.
    """
    override = dict(override or {})
    old_target = _positive_int(pool.get("target", 20), "target")
    if "target" in override:
        old_target = _positive_int(override["target"], "target")
    if override and "target" not in override:
        old_target = _positive_int(override.get("healthy", override.get("minimum", old_target)), "target")
        explicit = {key: value for key, value in override.items() if key == "saturated"}
    else:
        explicit = override
    inferred = {
        "minimum": max(1, math.ceil(old_target * 0.5)),
        "healthy": max(1, math.ceil(old_target * 0.8)),
        "target": old_target,
    }
    if not (override and "target" not in override):
        for key in ("minimum", "healthy", "target", "saturated"):
            if key in pool:
                inferred[key] = pool[key]
    elif "saturated" in pool:
        inferred["saturated"] = pool["saturated"]
    return resolve_thresholds(explicit, defaults=inferred)
