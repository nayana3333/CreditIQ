import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from ..finance import emi_for_loan, loan_months, money, safe_calculate
from ..models import Budget, Loan, Transaction

assistant_bp = Blueprint("assistant", __name__)


def _number_after(pattern, text, default=None):
    match = re.search(pattern, text)
    if not match:
        return default
    return float(match.group(1).replace(",", ""))


def _extract_expression(text):
    cleaned = text.lower().replace("what is", "").replace("calculate", "")
    match = re.search(r"[-+*/().\d\s]+", cleaned)
    if not match:
        return None
    expression = match.group(0).strip()
    return expression if re.search(r"\d", expression) and re.search(r"[+\-*/]", expression) else None


def _finance_reply(text):
    amount = _number_after(r"(?:loan|principal|amount)\D+(\d[\d,]*(?:\.\d+)?)", text)
    rate = _number_after(r"(?:rate|interest)\D+(\d[\d,]*(?:\.\d+)?)", text, 0)
    months = _number_after(r"(\d[\d,]*(?:\.\d+)?)\s*(?:months|month)", text)
    emi = _number_after(r"(?:emi|payment)\D+(\d[\d,]*(?:\.\d+)?)", text)

    if "emi" in text and amount and months:
        computed = emi_for_loan(amount, rate or 0, months)
        if computed is not None:
            return (
                f"For a loan of Rs {money(amount):,.2f} at {rate or 0:.2f}% for {int(months)} months, "
                f"the estimated EMI is Rs {computed:,.2f}."
            )

    if any(word in text for word in ["how long", "duration", "tenure", "months"]) and amount and emi:
        computed_months = loan_months(amount, rate or 0, emi)
        if computed_months is None:
            return "That EMI is too low to cover the monthly interest. Increase the EMI or reduce the loan amount/rate."
        years = computed_months / 12
        return (
            f"At Rs {money(emi):,.2f} EMI, Rs {money(amount):,.2f} principal and {rate or 0:.2f}% annual interest, "
            f"the estimated payoff time is {computed_months} months, about {years:.1f} years."
        )

    return None


def _user_context():
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if not user_id:
            return None
        txs = Transaction.query.filter_by(user_id=int(user_id)).all()
        loans = Loan.query.filter_by(user_id=int(user_id)).all()
        budgets = Budget.query.filter_by(user_id=int(user_id)).all()
        income = sum(tx.amount for tx in txs if tx.type == "income")
        expenses = sum(tx.amount for tx in txs if tx.type in ["expense", "emi"])
        emi = sum(item.emi for item in loans)
        top = {}
        for tx in txs:
            if tx.type in ["expense", "emi"]:
                top[tx.category] = top.get(tx.category, 0) + tx.amount
        top_category = max(top.items(), key=lambda item: item[1])[0] if top else "none yet"
        return {"income": income, "expenses": expenses, "emi": emi, "budgets": budgets, "top_category": top_category}
    except Exception:
        return None


@assistant_bp.post("/chat")
def chat():
    text = ((request.get_json() or {}).get("message") or "").strip()
    lowered = text.lower()

    if not text:
        return jsonify({"reply": "Ask me a finance question, EMI calculation, budget doubt, or simple math problem."}), 400

    try:
        expression = _extract_expression(text)
        if expression:
            result = safe_calculate(expression)
            return jsonify({"reply": f"{expression} = {result:,.2f}"})
    except Exception:
        pass

    reply = _finance_reply(lowered)
    if reply:
        return jsonify({"reply": reply})

    context = _user_context()
    if context and any(word in lowered for word in ["my", "me", "recommend", "budget", "spending", "expense", "emi", "loan", "score"]):
        income = context["income"]
        expenses = context["expenses"]
        savings_rate = ((income - expenses) / income) if income else 0
        emi_ratio = (context["emi"] / income) if income else 0
        budget_count = len(context["budgets"])
        return jsonify(
            {
                "reply": (
                    f"Based on your data: income is Rs {income:,.2f}, expenses are Rs {expenses:,.2f}, "
                    f"savings rate is {savings_rate * 100:.1f}%, EMI burden is {emi_ratio * 100:.1f}%, "
                    f"and your highest spending category is {context['top_category']}. "
                    f"You have {budget_count} active budgets. "
                    f"{'Reduce discretionary expenses first.' if savings_rate < 0.1 else 'Your savings base is healthy; keep tracking category limits.'}"
                )
            }
        )

    if any(word in lowered for word in ["credit", "cibil", "score"]):
        reply = (
            "To improve your credit score: pay every EMI/card bill on time, keep credit utilization below 30%, "
            "avoid many loan applications in a short period, and keep older accounts active when possible."
        )
    elif any(word in lowered for word in ["overspend", "spend", "budget", "expense"]):
        reply = (
            "A sensible budget target is: essentials under 50% of income, wants under 30%, and savings/debt payoff near 20%. "
            "If expenses cross 75% of income, cut flexible categories first."
        )
    elif any(word in lowered for word in ["loan", "emi", "interest", "debt"]):
        reply = (
            "Keep total EMIs below 35-40% of monthly income. You can ask: "
            "'EMI for loan 500000 at 10% for 60 months' or 'how long for loan 300000 EMI 9000 rate 12%'."
        )
    elif any(word in lowered for word in ["save", "saving", "invest"]):
        reply = (
            "Build one month of emergency savings first, then move toward 3-6 months. Invest only after high-interest debt "
            "is controlled and monthly essentials are covered."
        )
    elif any(word in lowered for word in ["hello", "hi", "hey"]):
        reply = "Hi! Ask me about credit score, EMIs, budgeting, savings, loans, or a quick calculation."
    else:
        reply = (
            "I can help with finance questions, EMI/loan math, budgeting, credit-score improvement, savings plans, "
            "and simple arithmetic. Please include the numbers if you want a calculation."
        )

    return jsonify({"reply": reply})
