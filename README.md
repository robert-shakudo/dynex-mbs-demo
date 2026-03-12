# Dynex MBS Intelligence

An AI-powered MBS portfolio intelligence platform built on Shakudo. Fixed income analysts query portfolio exposure in plain English, generate structured daily briefings for CFO approval, and extract structured data from 10-Q filings — without opening Bloomberg, spreadsheets, or a separate PDF tool.

**ClickUp Spec:** https://app.clickup.com/t/86ag1jmra
**GitHub:** https://github.com/robert-shakudo/dynex-mbs-demo

---

## The Problem

Dynex Capital's fixed income team manages an MBS portfolio across FNMA, FHLMC, and GNMA pools. Daily portfolio review today requires an analyst to:

1. Pull position-level data from the portfolio management system
2. Calculate duration, OAS, and prepayment-adjusted exposures across pool types
3. Write a narrative briefing for the CFO — manually synthesizing data from multiple sources
4. Parse 10-Q filings to extract pool composition tables for quarterly comparison

**Time cost:** ~2 hours per analyst per day on routine synthesis work that generates no new insight.

---

## What This App Does

One interface — ask a natural language question, get a ranked exposure analysis. Click "Generate Briefing" for a full structured report. Submit to CFO in one click. Upload a 10-Q PDF and get the pool table as a structured CSV.

### POC Scenarios (Pre-Loaded)

| Question | What the App Returns |
|---|---|
| "What are my top 3 exposures to duration extension risk?" | 3 ranked FNMA 30Y pools with score, dollar impact, and reasoning |
| "Which positions are most affected by a rate hold?" | Ranked exposure analysis + key theme |
| "Generate today's briefing" | Full structured briefing — themes, actions, impacted CUSIPs |
| "Submit for CFO approval" | n8n approval webhook → 5s simulation → status: Approved |
| Upload FNMA Q4 2025 10-Q | Pool composition table extracted to CSV |

---

## KPIs and Bottom-Line Impact

| Metric | Before | With Shakudo |
|---|---|---|
| Daily briefing preparation | ~90 min/analyst | < 3 min |
| 10-Q pool extraction | 30–45 min manual | < 60 seconds |
| CFO approval cycle | Email thread, 2–4 hrs | 5 min in-app |
| LLM call audit coverage | None | 100% (Arize Phoenix) |

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
│  │   /           Portfolio Intelligence  (NL exposure query) │   │
│  │   /briefing   Briefing View + CFO Submit                  │   │
│  │   /extraction 10-Q PDF Upload + Table Output              │   │
│  │   /audit      Arize Phoenix trace dashboard               │   │
│  └───────────────────────┬───────────────────────────────────┘   │
│                          │                                        │
│  ┌───────────────────────▼───────────────────────────────────┐   │
│  │   dynex-mbs-api  (FastAPI)                                │   │
│  │   https://dynex-mbs-api.dev.hyperplane.dev                │   │
│  │                                                           │   │
│  │   /api/portfolio          20 MBS positions (CSV)          │   │
│  │   /api/analyze-exposure   NL → ranked risk + impact       │   │
│  │   /api/generate-briefing  LLM → structured daily brief    │   │
│  │   /api/approve-briefing   CFO submission → n8n webhook    │   │
│  │   /api/extract-10q        PDF → pool table (ExtractFlow)  │   │
│  └──────────┬──────────────────┬──────────────────┬──────────┘   │
│             │                  │                  │              │
│  ┌──────────▼──────┐  ┌────────▼──────┐  ┌───────▼──────────┐   │
│  │  LiteLLM        │  │  n8n v2       │  │  ExtractFlow     │   │
│  │  GPT-4o proxy   │  │  Briefing     │  │  10-Q PDF parser │   │
│  └─────────────────┘  └───────────────┘  └──────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │   Arize Phoenix   (all LLM calls traced via OpenTelemetry)│   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Live Services:**

| Component | URL | Tech |
|---|---|---|
| React UI | https://dynex-mbs-ui.dev.hyperplane.dev | Vite + React + Tailwind |
| FastAPI | https://dynex-mbs-api.dev.hyperplane.dev | Python + FastAPI |
| n8n | https://n8n-v2.dev.hyperplane.dev | n8n v2 |
| Arize Phoenix | https://arize-phoenix.dev.hyperplane.dev | OpenTelemetry tracing |

---

## How to Use the App

### POC Walk-through

1. Open **https://dynex-mbs-ui.dev.hyperplane.dev** (Shakudo platform login required)

2. **Portfolio Intelligence** — type any natural language question:
   - *"What are my top 3 exposures to duration extension risk?"*
   - Ranked results appear with CUSIP, pool type, face value, exposure score, dollar impact

3. **Generate Briefing** — click "Generate Full Briefing":
   - Structured daily brief: risk level, executive summary, key themes, recommended actions
   - Takes ~3–5 seconds

4. **Submit for CFO Approval** — click "Submit for CFO Approval":
   - Fires n8n approval webhook → Mike Sartori (CFO) notified
   - 5-second approval simulation → status updates to "Approved"

5. **10-Q Extraction** — navigate to `/extraction`:
   - Upload any FNMA, FHLMC, or GNMA 10-Q PDF → structured pool table in under 60 seconds

6. **Audit Trail** — navigate to `/audit`:
   - Arize Phoenix dashboard embedded — every LLM call logged

### API

```bash
# Health check
curl https://dynex-mbs-api.dev.hyperplane.dev/health

# List portfolio positions
curl https://dynex-mbs-api.dev.hyperplane.dev/api/portfolio

# Exposure analysis
curl -X POST https://dynex-mbs-api.dev.hyperplane.dev/api/analyze-exposure \
  -H "Content-Type: application/json" \
  -d '{"query": "what are my top 3 duration extension exposures?"}'

# Generate briefing
curl -X POST https://dynex-mbs-api.dev.hyperplane.dev/api/generate-briefing \
  -H "Content-Type: application/json" -d '{}'
```

---

## n8n Workflow — CFO Briefing Approval

**Workflow JSON:** `n8n/dynex-briefing-approval-workflow.json`
**Trigger:** `POST https://n8n-v2.dev.hyperplane.dev/webhook/briefing-approval`

```
Webhook → Respond immediately → Wait 5s → POST /api/briefing/{id}/approved
```

**To import:** n8n v2 → New Workflow → ⋮ → Import from file → Activate

---

## Environment Variables

### dynex-mbs-api
| Variable | Required | Default (Dev) | Go-Live |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | `shakudo` (LiteLLM mock) | Dynex Azure OpenAI key |
| `OPENAI_BASE_URL` | No | LiteLLM internal URL | `https://[dynex-azure].openai.azure.com/` |
| `OPENAI_API_VERSION` | No | Not set | `2024-02-01` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | Arize Phoenix internal URL | Client's Phoenix instance |
| `N8N_APPROVAL_WEBHOOK` | No | n8n v2 webhook URL | Same or client's n8n |
| `EXTRACTFLOW_URL` | No | ExtractFlow internal URL | Client's ExtractFlow |
| `PORTFOLIO_CSV_PATH` | No | `./data/dynex_portfolio_q1_2026.csv` | Path to live portfolio export |

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

---

## Kaji Skill

See [`skill/README.md`](skill/README.md) for the Kaji skill — query exposure, generate briefings, and submit for approval directly from a Mattermost thread.
