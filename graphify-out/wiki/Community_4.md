# Community 4

> 68 nodes · cohesion 0.06

## Key Concepts

- **routers/auth.py** (24 connections) — `backend/app/routers/auth.py`
- **users.py** (21 connections) — `backend/app/routers/users.py`
- **seed_inc_user.py** (21 connections) — `backend/db/seed_inc_user.py`
- **security.py** (19 connections) — `backend/app/core/security.py`
- **hash_password()** (15 connections) — `backend/app/core/security.py`
- **schemas/auth.py** (10 connections) — `backend/app/schemas/auth.py`
- **login()** (9 connections) — `backend/app/routers/auth.py`
- **schemas/user.py** (9 connections) — `backend/app/schemas/user.py`
- **fix_passwords.py** (9 connections) — `backend/db/fix_passwords.py`
- **decode_access_token()** (8 connections) — `backend/app/core/security.py`
- **get_optional_user()** (7 connections) — `backend/app/core/dependencies.py`
- **register()** (7 connections) — `backend/app/routers/auth.py`
- **update_password()** (7 connections) — `backend/app/routers/users.py`
- **seed_users()** (7 connections) — `backend/db/seed_inc_user.py`
- **create_access_token()** (6 connections) — `backend/app/core/security.py`
- **update_me()** (6 connections) — `backend/app/routers/users.py`
- **seed_academics()** (6 connections) — `backend/db/seed_inc_user.py`
- **verify_password()** (5 connections) — `backend/app/core/security.py`
- **get_login_payload()** (5 connections) — `backend/app/schemas/auth.py`
- **BaseModel** (5 connections)
- **UserLogin** (5 connections) — `backend/app/schemas/auth.py`
- **AsyncSession** (5 connections)
- **user_exists()** (5 connections) — `backend/db/seed_inc_user.py`
- **search_users()** (4 connections) — `backend/app/routers/users.py`
- **Token** (4 connections) — `backend/app/schemas/auth.py`
- *... and 43 more nodes in this community*

## Relationships

- [Community 12](Community_12.md) (23 shared connections)
- [Community 5](Community_5.md) (18 shared connections)
- [Community 3](Community_3.md) (15 shared connections)
- [Community 9](Community_9.md) (4 shared connections)
- [Community 1](Community_1.md) (3 shared connections)
- [Community 16](Community_16.md) (3 shared connections)
- [Community 29](Community_29.md) (3 shared connections)
- [Community 35](Community_35.md) (3 shared connections)
- [Community 13](Community_13.md) (2 shared connections)

## Source Files

- `backend/app/core/dependencies.py`
- `backend/app/core/security.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/users.py`
- `backend/app/schemas/auth.py`
- `backend/app/schemas/user.py`
- `backend/db/fix_passwords.py`
- `backend/db/seed_inc_user.py`
- `backend/tests/test_auth.py`

## Audit Trail

- EXTRACTED: 180 (90%)
- INFERRED: 20 (10%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*