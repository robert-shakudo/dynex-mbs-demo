# Dynex MBS Intelligence

Dynex Capital POC — MBS portfolio intelligence platform.

**Live URLs:**
- Frontend: https://dynex-mbs-ui.dev.hyperplane.dev
- Backend: https://dynex-mbs-api.dev.hyperplane.dev

**ClickUp Spec:** https://app.clickup.com/t/86ag1jmra

## Services

| Service | Script | Port |
|---|---|---|
| FastAPI backend | `api/run.sh` | 8787 |
| React frontend | `ui/run.sh` | 8787 |

## Features

- Portfolio exposure analysis (natural language → ranked positions)
- Daily briefing generation + CFO approval workflow
- 10-Q PDF extraction via ExtractFlow
- AI audit trail via Arize Phoenix

## Env Vars (Dev)

```bash
OPENAI_BASE_URL=http://litellm.hyperplane-litellm.svc.cluster.local:4000
OPENAI_API_KEY=shakudo
PHOENIX_ENDPOINT=http://arize-phoenix.hyperplane-arize-phoenix.svc.cluster.local:6006/v1/traces
N8N_APPROVAL_WEBHOOK=http://n8n.hyperplane-n8n.svc.cluster.local:5678/webhook/briefing-approval
EXTRACTFLOW_URL=http://hyperplane-service-95d29d.hyperplane-pipelines.svc.cluster.local:8787
PORTFOLIO_CSV_PATH=/app/data/dynex_portfolio_q1_2026.csv
```
