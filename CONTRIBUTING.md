# Contributing to Recro AI

Thank you for your interest in contributing! This guide will get you from zero to running the project in under 10 minutes.

---

## Table of Contents

- [Quick Start (Local Dev)](#quick-start-local-dev)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Configuring Your AI Provider](#configuring-your-ai-provider)
- [Development Workflow](#development-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Architecture Overview](#architecture-overview)

---

## Quick Start (Local Dev)

### Option A — One-Click Scripts (Recommended)

**Windows (PowerShell):**
```powershell
.\start-dev.ps1
```

**macOS / Linux:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

These scripts will:
1. Check that Python, Node.js, and `uv` are installed
2. Create `apps/backend/.env` from the example template (if it doesn't exist)
3. Install all Python and Node.js dependencies
4. Start both backend and frontend servers

Then open **http://localhost:3000** in your browser.

---

### Option B — Manual Setup

**Terminal 1 — Backend:**
```bash
cd apps/backend
cp .env.example .env        # First time only
uv sync                      # Install Python deps
uv run app                   # Start FastAPI on :8000
```

**Terminal 2 — Frontend:**
```bash
cd apps/frontend
npm install                  # First time only
npm run dev                  # Start Next.js on :3000
```

---

### Option C — Docker (Simplest, no Python/Node needed)

```bash
docker compose up
```

Opens at **http://localhost:3000**. Data persists in the `resume-data` Docker volume.

---

## Prerequisites

| Tool | Min Version | Install |
|------|------------|---------|
| Python | 3.13+ | [python.org](https://python.org) |
| Node.js | 22+ | [nodejs.org](https://nodejs.org) |
| uv | latest | `pip install uv` or [astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) |
| Docker | any | [docker.com](https://docker.com) *(only for Option C)* |

---

## Project Structure

```
Recro-AI/
├── apps/
│   ├── backend/          # Python FastAPI — AI processing, resume storage
│   │   ├── app/
│   │   │   ├── main.py   # FastAPI entry point
│   │   │   ├── config.py # Settings (pydantic-settings, reads .env)
│   │   │   ├── llm.py    # LiteLLM integration (all AI providers)
│   │   │   ├── routers/  # API endpoints (/config, /resumes, /health…)
│   │   │   ├── services/ # Business logic
│   │   │   └── schemas/  # Pydantic data models
│   │   ├── data/         # TinyDB JSON storage (gitignored, auto-created)
│   │   └── .env.example  # Config template — copy to .env
│   │
│   └── frontend/         # Next.js 15 — UI
│       ├── app/          # Pages (dashboard, builder, tailor, settings…)
│       ├── components/   # Reusable UI components
│       └── lib/          # API client, i18n, context providers
│
├── docker/               # Docker startup script
├── docker-compose.yml    # Full-stack Docker deployment
├── Dockerfile            # Multi-stage build (frontend + backend)
├── railway.toml          # One-click Railway deployment
├── render.yaml           # One-click Render deployment
├── start-dev.ps1         # Windows dev startup script
└── start-dev.sh          # macOS/Linux dev startup script
```

---

## Configuring Your AI Provider

**You do NOT need to edit any files** to configure your AI provider.

After starting the app, visit **http://localhost:3000/settings** and:

1. Select your provider (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Ollama, or any OpenAI-compatible server)
2. Enter your API key
3. Enter your model name (pre-filled with defaults)
4. Click **Save Configuration**
5. Click **Test Connection** to verify

> **API keys are stored locally** in `apps/backend/data/config.json`, which is gitignored and never committed.

### Supported Providers

| Provider | Model Example | Free Tier |
|----------|--------------|-----------|
| OpenAI | `gpt-4o-mini` | No |
| Anthropic | `claude-haiku-4-5-20251001` | No |
| Google Gemini | `gemini/gemini-2.0-flash` | Yes (1M tokens/month) |
| DeepSeek | `deepseek-chat` | No |
| OpenRouter | `deepseek/deepseek-chat` | Yes (some models) |
| Ollama | `gemma3:4b` | Yes (local, free) |
| OpenAI-Compatible | any | Depends |

---

## Development Workflow

### Backend changes
```bash
cd apps/backend
RELOAD=true uv run app    # Auto-reloads on file save
```

API docs auto-generate at **http://localhost:8000/docs**

### Frontend changes
```bash
cd apps/frontend
npm run dev              # Hot-reloads with Turbopack
```

### Running tests
```bash
# Backend
cd apps/backend && uv sync --group dev && uv run pytest

# Frontend
cd apps/frontend && npm run test
```

### Linting & formatting
```bash
# Frontend
cd apps/frontend && npm run lint && npm run format
```

---

## Pull Request Guidelines

1. **Fork** the repository and create your branch from `main`
2. Keep PRs focused — one feature or fix per PR
3. Write or update tests for any behavior changes
4. Ensure `npm run lint` passes for frontend changes
5. Run `uv run pytest` for backend changes
6. Add a clear description of what the PR does and why
7. Reference any related issues with `Fixes #123`

### Branch naming
- `feat/description` — new feature
- `fix/description` — bug fix
- `docs/description` — documentation only
- `refactor/description` — code cleanup

---

## Architecture Overview

```
Browser
  │
  ▼
Next.js (port 3000)
  │  serves UI pages
  │  proxies /api/* → FastAPI (port 8000)
  │
  ▼
FastAPI
  ├── /api/v1/health       — liveness check
  ├── /api/v1/status       — LLM + DB status
  ├── /api/v1/config/*     — LLM provider settings, API keys
  ├── /api/v1/resumes/*    — upload, parse, improve, tailor
  ├── /api/v1/jobs/*       — job description storage
  └── /api/v1/enrichment/* — cover letter, outreach generation
         │
         ▼
      LiteLLM (unified API layer)
         │
         ├── OpenAI / Anthropic / Gemini / DeepSeek / OpenRouter
         └── Ollama / any OpenAI-compatible server
```

**Data storage:** TinyDB (JSON files in `apps/backend/data/`). Each deployment gets its own isolated database — no shared state between users.

---

Thank you for contributing! If you have questions, open a GitHub Discussion or an Issue.
