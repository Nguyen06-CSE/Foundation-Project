from typing import Optional

LEGACY_MAP = {"sysadmin": "system_admin", "schooladmin": "school_admin"}
LEGACY_ADMIN = set(LEGACY_MAP.keys())
GLOBAL_ADMIN = {"system_admin", "school_admin"} | LEGACY_ADMIN


def norm_role(role: Optional[str]) -> str:
    r = (role or "").lower().strip()
    return LEGACY_MAP.get(r, r)


def is_admin(role: Optional[str]) -> bool:
    r = norm_role(role)
    return r.endswith("_admin") or r in LEGACY_ADMIN


def is_global_admin(role: Optional[str]) -> bool:
    return norm_role(role) in GLOBAL_ADMIN
