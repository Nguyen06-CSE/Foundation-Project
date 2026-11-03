from typing import Optional

LEGACY_ADMIN = {"sysadmin", "schooladmin"}
GLOBAL_ADMIN = {"system_admin", "school_admin"} | LEGACY_ADMIN


def norm_role(role: Optional[str]) -> str:
    return (role or "").lower().strip()


def is_admin(role: Optional[str]) -> bool:
    r = norm_role(role)
    return r.endswith("_admin") or r in LEGACY_ADMIN


def is_global_admin(role: Optional[str]) -> bool:
    return norm_role(role) in GLOBAL_ADMIN
