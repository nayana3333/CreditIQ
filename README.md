# AI-Powered Credit Intelligence (MVP Scaffold)

Monorepo scaffold for a young-adult financial intelligence platform.

## Stack
- Frontend: React + Vite + Tailwind
- Backend: Flask + SQLAlchemy + JWT
- Database: PostgreSQL

## Quick Start

### 1) Backend
```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Base
- `http://localhost:5000/api/v1`

## Implemented MVP Endpoints
- Auth: register/login/profile
- Transactions: create/list/update/delete
- Analysis: monthly summary
- ML: mock credit score + risk prediction
- Dashboard: aggregate response
- Assistant: basic rule-based coach response
- Simulation: what-if score/risk projection

## Notes
- ML endpoints are intentionally stubbed with deterministic logic first; swap with trained model inference in `app/services` later.
- Use Alembic or Flask-Migrate for production migrations.
