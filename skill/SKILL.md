---
name: dynex-mbs
description: "Dynex Capital MBS Intelligence — query portfolio exposure, generate daily briefings, and submit for CFO approval directly from Mattermost."
compatibility: opencode
metadata:
  author: robert-shakudo
  version: "1.0"
  category: capital-markets
  tags:
    - dynex
    - mbs
    - portfolio
    - briefing
    - capital-markets
---

# Dynex MBS Intelligence Skill

Mattermost-native interface to the Dynex MBS Intelligence app. Same backend, second interface.

**API URL:** `http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787`
**App URL:** https://dynex-mbs-ui.dev.hyperplane.dev

---

## Trigger Phrases

- `@kaji which of our positions are most exposed to [risk]`
- `@kaji analyze our MBS portfolio`
- `@kaji generate the daily briefing`
- `@kaji yes generate it` / `@kaji generate briefing`
- `@kaji submit for approval` / `@kaji submit it`
- `@kaji show portfolio` / `@kaji show positions`
- `@kaji briefing status [id]`

---

## Tool: analyze_portfolio_exposure

**Trigger:** Any question about portfolio risk, exposure, duration, OAS, prepayment speeds.

**Call:** `POST /api/analyze-exposure`
```json
{ "query": "<analyst's natural language question>" }
```

**Response format:**
```
📊 **Portfolio Exposure Analysis**

**Key Theme:** [key_theme]

**Top Positions by Risk:**
1. `[CUSIP]` — [Pool_Type], $[face]M face | Score: [score]/100 | Est. impact: [impact]
   [reasoning]
2. ...

**Total at risk:** $[total_at_risk]M
Want me to generate the full briefing?
```

---

## Tool: generate_briefing

**Trigger:** "generate briefing", "yes generate it", "full briefing"

**Call:** `POST /api/generate-briefing`
```json
{}
```

**Response format:**
```
📄 **Dynex MBS Daily Briefing** · ID: [briefing_id]
**Risk Level:** [HIGH/MEDIUM/LOW]

**Executive Summary**
[executive_summary]

**Key Themes**
1. [theme 1]
2. [theme 2]
...

**Recommended Actions**
🔴 [HIGH] [action] — [rationale]
🟡 [MEDIUM] [action] — [rationale]

**Positions Affected:** [CUSIP1], [CUSIP2], ...

_Submit for CFO approval? Reply "submit for approval"_
```

Store `briefing_id` in context for the submit step.

---

## Tool: submit_for_approval

**Trigger:** "submit for approval", "submit it", "send to CFO"

**Call:** `POST /api/approve-briefing`
```json
{ "briefing_id": "<id from previous generate step>", "approved": true, "comments": "" }
```

**Response format:**
```
✅ Briefing [id] submitted to Mike Sartori (CFO) for approval.
You'll be notified when reviewed. CFO approval typically takes 5 minutes.
```

---

## Tool: show_portfolio

**Trigger:** "show portfolio", "show positions", "what positions do we hold"

**Call:** `GET /api/portfolio`

**Response format:**
```
📈 **Dynex Portfolio — Q1 2026** · [count] positions · $[total]M total face

| CUSIP | Type | Face | Coupon | Duration | OAS |
|---|---|---|---|---|---|
| [CUSIP] | [type] | $[face]M | [coupon]% | [dur]yr | [oas]bps |
...
```

---

## Tool: briefing_status

**Trigger:** "briefing status [id]", "has the briefing been approved"

**Call:** `GET /api/briefing/[id]/status`

**Response format:**
```
📋 Briefing [id]: [STATUS]
Approver: [approver_name]
Reviewed: [reviewed_at]
```

---

## Example Conversation

```
User: @kaji which of our positions are most exposed to duration extension risk this week?

Kaji: [calls analyze_portfolio_exposure]
📊 Portfolio Exposure Analysis
Key Theme: Duration extension risk from rate-hold environment

Top Positions by Risk:
1. 31381SDB5 — FNMA_30Y, $45M face | Score: 82/100 | Est. impact: -$1.2M
   FNMA 30Y pool with 6.8yr duration...
Want me to generate the full briefing?

User: yes generate it

Kaji: [calls generate_briefing]
📄 Dynex MBS Daily Briefing · ID: a3f21b9c
...

User: submit for approval

Kaji: [calls submit_for_approval with stored briefing_id]
✅ Briefing a3f21b9c submitted to Mike Sartori (CFO) for approval.
```

---

## Error Handling

- If API returns 500: `"I'm having trouble reaching the MBS Intelligence API. Try again in a moment."`
- If no briefing_id in context when submitting: `"Which briefing would you like to submit? Please run 'generate briefing' first."`
- If briefing status is `not_found`: `"Briefing [id] not found. Generate a new one with 'generate briefing'."`
