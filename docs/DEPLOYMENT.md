# CreditIQ Deployment Guide

CreditIQ can run as a Docker demo locally, or as a two-service deployment with
the Flask API and React frontend hosted separately.

## Option 1: Docker Demo

```bash
docker compose up --build
```

Open `http://localhost:8080`.

## Option 2: Render Blueprint

This repository includes `render.yaml` for a Render-style deployment:

- `creditiq-backend`: Dockerized Flask API
- `creditiq-frontend`: static React build

After creating the services from the blueprint, update the frontend environment
variable if Render gives the backend a different URL:

```text
VITE_API_BASE_URL=https://<your-backend-service>.onrender.com/api/v1
```

Then redeploy the frontend.

## Option 3: Vercel/Netlify + Backend Host

Deploy the backend on Render/Railway/Fly.io, then deploy the frontend on
Vercel or Netlify with:

```text
Root directory: frontend
Build command: npm ci && npm run build
Publish directory: dist
Environment: VITE_API_BASE_URL=https://<backend-url>/api/v1
```

## Production Notes

- Set strong `SECRET_KEY` and `JWT_SECRET_KEY` values.
- Set `OPENAI_API_KEY` only on the backend service if GPT-powered advisor
  responses are required.
- Use PostgreSQL through `DATABASE_URL` for persistent production data.
- Run `python create_demo_user.py` once after model artifacts are available if
  you want demo credentials in the hosted environment.
