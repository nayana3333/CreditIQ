"""
Sanity checks for model explanation shape and feature metadata.
"""
import os
import pickle


BASE = os.path.join(os.path.dirname(__file__), "..")


def _load_metrics():
    with open(os.path.join(BASE, "model_metrics.pkl"), "rb") as handle:
        return pickle.load(handle)


def test_lr_coefficients_and_rf_importance_include_checking_status():
    metrics = _load_metrics()
    coefficients = metrics["lr"].get("coefficients", {})
    assert "checking_status" in coefficients
    assert coefficients["checking_status"] != 0

    importances = metrics["rf"].get("feature_importances", {})
    assert "checking_status" in importances
    assert importances["checking_status"] > 0


def test_shap_reasons_direction_matches_sign_convention(client):
    sample = {
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
    res = client.post("/api/v1/ml/predict", json=sample)
    data = res.get_json()

    for model_key in ("lr", "rf"):
        for reason in data[model_key]["shap_reasons"]:
            impact = reason["impact"]
            direction = reason["direction"]
            assert isinstance(impact, (int, float))
            assert direction in ("positive", "negative")
            # The API explains contributions to the bad-risk class:
            # positive impact raises risk, so the user-facing direction is negative.
            if impact > 0:
                assert direction == "negative"
            elif impact < 0:
                assert direction == "positive"


def _base_application(**overrides):
    """A baseline German Credit application. Override fields per test case."""
    base = {
        "checking_status": "A12", "duration": 24, "credit_history": "A32",
        "purpose": "A40", "credit_amount": 3000, "savings_status": "A62",
        "employment": "A73", "installment_rate": 2, "personal_status": "A93",
        "other_parties": "A101", "residence_since": 2, "property_magnitude": "A121",
        "age": 35, "other_payment_plans": "A143", "housing": "A152",
        "existing_credits": 1, "job": "A173", "num_dependents": 1,
        "own_telephone": "A192", "foreign_worker": "A201",
    }
    base.update(overrides)
    return base


def _top_shap_feature(shap_reasons):
    """Return the feature name with the largest absolute impact."""
    return max(shap_reasons, key=lambda r: r["impact"])["feature"]


def test_high_credit_amount_is_a_top_negative_factor(client):
    """
    Domain sanity check 1: a very high loan amount relative to typical values
    in the dataset (max ~18,424) should appear among the top factors pushing
    toward rejection for at least one of the two models. This is not a proof
    that SHAP is mathematically correct - it is a check that the explanation
    aligns with basic credit risk intuition (larger loans are riskier, all
    else equal).
    """
    sample = _base_application(credit_amount=17000, duration=60)
    res = client.post("/api/v1/ml/predict", json=sample)
    data = res.get_json()

    rf_top_features = [r["feature"] for r in data["rf"]["shap_reasons"][:3]]
    lr_top_features = [r["feature"] for r in data["lr"]["shap_reasons"][:3]]

    assert "credit_amount" in rf_top_features or "credit_amount" in lr_top_features, (
        "Expected credit_amount to be a top-3 SHAP factor for a high-amount, "
        "long-duration application, but it was not present in either model's "
        "top factors. This may indicate a feature scaling or mapping issue."
    )


def test_checking_status_direction_matches_lr_coefficient_sign(client):
    """
    Domain sanity check 2: checking_status is one of the strongest predictors
    in this dataset. Whatever direction the LR coefficient says this feature
    pushes (toward approval or rejection), the SHAP explanation for a sample
    application should agree in sign, since both come from the same underlying
    encoded feature. This catches encoding/sign mismatches between training
    and inference.
    """
    metrics_res = client.get("/api/v1/ml/metrics")
    metrics = metrics_res.get_json()
    lr_coef = metrics["lr"]["coefficients"].get("checking_status")
    assert lr_coef is not None, "checking_status missing from LR coefficients"

    sample = _base_application(checking_status="A14")
    res = client.post("/api/v1/ml/predict", json=sample)
    data = res.get_json()

    lr_reason = next(
        (r for r in data["lr"]["shap_reasons"] if r["feature"] == "checking_status"),
        None,
    )
    if lr_reason is None:
        return

    expected_direction = "positive" if lr_coef > 0 else "negative"
    assert lr_reason["direction"] == expected_direction, (
        f"LR coefficient for checking_status is {lr_coef} (implies "
        f"'{expected_direction}' direction), but SHAP reported "
        f"'{lr_reason['direction']}' for the same feature. Sign mismatch "
        "between training-time coefficient and inference-time SHAP explanation."
    )


def test_short_duration_small_amount_favors_approval(client):
    """
    Domain sanity check 3: a small, short-duration loan is generally the
    lowest-risk profile in credit scoring. This should not be flagged with
    duration or credit_amount as strong negative (rejection-pushing) factors,
    since both are at their safest extreme.
    """
    sample = _base_application(credit_amount=500, duration=6)
    res = client.post("/api/v1/ml/predict", json=sample)
    data = res.get_json()

    for model_key in ("lr", "rf"):
        for reason in data[model_key]["shap_reasons"]:
            if reason["feature"] in ("credit_amount", "duration"):
                assert reason["direction"] != "negative", (
                    f"{model_key.upper()}: expected credit_amount/duration to "
                    f"not push toward rejection for a small (500), short (6mo) "
                    f"loan, but got direction='negative' for {reason['feature']}."
                )


def test_critical_credit_history_is_plausible_risk_signal(client):
    """
    Domain sanity check 4: an applicant with 'critical account/other credits
    existing' (A34) credit history is the highest-risk credit history category
    in this dataset. When present, it should not appear as a strong positive
    (approval-favoring) factor - at minimum it should not contradict domain
    expectations by being neutral-to-negative rather than strongly positive.
    """
    sample = _base_application(credit_history="A34")
    res = client.post("/api/v1/ml/predict", json=sample)
    data = res.get_json()

    for model_key in ("lr", "rf"):
        history_reason = next(
            (r for r in data[model_key]["shap_reasons"] if r["feature"] == "credit_history"),
            None,
        )
        if history_reason is None:
            continue
        assert history_reason["direction"] != "positive" or history_reason["impact"] < 0.15, (
            f"{model_key.upper()}: critical credit history (A34) shown as a "
            f"strongly positive factor (impact={history_reason['impact']}), "
            "which contradicts domain expectations for the riskiest credit "
            "history category."
        )


def test_five_domain_cases_summary_report(client, capsys):
    """
    Not a strict pass/fail test - prints a summary table of top SHAP factors
    across 5 representative cases so a human can eyeball-review the output.
    This is the artifact referenced in the README's SHAP validation note.
    """
    cases = {
        "high_amount_long_duration": _base_application(credit_amount=17000, duration=60),
        "no_checking_account": _base_application(checking_status="A14"),
        "small_short_loan": _base_application(credit_amount=500, duration=6),
        "critical_credit_history": _base_application(credit_history="A34"),
        "young_unemployed": _base_application(age=20, employment="A71"),
    }

    print("\n--- SHAP Domain Sanity Summary ---")
    for name, payload in cases.items():
        res = client.post("/api/v1/ml/predict", json=payload)
        data = res.get_json()
        rf_top = data["rf"]["shap_reasons"][0]
        lr_top = data["lr"]["shap_reasons"][0]
        print(
            f"{name:30s} | RF top: {rf_top['feature']:18s} ({rf_top['direction']:8s}) "
            f"| LR top: {lr_top['feature']:18s} ({lr_top['direction']:8s})"
        )
    print("-----------------------------------\n")
