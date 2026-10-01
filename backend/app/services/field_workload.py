"""Distance-aware daily field workload limits."""

MAX_DAILY_ASSIGNMENTS = 12


def daily_assignment_limit_for_distance(distance_km: float) -> int:
    """Give crews more stops on compact routes and fewer when travel is longer."""
    if distance_km <= 2:
        return 12
    if distance_km <= 5:
        return 9
    if distance_km <= 10:
        return 6
    return 3
