def test_register_and_login(client, monkeypatch):
    async def fake_execute_register(query, params=None):
        class Result:
            def scalar_one_or_none(self_inner):
                return None

        return Result()

    monkeypatch.setattr(client.app.state.fake_session, "execute", fake_execute_register)
    response = client.post("/auth/register", json={
        "username": "student01",
        "email": "student01@example.com",
        "password": "password123",
        "full_name": "Student One",
        "role": "sysadmin",
    })
    assert response.status_code == 201
    created_user = next(item for item in client.app.state.fake_session.items if hasattr(item, "role"))
    assert created_user.role == "student"

    from app.core.security import hash_password

    async def fake_execute_login(query, params=None):
        class Result:
            def scalar_one_or_none(self_inner):
                from types import SimpleNamespace

                return SimpleNamespace(
                    id=1,
                    username="student01",
                    email="student01@example.com",
                    role="student",
                    password_hash=hash_password("password123"),
                )

        return Result()

    monkeypatch.setattr(client.app.state.fake_session, "execute", fake_execute_login)
    response = client.post("/auth/login", json={
        "email": "student01@example.com",
        "password": "password123",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_update_me_cannot_set_role(client):
    from app.schemas.user import UserUpdate

    assert "role" not in UserUpdate.model_fields
    response = client.patch("/users/me", json={"role": "sysadmin", "full_name": "Student Updated"})
    assert response.status_code == 200
    assert response.json()["role"] == "personal"
