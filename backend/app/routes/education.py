from flask import Blueprint, jsonify, request

education_bp = Blueprint("education", __name__)

LESSONS = [
    {
        "id": 1,
        "title": "Credit Score Basics",
        "content": "Pay on time, keep utilization low, and avoid frequent hard inquiries.",
    },
    {
        "id": 2,
        "title": "EMI Management",
        "content": "Keep EMI-to-income ratio manageable and never miss due dates.",
    },
    {
        "id": 3,
        "title": "Budgeting for Beginners",
        "content": "Track fixed and variable expenses and target consistent monthly savings.",
    },
]

QUIZ = [
    {
        "id": 1,
        "question": "What utilization rate is generally healthy for credit score?",
        "answer": "below_30",
    },
    {
        "id": 2,
        "question": "What most strongly helps credit history?",
        "answer": "on_time_payment",
    },
]


@education_bp.get("/lessons")
def get_lessons():
    return jsonify(LESSONS)


@education_bp.get("/quiz")
def get_quiz():
    return jsonify([{"id": q["id"], "question": q["question"]} for q in QUIZ])


@education_bp.post("/quiz/submit")
def submit_quiz():
    answers = (request.get_json() or {}).get("answers", {})
    correct = 0
    for q in QUIZ:
        if answers.get(str(q["id"])) == q["answer"]:
            correct += 1
    return jsonify({"score": correct, "total": len(QUIZ)})

