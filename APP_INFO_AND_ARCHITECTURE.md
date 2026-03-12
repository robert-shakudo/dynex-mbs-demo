# App Info & Architecture — Dynex MBS Intelligence

## Overview

AI-powered MBS portfolio intelligence platform for Dynex Capital. Fixed income analysts ask natural language questions about portfolio exposure, generate structured daily briefings, and submit them for CFO approval — all from a single interface or Mattermost via Kaji. 10-Q PDFs are parsed into structured pool tables via ExtractFlow. Every LLM call is traced in Arize Phoenix.

---

## Shakudo Deployment — Two Microservices

### dynex-mbs-api (FastAPI Backend)

| Field | Value |
|---|---|
| **Microservice Name** | `dynex-mbs-api` |
| **External URL** | https://dynex-mbs-api.dev.hyperplane.dev |
| **Internal URL** | `http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787` |
| **Port** | `8787` |
| **Environment** | `basic-ai-tools-small` |
| **Run Script** | `api/run.sh` |
| **Working Dir** | `/tmp/git/monorepo/dynex-mbs/api/` |
| **Branch** | `main` |
| **Status** | ✅ Running |

### dynex-mbs-ui (React Frontend)

| Field | Value |
|---|---|
| **Microservice Name** | `dynex-mbs-ui` |
| **External URL** | https://dynex-mbs-ui.dev.hyperplane.dev |
| **Internal URL** | `http://hyperplane-service-f08ded.hyperplane-pipelines.svc.cluster.local:8787` |
| **Port** | `8787` |
| **Environment** | `basic-ai-tools-small` |
| **Run Script** | `ui/run.sh` |
| **Working Dir** | `/tmp/git/monorepo/dynex-mbs/ui/` |
| **Branch** | `main` |
| **Status** | ✅ Running |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python + FastAPI |
| Frontend | React + Vite + Tailwind CSS |
| LLM | LiteLLM proxy → GPT-4o (mock in dev, Azure OpenAI on go-live) |
| PDF Extraction | ExtractFlow (Shakudo microservice) |
| Observability | Arize Phoenix (OpenTelemetry tracing) |
| Automation | n8n v2 (CFO briefing approval webhook) |

---

## Shakudo Platform Components Used

| Component | Status | External URL | Internal URL | Purpose |
|---|---|---|---|---|
| **dynex-mbs-api** (Microservice) | ✅ Running | https://dynex-mbs-api.dev.hyperplane.dev | `http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787` | Portfolio API, briefing engine, n8n callbacks |
| **dynex-mbs-ui** (Microservice) | ✅ Running | https://dynex-mbs-ui.dev.hyperplane.dev | `http://hyperplane-service-f08ded.hyperplane-pipelines.svc.cluster.local:8787` | React SPA — 4 pages |
| **LiteLLM** | ✅ Active | — | `http://litellm.hyperplane-litellm.svc.cluster.local:4000` | GPT-4o proxy (mock in dev) |
| **Arize Phoenix** | ✅ Active | https://arize-phoenix.dev.hyperplane.dev | `http://arize-phoenix.hyperplane-arize-phoenix.svc.cluster.local:6006` | LLM call tracing + audit |
| **n8n v2** | ✅ Active | https://n8n-v2.dev.hyperplane.dev | `http://n8n-v2.hyperplane-n8n-v2.svc.cluster.local` | CFO briefing approval webhook |
| **ExtractFlow** | ✅ Active | — | `http://hyperplane-service-95d29d.hyperplane-pipelines.svc.cluster.local:8787` | 10-Q PDF parsing |
| **Mattermost** | ✅ Active | https://mattermost.dev.hyperplane.dev | — | Kaji skill interface |

---

## External APIs

| API | Purpose | Auth | Go-Live |
|---|---|---|---|
| Azure OpenAI (via LiteLLM) | Portfolio exposure analysis, briefing generation | `OPENAI_API_KEY=shakudo` (dev mock) | Swap `OPENAI_BASE_URL` + `OPENAI_API_KEY` to Dynex Azure instance |

---

## Databases

| Database | Type | Location | Purpose |
|---|---|---|---|
| `dynex_portfolio_q1_2026.csv` | CSV (flat file) | `/tmp/git/monorepo/dynex-mbs/api/data/` | 20 mock MBS positions — CUSIP, pool type, face value, coupon, duration, OAS |
| `dynex_market_commentary.txt` | Text | `/tmp/git/monorepo/dynex-mbs/api/data/` | Market context injected into briefing generation prompt |
| Briefings store | In-memory dict | API process memory | Generated briefings keyed by `briefing_id` — resets on restart |

> **Note:** Portfolio data is loaded from CSV at startup. Briefings are ephemeral (in-memory). Restarting `dynex-mbs-api` reloads the CSV and clears all generated briefings.

---

## n8n Workflows

| Workflow | Trigger | Description |
|---|---|---|
| **Dynex MBS — Briefing Approval** | `POST /webhook/briefing-approval` | Receives briefing payload → waits 5s (simulates CFO review) → POST approval back to `/api/briefing/{id}/approved` |

### Webhook URL
```
POST https://n8n-v2.dev.hyperplane.dev/webhook/briefing-approval
```

### Workflow JSON
Stored at `n8n/dynex-briefing-approval-workflow.json` — import via n8n UI or API.

### Service-to-Service Auth
n8n calls `dynex-mbs-api` using the **internal cluster URL** to bypass Istio auth:
```
http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787
```

---

## API Endpoints (dynex-mbs-api)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health + model info |
| `GET` | `/api/portfolio` | All 20 MBS positions with metrics |
| `POST` | `/api/analyze-exposure` | NL question → ranked positions by risk + impact estimate |
| `POST` | `/api/generate-briefing` | Generate structured daily briefing from portfolio + commentary |
| `POST` | `/api/approve-briefing` | Submit briefing for CFO approval → fires n8n webhook |
| `GET` | `/api/briefing/{id}/status` | Briefing approval status |
| `POST` | `/api/extract-10q` | PDF file → structured MBS pool table (via ExtractFlow) |
| `GET` | `/api/audit-traces` | Arize Phoenix connection info + trace dashboard URL |

---

## Kaji Skill

| Field | Value |
|---|---|
| **Skill Name** | `dynex-mbs` |
| **Install Path** | `skill/SKILL.md` |
| **Client Repo** | `robert-shakudo/dynex-mbs-demo` |
| **Config Var** | `DYNEX_API_URL=http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787` |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Shakudo Platform                          │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │   dynex-mbs-ui  (React + Vite + Tailwind)                 │   │
│  │   https://dynex-mbs-ui.dev.hyperplane.dev                 │   │
│  │                                                           │   │
│  │   /              Portfolio Intelligence (NL query)        │   │
│  │   /briefing      Briefing View + CFO Submit               │   │
│  │   /extraction    10-Q PDF Upload + Table Output           │   │
│  │   /audit         Arize Phoenix iframe                     │   │
│  └───────────────────────┬───────────────────────────────────┘   │
│                          │ calls API                              │
│  ┌───────────────────────▼───────────────────────────────────┐   │
│  │   dynex-mbs-api  (FastAPI)                                │   │
│  │   https://dynex-mbs-api.dev.hyperplane.dev                │   │
│  │                                                           │   │
│  │   /api/portfolio          20 mock MBS positions (CSV)     │   │
│  │   /api/analyze-exposure   NL → ranked risk analysis       │   │
│  │   /api/generate-briefing  structured daily briefing       │   │
│  │   /api/approve-briefing   CFO submission → n8n webhook    │   │
│  │   /api/extract-10q        PDF → pool table (ExtractFlow)  │   │
│  │   /api/audit-traces       Arize Phoenix info              │   │
│  └──────────┬─────────────────┬──────────────────┬───────────┘   │
│             │                 │                  │               │
│  ┌──────────▼───┐   ┌─────────▼─────┐   ┌───────▼───────────┐   │
│  │  LiteLLM     │   │  n8n v2       │   │  ExtractFlow      │   │
│  │  GPT-4o proxy│   │  Briefing     │   │  10-Q PDF parser  │   │
│  │  (mock dev)  │   │  Approval WF  │   │                   │   │
│  └──────────────┘   └───────────────┘   └───────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │   Arize Phoenix  (https://arize-phoenix.dev.hyperplane.dev)│   │
│  │   Traces every LLM call via OpenTelemetry                 │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │   Mattermost + Kaji                                       │   │
│  │   skill: dynex-mbs                                        │   │
│  │   calls /api/* on dynex-mbs-api                           │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
             Azure OpenAI (go-live)
             Dynex Azure OpenAI instance
```

---

## Environment Variables

### dynex-mbs-api

| Variable | Required | Default (Dev) | Go-Live Value |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | `shakudo` (LiteLLM mock) | Dynex Azure OpenAI key |
| `OPENAI_BASE_URL` | No | LiteLLM internal URL | `https://[dynex-azure].openai.azure.com/` |
| `OPENAI_API_VERSION` | No | Not set | `2024-02-01` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | Arize Phoenix internal URL | Client's Arize Phoenix instance |
| `N8N_APPROVAL_WEBHOOK` | No | n8n v2 internal webhook URL | Same (or client's n8n) |
| `EXTRACTFLOW_URL` | No | ExtractFlow internal URL | Client's ExtractFlow instance |
| `PORTFOLIO_CSV_PATH` | No | `./data/dynex_portfolio_q1_2026.csv` | Path to real portfolio export |

### dynex-mbs-ui

| Variable | Required | Default (Dev) | Go-Live Value |
|---|---|---|---|
| `VITE_API_URL` | No | `https://dynex-mbs-api.dev.hyperplane.dev` | Client's API URL |

---

## Local Development

```bash
# API
cd api
pip install -r requirements.txt
OPENAI_API_KEY=test uvicorn main:app --reload --port 8787

# UI (separate terminal)
cd ui
npm install
VITE_API_URL=http://localhost:8787 npm run dev
```

Open http://localhost:5173 (Vite dev server) or http://localhost:8787 (if API serves static files).

---

## Start / Stop this POC on Shakudo

### Start (deploy fresh)
```
@kaji build and deploy the Dynex POC
```
Or via platform (2 services — deploy backend first):
```javascript
shakudo-platform_createMicroservice({ name: "dynex-mbs-api", gitServer: "demos", script: "dynex-mbs/api/run.sh", port: 8787 })
shakudo-platform_createMicroservice({ name: "dynex-mbs-ui",  gitServer: "demos", script: "dynex-mbs/ui/run.sh",  port: 8787 })
```

### Stop (scale to zero — config preserved)
```
@kaji stop the Dynex POC
```
Or via platform (stop both services):
```javascript
shakudo-platform_scaleService({ id: "dynex-mbs-api", newReplicas: 0 })
shakudo-platform_scaleService({ id: "dynex-mbs-ui",  newReplicas: 0 })
```

### Restart
```
@kaji restart the Dynex POC
```

### Status check
```javascript
shakudo-platform_searchMicroservice({ searchTerm: "dynex-mbs" })
```

**Internal URLs (from cluster):**
```
dynex-mbs-api: http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787
dynex-mbs-ui:  http://hyperplane-service-f08ded.hyperplane-pipelines.svc.cluster.local:8787
```
