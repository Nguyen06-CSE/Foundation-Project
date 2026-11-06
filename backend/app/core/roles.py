from typing import Optional

LEGACY_MAP = {"sysadmin": "system_admin", "schooladmin": "school_admin"}
LEGACY_ADMIN = set(LEGACY_MAP.keys())
GLOBAL_ADMIN = {"system_admin", "school_admin"} | LEGACY_ADMIN

ROLE_RANK = {
    "student": 1,
    "teacher": 2,
    "faculty_admin": 3,
    "school_admin": 4,
    "system_admin": 4,
}


def norm_role(role: Optional[str]) -> str:
    r = (role or "").lower().strip()
    return LEGACY_MAP.get(r, r)


def is_admin(role: Optional[str]) -> bool:
    r = norm_role(role)
    return r.endswith("_admin") or r in LEGACY_ADMIN


def is_global_admin(role: Optional[str]) -> bool:
    return norm_role(role) in GLOBAL_ADMIN


def role_rank(role: Optional[str]) -> int:
    return ROLE_RANK.get(norm_role(role), 0)


def is_auto_accept(sender_role: Optional[str], recipient_role: Optional[str]) -> bool:
    return role_rank(sender_role) > role_rank(recipient_role)
