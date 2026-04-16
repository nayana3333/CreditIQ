import csv
import io
import re
from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..models import Transaction

transactions_bp = Blueprint("transactions", __name__)


def _guess_type_and_category(description: str):
    text = (description or "").lower()
    if any(k in text for k in ["salary", "bonus", "refund", "income"]):
        return "income", "Income"
    if any(k in text for k in ["emi", "loan", "installment"]):
        return "emi", "Loan/EMI"
    if any(k in text for k in ["zomato", "swiggy", "food", "restaurant"]):
        return "expense", "Food"
    if any(k in text for k in ["uber", "ola", "metro", "travel", "fuel"]):
        return "expense", "Travel"
    if any(k in text for k in ["amazon", "shopping", "myntra", "flipkart"]):
        return "expense", "Shopping"
    return "expense", "Other"


@transactions_bp.post("")
@jwt_required()
def add_transaction():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    tx = Transaction(
        user_id=user_id,
        amount=float(data.get("amount", 0)),
        type=data.get("type", "expense"),
        category=data.get("category", "Other"),
        tx_date=date.fromisoformat(data.get("date", date.today().isoformat())),
        description=data.get("description"),
    )

    db.session.add(tx)
    db.session.commit()

    return jsonify({"id": tx.id, "message": "transaction added"}), 201


@transactions_bp.post("/parse-text")
@jwt_required()
def parse_text_transaction():
    data = request.get_json() or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "text is required"}), 400

    amount_match = re.search(r"(\d+(?:\.\d+)?)", text)
    amount = float(amount_match.group(1)) if amount_match else 0.0
    tx_type, category = _guess_type_and_category(text)

    return jsonify(
        {
            "amount": amount,
            "type": tx_type,
            "category": category,
            "description": text,
        }
    )


@transactions_bp.post("/upload-csv")
@jwt_required()
def upload_csv():
    user_id = int(get_jwt_identity())
    if "file" not in request.files:
        return jsonify({"error": "CSV file is required"}), 400

    file = request.files["file"]
    if not file or not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported"}), 400

    decoded = io.StringIO(file.read().decode("utf-8"))
    reader = csv.DictReader(decoded)
    required_fields = {"amount", "type", "category", "date"}

    if not reader.fieldnames or not required_fields.issubset(set(reader.fieldnames)):
        return jsonify(
            {
                "error": "CSV headers must include amount,type,category,date and optional description"
            }
        ), 400

    inserted = 0
    for row in reader:
        tx = Transaction(
            user_id=user_id,
            amount=float(row.get("amount", 0)),
            type=(row.get("type") or "expense").strip(),
            category=(row.get("category") or "Other").strip(),
            tx_date=date.fromisoformat((row.get("date") or date.today().isoformat()).strip()),
            description=(row.get("description") or "").strip() or None,
        )
        db.session.add(tx)
        inserted += 1

    db.session.commit()
    return jsonify({"message": "csv processed", "inserted": inserted}), 201


@transactions_bp.get("")
@jwt_required()
def list_transactions():
    user_id = int(get_jwt_identity())
    items = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.tx_date.desc()).all()
    return jsonify(
        [
            {
                "id": tx.id,
                "amount": tx.amount,
                "type": tx.type,
                "category": tx.category,
                "date": tx.tx_date.isoformat(),
                "description": tx.description,
            }
            for tx in items
        ]
    )


@transactions_bp.put("/<int:tx_id>")
@jwt_required()
def update_transaction(tx_id: int):
    user_id = int(get_jwt_identity())
    tx = Transaction.query.filter_by(id=tx_id, user_id=user_id).first_or_404()
    data = request.get_json() or {}

    tx.amount = float(data.get("amount", tx.amount))
    tx.type = data.get("type", tx.type)
    tx.category = data.get("category", tx.category)
    tx.description = data.get("description", tx.description)
    if data.get("date"):
        tx.tx_date = date.fromisoformat(data["date"])

    db.session.commit()
    return jsonify({"message": "transaction updated"})


@transactions_bp.delete("/<int:tx_id>")
@jwt_required()
def delete_transaction(tx_id: int):
    user_id = int(get_jwt_identity())
    tx = Transaction.query.filter_by(id=tx_id, user_id=user_id).first_or_404()
    db.session.delete(tx)
    db.session.commit()
    return jsonify({"message": "transaction deleted"})
