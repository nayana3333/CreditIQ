SAMPLE_APPLICATION = {
    "checking_status": "A11",
    "duration": 24,
    "credit_history": "A34",
    "purpose": "A40",
    "credit_amount": 3000,
    "savings_status": "A65",
    "employment": "A73",
    "installment_rate": 2,
    "personal_status": "A93",
    "other_parties": "A101",
    "residence_since": 2,
    "property_magnitude": "A121",
    "age": 35,
    "other_payment_plans": "A143",
    "housing": "A152",
    "existing_credits": 1,
    "job": "A173",
    "num_dependents": 1,
    "own_telephone": "A192",
    "foreign_worker": "A201",
}


def test_predict_returns_valid_structure(client):
    res = client.post("/api/v1/ml/predict", json=SAMPLE_APPLICATION)
    assert res.status_code == 200
    data = res.get_json()
    assert "lr" in data
    assert "rf" in data
    assert "final_decision" in data
    assert data["lr"]["decision"] in ("approved", "rejected")
    assert data["rf"]["decision"] in ("approved", "rejected")
    assert 0 <= data["lr"]["confidence"] <= 1
    assert 0 <= data["rf"]["confidence"] <= 1


def test_predict_includes_shap_reasons(client):
    res = client.post("/api/v1/ml/predict", json=SAMPLE_APPLICATION)
    data = res.get_json()
    assert "shap_reasons" in data["lr"]
    assert "shap_reasons" in data["rf"]
    assert len(data["lr"]["shap_reasons"]) > 0
    assert len(data["rf"]["shap_reasons"]) > 0
    first_reason = data["rf"]["shap_reasons"][0]
    assert "feature" in first_reason
    assert "impact" in first_reason
    assert "direction" in first_reason
    assert first_reason["direction"] in ("positive", "negative")


def test_predict_missing_fields_does_not_crash(client):
    res = client.post("/api/v1/ml/predict", json={"credit_amount": 1000})
    assert res.status_code in (200, 400)
    assert res.status_code != 500


def test_predict_empty_body_does_not_crash(client):
    res = client.post("/api/v1/ml/predict", json={})
    assert res.status_code != 500


def test_metrics_endpoint_returns_model_scores(client):
    res = client.get("/api/v1/ml/metrics")
    assert res.status_code == 200
    data = res.get_json()
    assert "lr" in data
    assert "rf" in data
    assert "accuracy" in data["lr"]
    assert "accuracy" in data["rf"]
    assert 0 <= data["lr"]["accuracy"] <= 1
    assert 0 <= data["rf"]["accuracy"] <= 1
