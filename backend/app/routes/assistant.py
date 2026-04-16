from flask import Blueprint, jsonify, request

assistant_bp = Blueprint("assistant", __name__)


@assistant_bp.post("/chat")
def chat():
    text = (request.get_json() or {}).get("message", "").lower()

    if "credit" in text and "improve" in text:
        reply = "Keep credit utilization below 30%, pay EMIs on time, and avoid multiple short-term loans."
    elif "overspend" in text or "spend" in text:
        reply = "Set category caps and keep total monthly expenses under 70% of your income."
    else:
        reply = "Track income and expenses weekly, then review category trends before month-end."

    return jsonify({"reply": reply})
