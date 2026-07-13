"""Run: python create_demo_user.py"""

from datetime import UTC, datetime, timedelta
import os
import json
import sqlite3
from pathlib import Path

from werkzeug.security import generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
DEMO_EMAIL = "demo@creditiq.com"
DEMO_PASSWORD = "demo12345"


def sqlite_path_from_env():
    database_url = os.environ.get("DATABASE_URL", "")
    if database_url.startswith("sqlite:///"):
        raw_path = database_url.removeprefix("sqlite:///")
        path = Path(raw_path)
        return path if path.is_absolute() else BASE_DIR / path
    return BASE_DIR / "credit_intel.db"


DB_PATH = sqlite_path_from_env()


def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)

SAMPLES = [
    {"credit_amount": 1169, "duration": 6, "purpose": "A40", "age": 67, "checking_status": "A11", "credit_history": "A34", "employment": "A75", "final_decision": "approved", "lr_decision": "approved", "rf_decision": "approved", "lr_confidence": 0.82, "rf_confidence": 0.91, "consensus": True},
    {"credit_amount": 5951, "duration": 48, "purpose": "A43", "age": 22, "checking_status": "A14", "credit_history": "A33", "employment": "A71", "final_decision": "rejected", "lr_decision": "rejected", "rf_decision": "rejected", "lr_confidence": 0.73, "rf_confidence": 0.88, "consensus": True},
    {"credit_amount": 2096, "duration": 12, "purpose": "A42", "age": 49, "checking_status": "A12", "credit_history": "A32", "employment": "A73", "final_decision": "approved", "lr_decision": "approved", "rf_decision": "approved", "lr_confidence": 0.77, "rf_confidence": 0.85, "consensus": True},
    {"credit_amount": 7882, "duration": 42, "purpose": "A41", "age": 45, "checking_status": "A11", "credit_history": "A34", "employment": "A74", "final_decision": "rejected", "lr_decision": "approved", "rf_decision": "rejected", "lr_confidence": 0.54, "rf_confidence": 0.61, "consensus": False},
    {"credit_amount": 4870, "duration": 24, "purpose": "A40", "age": 53, "checking_status": "A13", "credit_history": "A32", "employment": "A75", "final_decision": "approved", "lr_decision": "approved", "rf_decision": "approved", "lr_confidence": 0.89, "rf_confidence": 0.93, "consensus": True},
]


def move_stale_journal():
    journal = DB_PATH.with_name(DB_PATH.name + "-journal")
    if journal.exists():
        backup = DB_PATH.with_name(f"{journal.name}.{utc_now().strftime('%Y%m%d-%H%M%S')}.bak")
        journal.replace(backup)


def ensure_tables(con):
    con.execute("""
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL
        )
    """)
    con.execute("""
        CREATE TABLE IF NOT EXISTS credit_applications (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            checking_status VARCHAR(80) NOT NULL,
            duration INTEGER NOT NULL,
            credit_history VARCHAR(120) NOT NULL,
            purpose VARCHAR(80) NOT NULL,
            credit_amount FLOAT NOT NULL,
            savings_status VARCHAR(80) NOT NULL,
            employment VARCHAR(80) NOT NULL,
            installment_rate INTEGER NOT NULL,
            personal_status VARCHAR(80) NOT NULL,
            other_parties VARCHAR(80) NOT NULL,
            residence_since INTEGER NOT NULL,
            property_magnitude VARCHAR(80) NOT NULL,
            age INTEGER NOT NULL,
            other_payment_plans VARCHAR(80) NOT NULL,
            housing VARCHAR(80) NOT NULL,
            existing_credits INTEGER NOT NULL,
            job VARCHAR(80) NOT NULL,
            num_dependents INTEGER NOT NULL,
            own_telephone VARCHAR(40) NOT NULL,
            foreign_worker VARCHAR(40) NOT NULL,
            lr_decision VARCHAR(20),
            lr_confidence FLOAT,
            lr_good_prob FLOAT,
            lr_bad_prob FLOAT,
            rf_decision VARCHAR(20),
            rf_confidence FLOAT,
            rf_good_prob FLOAT,
            rf_bad_prob FLOAT,
            final_decision VARCHAR(20),
            consensus BOOLEAN,
            lr_shap_reasons TEXT,
            rf_shap_reasons TEXT,
            created_at DATETIME NOT NULL,
            FOREIGN KEY(user_id) REFERENCES user(id)
        )
    """)


def shap_reasons():
    return json.dumps([
        {"feature": "credit_amount", "label": "Loan Amount", "impact": 0.34, "direction": "negative"},
        {"feature": "checking_status", "label": "Account Balance", "impact": 0.28, "direction": "positive"},
        {"feature": "duration", "label": "Loan Duration", "impact": 0.21, "direction": "negative"},
        {"feature": "credit_history", "label": "Credit History", "impact": 0.18, "direction": "positive"},
        {"feature": "age", "label": "Applicant Age", "impact": 0.12, "direction": "positive"},
    ])


def confidence_probs(decision, confidence):
    if decision == "approved":
        return confidence, 1 - confidence
    return 1 - confidence, confidence


def main():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    move_stale_journal()
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    ensure_tables(con)

    now = utc_now().isoformat(sep=" ", timespec="seconds")
    row = con.execute("SELECT id FROM user WHERE email = ?", (DEMO_EMAIL,)).fetchone()
    if row:
        user_id = row["id"]
        con.execute(
            "UPDATE user SET password_hash = ? WHERE id = ?",
            (generate_password_hash(DEMO_PASSWORD), user_id),
        )
        print("Demo user already exists.")
    else:
        cur = con.execute(
            "INSERT INTO user (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
            ("Demo User", DEMO_EMAIL, generate_password_hash(DEMO_PASSWORD), now),
        )
        user_id = cur.lastrowid
        print("Created demo user.")

    existing_apps = con.execute("SELECT COUNT(*) FROM credit_applications WHERE user_id = ?", (user_id,)).fetchone()[0]
    if existing_apps >= len(SAMPLES):
        print(f"Demo user already has {existing_apps} applications.")
    else:
        reasons = shap_reasons()
        insert_sql = """
            INSERT INTO credit_applications (
                user_id, checking_status, duration, credit_history, purpose, credit_amount,
                savings_status, employment, installment_rate, personal_status, other_parties,
                residence_since, property_magnitude, age, other_payment_plans, housing,
                existing_credits, job, num_dependents, own_telephone, foreign_worker,
                lr_decision, lr_confidence, lr_good_prob, lr_bad_prob,
                rf_decision, rf_confidence, rf_good_prob, rf_bad_prob,
                final_decision, consensus, lr_shap_reasons, rf_shap_reasons, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """
        for index, sample in enumerate(SAMPLES[existing_apps:], start=existing_apps):
            lr_good, lr_bad = confidence_probs(sample["lr_decision"], sample["lr_confidence"])
            rf_good, rf_bad = confidence_probs(sample["rf_decision"], sample["rf_confidence"])
            con.execute(insert_sql, (
                user_id, sample["checking_status"], sample["duration"], sample["credit_history"], sample["purpose"], sample["credit_amount"],
                "A65", sample["employment"], 2, "A93", "A101", 2, "A121", sample["age"], "A143", "A152",
                1, "A173", 1, "A192", "A201", sample["lr_decision"], sample["lr_confidence"], lr_good, lr_bad,
                sample["rf_decision"], sample["rf_confidence"], rf_good, rf_bad, sample["final_decision"], int(sample["consensus"]),
                reasons, reasons, (utc_now() - timedelta(days=index * 3)).isoformat(sep=" ", timespec="seconds"),
            ))
        print(f"Added {len(SAMPLES) - existing_apps} sample applications for {DEMO_EMAIL}.")

    con.commit()
    total = con.execute("SELECT COUNT(*) FROM credit_applications WHERE user_id = ?", (user_id,)).fetchone()[0]
    con.close()
    print(f"Demo user application count: {total}")
    print(f"\nDemo credentials: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
