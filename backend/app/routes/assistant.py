import json
import os

from flask import Blueprint, jsonify, request

assistant_bp = Blueprint("assistant", __name__)

SYSTEM_PROMPT = """You are CreditIQ AI Advisor, a credit counselor embedded in a fintech platform.
You help users understand credit decisions, SHAP explainability results, model metrics, loan planning, budgeting, EMI tradeoffs, and practical ways to improve creditworthiness.

Rules:
- Answer the user's actual question directly, even if it is broad.
- Use application context and model outputs when available.
- Be specific and use actual numbers when available.
- Be actionable: give concrete steps, not vague advice.
- Keep answers clear and structured; use short bullets for multi-step guidance.
- Explain SHAP values, ROC-AUC, confusion matrices, LR, and RF in plain English when asked.
- If the question is unrelated to finance/credit, answer briefly if safe, then connect back to how CreditIQ can help.
- For legal, tax, or investment decisions, give educational guidance and suggest consulting a qualified professional.
- Never say "I'm just an AI".
- Never invent application facts that are not in the loaded context.

{loan_context}"""


def _fallback_reply(message, loan_context=""):
    lower = message.lower()
    if "shap" in lower:
        return (
            "SHAP explains which inputs pushed the model toward approval or rejection. "
            "In CreditIQ, a negative direction means the factor increased risk, while a positive direction helped approval. "
            "Use the top factors as an action list: reduce risky loan terms, improve account balances, or strengthen credit history before reapplying."
        )
    if "emi" in lower or "loan" in lower or "approval" in lower:
        return (
            "To improve approval odds, focus on three levers: reduce the loan amount, choose a shorter affordable tenure, and strengthen repayment signals such as stable employment and account balance. "
            "If an application context is loaded, compare the highest-impact SHAP factors first because they explain what mattered most in this decision."
        )
    if "roc" in lower or "auc" in lower or "confusion" in lower:
        return (
            "ROC-AUC measures how well the model separates good and risky applicants across thresholds; closer to 1.0 is better. "
            "A confusion matrix shows correct and incorrect approvals/rejections, helping you see whether the model misses risky applicants or rejects safe ones."
        )
    return (
        "I can help with credit decisions, SHAP explanations, loan planning, EMI tradeoffs, budgeting, and ways to improve creditworthiness. "
        "Ask about a specific application, model factor, or financial scenario and I will give practical next steps."
    )


@assistant_bp.post("/chat")
def chat():
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key or api_key == "your-openai-api-key-here":
        return jsonify(
            {
                "reply": "AI Advisor requires an OpenAI API key. Add OPENAI_API_KEY to your .env file to enable this feature.",
                "status": "success",
            }
        )

    data = request.get_json() or {}
    message = data.get("message", "").strip()
    application_id = data.get("application_id") or data.get("loan_id")
    history = data.get("conversation_history", [])

    if not message:
        return jsonify({"reply": "Please ask a question.", "status": "error"}), 400

    loan_context = ""
    if application_id:
        try:
            from app.models import CreditApplication

            app_record = CreditApplication.query.get(int(application_id))
            if app_record:
                rf_reasons = json.loads(app_record.rf_shap_reasons or "[]")
                top_factors = rf_reasons[:3] if rf_reasons else []
                factors_text = "\n".join(
                    [
                        f"  - {item.get('label', '')}: impact {item.get('impact', 0):.2f} ({'pushes toward rejection' if item.get('direction') == 'negative' else 'pushes toward approval'})"
                        for item in top_factors
                    ]
                )
                loan_context = f"""
LOADED APPLICATION #{application_id}:
- Loan Amount: {app_record.credit_amount or 'N/A'}
- Duration: {app_record.duration or 'N/A'} months
- Purpose: {app_record.purpose or 'N/A'}
- Age: {app_record.age or 'N/A'}
- Final Decision: {app_record.final_decision or 'N/A'}
- Logistic Regression: {app_record.lr_decision or 'N/A'} ({(app_record.lr_confidence or 0) * 100:.1f}% confidence)
- Random Forest: {app_record.rf_decision or 'N/A'} ({(app_record.rf_confidence or 0) * 100:.1f}% confidence)
- Models agree: {app_record.consensus or False}
- Top risk factors (SHAP):
{factors_text or '  Not available'}

When user asks why they were rejected or approved, reference these specific factors."""
        except Exception:
            pass

    try:
        from openai import OpenAI

        base_url = os.environ.get("OPENAI_BASE_URL") or None
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        default_headers = {
            "HTTP-Referer": os.environ.get("APP_PUBLIC_URL", "http://localhost:5173"),
            "X-Title": "CreditIQ AI Advisor",
        }
        client = OpenAI(api_key=api_key, base_url=base_url, default_headers=default_headers)
        messages = [{"role": "system", "content": SYSTEM_PROMPT.format(loan_context=loan_context)}]
        for item in history[-10:]:
            role = item.get("role", "user")
            content = item.get("content", "")
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=800,
            temperature=0.45,
        )
        return jsonify({"reply": response.choices[0].message.content, "status": "success"})
    except Exception:
        return jsonify({
            "reply": _fallback_reply(message, loan_context),
            "status": "fallback",
            "note": "Live AI provider was unavailable, so CreditIQ used local advisor guidance.",
        })
