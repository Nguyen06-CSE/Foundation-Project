def test_categories_and_tags_routes(client):
    assert client.get("/categories/").status_code == 200
    assert client.get("/tags/").status_code == 200
