import csv
import io
import re
from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..finance import money
from ..models import Transaction

transactions_bp = Blueprint("transactions", __name__)
VALID_TYPES = {"income", "expense", "emi"}


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
    tx_type = (data.get("type") or "expense").strip().lower()
    if tx_type not in VALID_TYPES:
        return jsonify({"error": "type must be income, expense, or emi"}), 400
    try:
        amount = money(data.get("amount", 0))
        tx_date = date.fromisoformat(data.get("date", date.today().isoformat()))
    except (ValueError, TypeError):
        return jsonify({"error": "amount and date must be valid"}), 400
    if amount <= 0:
        return jsonify({"error": "amount must be greater than zero"}), 400

    tx = Transaction(
        user_id=user_id,
        amount=amount,
        type=tx_type,
        category=(data.get("category") or "Other").strip() or "Other",
        tx_date=tx_date,
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
        tx_type = (row.get("type") or "expense").strip().lower()
        if tx_type not in VALID_TYPES:
            continue
        try:
            amount = money(row.get("amount", 0))
            if amount <= 0:
                continue
            tx_date = date.fromisoformat((row.get("date") or date.today().isoformat()).strip())
        except (ValueError, TypeError):
            continue
        tx = Transaction(
            user_id=user_id,
            amount=amount,
            type=tx_type,
            category=(row.get("category") or "Other").strip(),
            tx_date=tx_date,
            description=(row.get("description") or "").strip() or None,
        )
        db.session.add(tx)
        inserted += 1

    db.session.commit()
    return jsonify({"message": "csv processed", "inserted": inserted}), 201


@transactions_bp.post("/upload-csv/preview")
@jwt_required()
def preview_csv():
    user_id = int(get_jwt_identity())
    if "file" not in request.files:
        return jsonify({"error": "CSV file is required"}), 400

    file = request.files["file"]
    if not file or not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported"}), 400

    existing = {
        (round(tx.amount, 2), tx.type, tx.category.lower(), tx.tx_date.isoformat())
        for tx in Transaction.query.filter_by(user_id=user_id).all()
    }
    decoded = io.StringIO(file.read().decode("utf-8"))
    reader = csv.DictReader(decoded)
    rows = []
    errors = []
    for index, row in enumerate(reader, start=2):
        tx_type = (row.get("type") or "expense").strip().lower()
        category = (row.get("category") or _guess_type_and_category(row.get("description", ""))[1]).strip()
        try:
            amount = money(row.get("amount", 0))
            tx_date = date.fromisoformat((row.get("date") or date.today().isoformat()).strip())
            duplicate = (round(amount, 2), tx_type, category.lower(), tx_date.isoformat()) in existing
            if tx_type not in VALID_TYPES or amount <= 0:
                raise ValueError("invalid row")
            rows.append(
                {
                    "row": index,
                    "amount": amount,
                    "type": tx_type,
                    "category": category,
                    "date": tx_date.isoformat(),
                    "description": (row.get("description") or "").strip(),
                    "duplicate": duplicate,
                }
            )
        except Exception:
            errors.append({"row": index, "message": "Invalid amount, type, or date"})

    return jsonify({"rows": rows[:50], "errors": errors, "valid_count": len(rows), "duplicate_count": sum(1 for row in rows if row["duplicate"])})


@transactions_bp.get("")
@jwt_required()
def list_transactions():
    user_id = int(get_jwt_identity())
    query = Transaction.query.filter_by(user_id=user_id)
    tx_type = (request.args.get("type") or "").strip().lower()
    category = (request.args.get("category") or "").strip()
    search = (request.args.get("search") or "").strip()
    month = (request.args.get("month") or "").strip()

    if tx_type in VALID_TYPES:
        query = query.filter(Transaction.type == tx_type)
    if category:
        query = query.filter(Transaction.category.ilike(category))
    if search:
        like = f"%{search}%"
        query = query.filter((Transaction.description.ilike(like)) | (Transaction.category.ilike(like)))
    if month:
        try:
            year, month_num = [int(part) for part in month.split("-")]
            start = date(year, month_num, 1)
            end = date(year + (month_num == 12), 1 if month_num == 12 else month_num + 1, 1)
            query = query.filter(Transaction.tx_date >= start, Transaction.tx_date < end)
        except Exception:
            return jsonify({"error": "month must be YYYY-MM"}), 400

    items = query.order_by(Transaction.tx_date.desc(), Transaction.id.desc()).all()
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

    if "amount" in data:
        amount = money(data.get("amount"))
        if amount <= 0:
            return jsonify({"error": "amount must be greater than zero"}), 400
        tx.amount = amount
    if "type" in data:
        tx_type = (data.get("type") or tx.type).strip().lower()
        if tx_type not in VALID_TYPES:
            return jsonify({"error": "type must be income, expense, or emi"}), 400
        tx.type = tx_type
    tx.category = (data.get("category", tx.category) or "Other").strip()
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
