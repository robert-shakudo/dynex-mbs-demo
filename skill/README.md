# Dynex MBS Intelligence — Kaji Skill

## What This Skill Does

Adds a conversational interface to the Dynex MBS Intelligence platform directly inside Mattermost or any Kaji session. Query portfolio exposure, generate briefings, submit for CFO approval, and check briefing status — without opening the app.

## Installation via Kaji Skill Marketplace

1. Open the Shakudo platform → navigate to **Kaji → Skills Marketplace**
2. Search for **"Dynex MBS"**
3. Click **Install**
4. Set the required credentials when prompted (see below)

The skill will be active in all new Kaji sessions immediately.

## Manual Installation

If installing directly into a Kaji session:

1. Copy the contents of `SKILL.md` into your Kaji session as a skill definition, or place the file at:
   ```
   /.well-known/skills/dynex-mbs/SKILL.md
   ```

2. Set the environment credentials (see below)

3. Start or restart your Kaji session — the skill loads automatically

## Credentials

Configure these in your Kaji session or skill marketplace settings:

| Variable | Value | Notes |
|---|---|---|
| `DYNEX_API_URL` | `http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787` | Internal cluster URL — bypasses Istio auth |

> **Note:** If calling from outside the Shakudo cluster, use `https://dynex-mbs-api.dev.hyperplane.dev`. You will need an active Keycloak session.

## Usage

Once installed, talk to Kaji naturally in any thread:

```
@kaji which MBS positions are most exposed to duration extension risk?
@kaji generate today's briefing
@kaji submit for CFO approval
@kaji show my portfolio
@kaji what's the status of briefing a3f21b9c?
```

## Commands Reference

| What you say | What happens |
|---|---|
| `show portfolio` / `show positions` | Lists all 20 MBS positions with CUSIP, type, face, duration, OAS |
| `analyze exposure to [risk]` | Ranked exposure analysis with dollar impact per position |
| `generate briefing` / `generate today's briefing` | Generates structured daily briefing with themes and recommended actions |
| `submit for approval` / `submit it` | Submits last briefing to CFO (Mike Sartori) via n8n approval flow |
| `briefing status [id]` | Returns current approval status for a briefing |

## API Endpoints (for skill integrations)

```bash
# Set this for local testing
DYNEX_API_URL="http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787"

# Health check
curl "$DYNEX_API_URL/health"

# Portfolio positions
curl "$DYNEX_API_URL/api/portfolio"

# Exposure analysis
curl -X POST "$DYNEX_API_URL/api/analyze-exposure" \
  -H "Content-Type: application/json" \
  -d '{"query": "top 3 duration extension exposures"}'

# Generate briefing
curl -X POST "$DYNEX_API_URL/api/generate-briefing" \
  -H "Content-Type: application/json" -d '{}'

# Submit for CFO approval
curl -X POST "$DYNEX_API_URL/api/approve-briefing" \
  -H "Content-Type: application/json" \
  -d '{"briefing_id": "[id]", "approved": true, "comments": ""}'
```
