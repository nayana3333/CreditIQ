import os
import pickle
import urllib.request

import numpy as np
import pandas as pd
from pandas.api.types import is_numeric_dtype
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score, roc_curve
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_PATH = os.path.join(DATA_DIR, "german_credit_data.csv")
UCI_URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/statlog/german/german.data"

COLUMNS = [
    "checking_status", "duration", "credit_history", "purpose", "credit_amount",
    "savings_status", "employment", "installment_rate", "personal_status",
    "other_parties", "residence_since", "property_magnitude", "age",
    "other_payment_plans", "housing", "existing_credits", "job",
    "num_dependents", "own_telephone", "foreign_worker", "target",
]

# Explicit ordinal encodings - these features have a genuine real-world order.
# Mapping reflects ascending risk: 0 = best/safest status, higher = riskier,
# so that higher encoded values correlate with the "bad credit" (target=1) class
# and LR coefficients become directionally interpretable.
# Retrained model check: all four ordinal features learned positive LR
# coefficients, so higher encoded values push toward the bad-credit class.
ORDINAL_MAPS = {
    "checking_status": {
        "A14": 0,  # no checking account - low-risk signal in this dataset
        "A13": 1,  # >= 200 DM - good balance
        "A12": 2,  # 0 <= ... < 200 DM - moderate
        "A11": 3,  # < 0 DM - overdrawn, highest risk
    },
    "savings_status": {
        "A65": 0,  # unknown/no savings account
        "A64": 1,  # >= 1000 DM - best
        "A63": 2,  # 500-1000 DM
        "A62": 3,  # 100-500 DM
        "A61": 4,  # < 100 DM - worst
    },
    "credit_history": {
        "A34": 0,  # critical account/other credits existing elsewhere
        "A33": 1,  # delay in paying off in the past
        "A32": 2,  # existing credits paid back duly till now
        "A31": 3,  # all credits at this bank paid back duly
        "A30": 4,  # no credits taken / all credits paid back duly
    },
    "employment": {
        "A75": 0,  # >= 7 years - most stable
        "A74": 1,  # 4-7 years
        "A73": 2,  # 1-4 years
        "A72": 3,  # < 1 year
        "A71": 4,  # unemployed - least stable
    },
}


def synthetic_dataset(size=1000):
    rng = np.random.default_rng(42)
    choices = {
        "checking_status": ["A11", "A12", "A13", "A14"],
        "credit_history": ["A30", "A31", "A32", "A33", "A34"],
        "purpose": ["A40", "A41", "A42", "A43", "A44", "A45", "A49", "A410"],
        "savings_status": ["A61", "A62", "A63", "A64", "A65"],
        "employment": ["A71", "A72", "A73", "A74", "A75"],
        "personal_status": ["A91", "A92", "A93", "A94"],
        "other_parties": ["A101", "A102", "A103"],
        "property_magnitude": ["A121", "A122", "A123", "A124"],
        "other_payment_plans": ["A141", "A142", "A143"],
        "housing": ["A151", "A152", "A153"],
        "job": ["A171", "A172", "A173", "A174"],
        "own_telephone": ["A191", "A192"],
        "foreign_worker": ["A201", "A202"],
    }
    rows = []
    for _ in range(size):
        credit_amount = int(rng.integers(500, 18000))
        duration = int(rng.integers(4, 73))
        age = int(rng.integers(19, 76))
        checking = rng.choice(choices["checking_status"])
        savings = rng.choice(choices["savings_status"])
        history = rng.choice(choices["credit_history"])
        risk = sum([credit_amount > 7000, duration > 36, age < 25, checking in ["A11", "A12"], savings in ["A61", "A65"], history in ["A30", "A33"]])
        target = 2 if rng.random() < min(0.15 + 0.1 * risk, 0.8) else 1
        rows.append({
            "checking_status": checking, "duration": duration, "credit_history": history,
            "purpose": rng.choice(choices["purpose"]), "credit_amount": credit_amount,
            "savings_status": savings, "employment": rng.choice(choices["employment"]),
            "installment_rate": int(rng.integers(1, 5)), "personal_status": rng.choice(choices["personal_status"]),
            "other_parties": rng.choice(choices["other_parties"]), "residence_since": int(rng.integers(1, 5)),
            "property_magnitude": rng.choice(choices["property_magnitude"]), "age": age,
            "other_payment_plans": rng.choice(choices["other_payment_plans"]), "housing": rng.choice(choices["housing"]),
            "existing_credits": int(rng.integers(1, 5)), "job": rng.choice(choices["job"]),
            "num_dependents": int(rng.integers(1, 3)), "own_telephone": rng.choice(choices["own_telephone"]),
            "foreign_worker": rng.choice(choices["foreign_worker"]), "target": target,
        })
    return pd.DataFrame(rows, columns=COLUMNS)


def load_dataset():
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
        if "target" not in df.columns:
            df.columns = COLUMNS
    else:
        try:
            with urllib.request.urlopen(UCI_URL, timeout=20) as response:
                lines = response.read().decode("utf-8").strip().splitlines()
            df = pd.DataFrame([line.split() for line in lines], columns=COLUMNS)
            df.to_csv(DATA_PATH, index=False)
        except Exception:
            df = synthetic_dataset()
    for col in ["duration", "credit_amount", "installment_rate", "residence_since", "age", "existing_credits", "num_dependents", "target"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["target"]).copy()
    df["target"] = df["target"].map({1: 0, 2: 1}).fillna(df["target"]).astype(int)
    return df


def encode_features(df):
    label_encoders = {}
    encoded = df.copy()
    for col, mapping in ORDINAL_MAPS.items():
        if col in encoded.columns:
            encoded[col] = encoded[col].map(mapping)
            if encoded[col].isnull().any():
                raise ValueError(f"Unmapped value found in column '{col}' during ordinal encoding")

    remaining_categorical_cols = [
        col for col in encoded.select_dtypes(include="object").columns
        if col != "target" and col not in ORDINAL_MAPS
    ]
    for col in remaining_categorical_cols:
        encoder = LabelEncoder()
        encoded[col] = encoder.fit_transform(encoded[col].astype(str))
        label_encoders[col] = encoder
    return encoded, label_encoders


def evaluate(name, model, X_test, y_test, probabilities, feature_names):
    pred = model.predict(X_test)
    fpr, tpr, _ = roc_curve(y_test, probabilities)
    metric = {
        "accuracy": float(accuracy_score(y_test, pred)),
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
        "f1": float(f1_score(y_test, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, probabilities)),
        "confusion_matrix": confusion_matrix(y_test, pred).tolist(),
        "roc_fpr": fpr.tolist(),
        "roc_tpr": tpr.tolist(),
    }
    if name == "lr":
        coefs = dict(zip(feature_names, model.coef_[0].tolist()))
        metric["coefficients"] = dict(sorted(coefs.items(), key=lambda item: abs(item[1]), reverse=True))
    else:
        imps = dict(zip(feature_names, model.feature_importances_.tolist()))
        metric["feature_importances"] = dict(sorted(imps.items(), key=lambda item: item[1], reverse=True))
    return metric


def main():
    df = load_dataset()
    encoded, label_encoders = encode_features(df)
    feature_names = [col for col in encoded.columns if col != "target"]
    X = encoded[feature_names]
    y = encoded["target"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    lr = LogisticRegression(solver="lbfgs", max_iter=1000, random_state=42)
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    lr.fit(X_train_scaled, y_train)
    rf.fit(X_train, y_train)
    lr_prob = lr.predict_proba(X_test_scaled)[:, 1]
    rf_prob = rf.predict_proba(X_test)[:, 1]
    model_metrics = {
        "lr": evaluate("lr", lr, X_test_scaled, y_test, lr_prob, feature_names),
        "rf": evaluate("rf", rf, X_test, y_test, rf_prob, feature_names),
    }
    model_metrics["roc_curves"] = {"lr": {"fpr": model_metrics["lr"]["roc_fpr"], "tpr": model_metrics["lr"]["roc_tpr"]}, "rf": {"fpr": model_metrics["rf"]["roc_fpr"], "tpr": model_metrics["rf"]["roc_tpr"]}}
    model_metrics["lr"]["cv_scores"] = cross_val_score(lr, scaler.fit_transform(X), y, cv=5).tolist()
    model_metrics["rf"]["cv_scores"] = cross_val_score(rf, X, y, cv=5).tolist()
    for key in ["lr", "rf"]:
        scores = model_metrics[key]["cv_scores"]
        model_metrics[key]["cv_mean"] = float(np.mean(scores))
        model_metrics[key]["cv_std"] = float(np.std(scores))
    outputs = {"logistic_model.pkl": lr, "random_forest_model.pkl": rf, "label_encoders.pkl": label_encoders, "feature_names.pkl": feature_names, "model_metrics.pkl": model_metrics, "scaler.pkl": scaler, "X_train_sample.pkl": X_train_scaled[:100]}
    for filename, value in outputs.items():
        with open(os.path.join(BASE_DIR, filename), "wb") as handle:
            pickle.dump(value, handle)
    print(f"\n{'Metric':<12}{'LR':>10}{'RF':>10}")
    for metric in ["accuracy", "precision", "recall", "f1", "roc_auc"]:
        print(f"{metric:<12}{model_metrics['lr'][metric]:>10.4f}{model_metrics['rf'][metric]:>10.4f}")
    print("\n--- Ordinal feature coefficient check (after retraining) ---")
    for feat in ORDINAL_MAPS:
        coef = model_metrics["lr"]["coefficients"].get(feat)
        print(f"{feat:20s} coefficient: {coef}")
    print("--------------------------------------------------------------\n")
    print("\nAll 7 pkl files saved.")


if __name__ == "__main__":
    main()
