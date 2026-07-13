# CreditIQ Demo Guide

This guide gives recruiters and reviewers a clean way to run the project locally.

## Fast Local Demo

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python train_models.py
python create_demo_user.py
python run.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Demo credentials:

```text
demo@creditiq.com
demo12345
```

## Docker Demo

From the project root:

```bash
docker compose up --build
```

Open `http://localhost:8080`.

## Suggested Demo Path

1. Sign in with the demo account.
2. Open Dashboard and show application counts, approval rate, and latest model decision.
3. Open Applications and view one decision report.
4. Open Analytics and show model performance, ROC curves, confusion matrices, and feature importance.
5. Open the Business Impact tab and move the threshold slider to explain the cost tradeoff between missed defaults and rejected good customers.
6. Open What-if Simulator and change loan amount/duration.
7. Open AI Advisor and ask: "Why was this application rejected?" or "How can approval odds improve?"

## Interview Talk Track

- The ML layer compares Logistic Regression and Random Forest on the German Credit Dataset.
- The explainability layer uses SHAP-style factors plus domain sanity checks.
- The decision layer turns confusion matrix errors into estimated portfolio cost.
- The threshold slider shows that lending policy is a risk-appetite decision, not only a model accuracy decision.

## Screenshot Checklist

Capture these screens for the README or presentation:

- Dashboard
- Application decision report
- Research analytics / Business Impact
- What-if simulator
