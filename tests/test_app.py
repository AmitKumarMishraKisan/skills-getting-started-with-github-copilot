from fastapi.testclient import TestClient
from src.app import app


client = TestClient(app)


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    # basic sanity checks for preseeded activities
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "testuser+pytest@example.com"

    # Ensure the email is not present to start (if previous runs left state)
    res_before = client.get("/activities")
    assert res_before.status_code == 200
    participants_before = res_before.json()[activity]["participants"]
    if email in participants_before:
        # If already present, try to remove it so test can proceed predictably
        client.delete(f"/activities/{activity}/participants", params={"email": email})

    # Signup should succeed
    # Use params to ensure proper encoding of special characters like '+'
    res_signup = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res_signup.status_code == 200
    assert "Signed up" in res_signup.json().get("message", "")

    # Now participant should appear in activity
    res_after = client.get("/activities")
    assert res_after.status_code == 200
    participants = res_after.json()[activity]["participants"]
    assert email in participants

    # Duplicate signup should return 400
    res_dup = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert res_dup.status_code == 400

    # Unregister should succeed
    res_unreg = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert res_unreg.status_code == 200
    assert "Unregistered" in res_unreg.json().get("message", "")

    # And participant should be gone
    res_final = client.get("/activities")
    assert res_final.status_code == 200
    participants_final = res_final.json()[activity]["participants"]
    assert email not in participants_final
