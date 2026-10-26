def test_create_and_get_application(client):
    payload = {
        "application_number": "APP-TEST-999",
        "institution_name": "Test Engineering College",
        "institution_id": "INST-TEST-99",
        "academic_year": "2026-2027",
        "course_programme": "Computer Science",
        "approved_intake": 120,
        "notes": "Automated unit test application"
    }
    response = client.post("/api/applications", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["application_number"] == "APP-TEST-999"
    assert data["institution_name"] == "Test Engineering College"
    app_id = data["id"]

    # Fetch it
    get_res = client.get(f"/api/applications/{app_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == app_id

def test_list_applications_and_stats(client):
    res = client.get("/api/applications")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    stats_res = client.get("/api/applications/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_applications" in stats
    assert "audit_chain_valid" in stats
    assert stats["audit_chain_valid"] is True
