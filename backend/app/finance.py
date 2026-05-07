import ast
import math
import operator
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


MIN_CREDIT_SCORE = 300
MAX_CREDIT_SCORE = 900


def to_decimal(value, default="0"):
    try:
        if value is None or value == "":
            return Decimal(default)
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValueError("Enter a valid number.")


def money(value):
    return float(to_decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def clamp(value, low, high):
    return max(low, min(high, value))


def risk_from_score(score):
    if score >= 730:
        return "Low"
    if score >= 650:
        return "Medium"
    return "High"


def score_from_finances(income, expenses, emi=0, base_score=760):
    income = max(float(income), 0.0)
    expenses = max(float(expenses), 0.0)
    emi = max(float(emi), 0.0)
    if income <= 0:
        return 620 if expenses <= 0 else 560

    expense_ratio = expenses / income
    emi_ratio = emi / income
    savings_ratio = max((income - expenses) / income, 0)

    score = base_score
    score += min(savings_ratio, 0.35) * 120
    score -= max(expense_ratio - 0.6, 0) * 220
    score -= max(emi_ratio - 0.35, 0) * 180
    return round(clamp(score, MIN_CREDIT_SCORE, MAX_CREDIT_SCORE))


def loan_months(principal, annual_rate, emi):
    principal = float(principal)
    annual_rate = float(annual_rate)
    emi = float(emi)
    if principal <= 0 or emi <= 0:
        return None
    monthly_rate = annual_rate / 100 / 12
    if monthly_rate <= 0:
        return math.ceil(principal / emi)
    monthly_interest = principal * monthly_rate
    if emi <= monthly_interest:
        return None
    months = -math.log(1 - (principal * monthly_rate / emi)) / math.log(1 + monthly_rate)
    return math.ceil(months)


def emi_for_loan(principal, annual_rate, months):
    principal = float(principal)
    annual_rate = float(annual_rate)
    months = int(months)
    if principal <= 0 or months <= 0:
        return None
    monthly_rate = annual_rate / 100 / 12
    if monthly_rate <= 0:
        return money(principal / months)
    emi = principal * monthly_rate * ((1 + monthly_rate) ** months) / (((1 + monthly_rate) ** months) - 1)
    return money(emi)


def amortization_schedule(principal, annual_rate, months, max_rows=120):
    emi = emi_for_loan(principal, annual_rate, months)
    if emi is None:
        return []
    balance = float(principal)
    monthly_rate = float(annual_rate) / 100 / 12
    rows = []
    row_count = int(months) if max_rows is None else min(int(months), max_rows)
    for month in range(1, row_count + 1):
        interest = balance * monthly_rate
        principal_paid = min(emi - interest, balance)
        if principal_paid <= 0:
            break
        balance = max(balance - principal_paid, 0)
        rows.append(
            {
                "month": month,
                "emi": money(emi),
                "principal": money(principal_paid),
                "interest": money(interest),
                "balance": money(balance),
            }
        )
        if balance <= 0:
            break
    return rows


def decision_support(income, expenses, existing_emi, loan_amount, annual_rate, months, current_score=700):
    proposed_emi = emi_for_loan(loan_amount, annual_rate, months) or 0
    total_emi = max(float(existing_emi), 0) + proposed_emi
    income = max(float(income), 0)
    expenses = max(float(expenses), 0)
    emi_ratio = (total_emi / income) if income else 1
    expense_ratio = ((expenses + proposed_emi) / income) if income else 1
    projected_score = score_from_finances(income, expenses + proposed_emi, total_emi, current_score)

    fuzzy_risk = 0
    fuzzy_risk += 0.35 if emi_ratio > 0.45 else 0.2 if emi_ratio > 0.35 else 0.05
    fuzzy_risk += 0.3 if expense_ratio > 0.8 else 0.15 if expense_ratio > 0.65 else 0.05
    fuzzy_risk += 0.25 if projected_score < 650 else 0.12 if projected_score < 730 else 0.03
    fuzzy_risk += 0.1 if proposed_emi <= 0 else 0
    fuzzy_risk = clamp(fuzzy_risk, 0, 1)

    if fuzzy_risk >= 0.62:
        decision = "Reject"
    elif fuzzy_risk >= 0.38:
        decision = "Manual Review"
    else:
        decision = "Approve"

    reasons = []
    if emi_ratio > 0.4:
        reasons.append(f"EMI burden becomes {emi_ratio * 100:.1f}% of income, above the safe 40% threshold.")
    else:
        reasons.append(f"EMI burden stays at {emi_ratio * 100:.1f}% of income.")
    if expense_ratio > 0.75:
        reasons.append(f"Total monthly outflow becomes {expense_ratio * 100:.1f}% of income.")
    if projected_score < 650:
        reasons.append("Projected score falls into a high-risk band.")
    elif projected_score >= 730:
        reasons.append("Projected score remains in a low-risk band.")

    return {
        "decision": decision,
        "risk_level": risk_from_score(projected_score),
        "fuzzy_risk_score": round(fuzzy_risk, 2),
        "projected_score": projected_score,
        "proposed_emi": money(proposed_emi),
        "total_emi": money(total_emi),
        "emi_to_income_ratio": round(emi_ratio, 3),
        "expense_to_income_ratio": round(expense_ratio, 3),
        "reasons": reasons,
    }


_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def safe_calculate(expression):
    tree = ast.parse(expression, mode="eval")

    def eval_node(node):
        if isinstance(node, ast.Expression):
            return eval_node(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
            left = eval_node(node.left)
            right = eval_node(node.right)
            if isinstance(node.op, ast.Pow) and abs(right) > 6:
                raise ValueError("Exponent is too large.")
            return _OPS[type(node.op)](left, right)
        if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
            return _OPS[type(node.op)](eval_node(node.operand))
        raise ValueError("Only numbers and +, -, *, /, ** are supported.")

    result = eval_node(tree)
    if not math.isfinite(result):
        raise ValueError("Calculation result is not finite.")
    return result
