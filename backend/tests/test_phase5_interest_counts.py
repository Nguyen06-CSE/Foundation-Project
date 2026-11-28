from app.routers.stats import _tag_topic_rows, _topic_rows


def test_topic_counts_repeat_reads_and_search_subset_once_per_document():
    rows = [
        {"workspace_id": None, "views": 3, "search_views": 2},
        {"workspace_id": None, "views": 0, "search_views": 0},
        {"workspace_id": 8, "views": 1, "search_views": 0},
    ]
    assert _topic_rows([("Cơ sở dữ liệu", rows)]) == [{
        "name": "Cơ sở dữ liệu", "personal_documents": 2,
        "read_views": 4, "read_documents": 2, "opened_from_search": 1,
    }]


def test_tag_topics_separate_scopes_and_deduplicate_same_name_per_document():
    rows = [
        {"id": 1, "workspace_id": None, "name": "AI", "views": 2, "search_views": 1},
        {"id": 2, "workspace_id": 8, "name": "AI", "views": 3, "search_views": 0},
        {"id": 2, "workspace_id": 8, "name": "ai", "views": 3, "search_views": 0},
    ]
    topics = _tag_topic_rows(rows)
    assert topics == [
        {"name": "AI", "personal_documents": 1, "read_views": 2, "read_documents": 1,
         "opened_from_search": 1, "scope": "personal", "workspace_id": None},
        {"name": "AI", "personal_documents": 0, "read_views": 3, "read_documents": 1,
         "opened_from_search": 0, "scope": "group", "workspace_id": 8},
    ]


def test_stats_days_query_accepts_7_and_30_and_rejects_other_values(client):
    for days in (7, 30):
        response = client.get(f"/stats/me?scope=me&days={days}")
        assert response.status_code == 200
        assert response.json()["interests"]["days"] == days
    assert client.get("/stats/me?scope=me&days=14").status_code == 422
    assert client.get("/stats/me?scope=me&days=x").status_code == 422
