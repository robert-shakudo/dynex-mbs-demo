"""Dynex MBS Intelligence — FastAPI Backend"""

import csv
import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

# ── Config ──────────────────────────────────────────────────────────────────
OPENAI_BASE_URL = os.getenv(
    "OPENAI_BASE_URL", "http://litellm.hyperplane-litellm.svc.cluster.local:4000"
)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "shakudo")
MODEL = os.getenv("LLM_MODEL", "gpt-4o")
PHOENIX_ENDPOINT = os.getenv(
    "PHOENIX_ENDPOINT",
    "http://arize-phoenix.hyperplane-arize-phoenix.svc.cluster.local:6006/v1/traces",
)
N8N_APPROVAL_WEBHOOK = os.getenv(
    "N8N_APPROVAL_WEBHOOK",
    "http://n8n.hyperplane-n8n.svc.cluster.local:5678/webhook/briefing-approval",
)
EXTRACTFLOW_URL = os.getenv(
    "EXTRACTFLOW_URL",
    "http://hyperplane-service-95d29d.hyperplane-pipelines.svc.cluster.local:8787",
)
PORTFOLIO_CSV_PATH = os.getenv(
    "PORTFOLIO_CSV_PATH",
    str(Path(__file__).parent / "data" / "dynex_portfolio_q1_2026.csv"),
)
COMMENTARY_PATH = str(Path(__file__).parent / "data" / "dynex_market_commentary.txt")
ARIZE_PHOENIX_URL = "https://arize-phoenix.dev.hyperplane.dev"

# ── Arize Phoenix instrumentation ───────────────────────────────────────────
try:
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    from openinference.instrumentation.openai import OpenAIInstrumentor

    provider = TracerProvider()
    exporter = OTLPSpanExporter(endpoint=PHOENIX_ENDPOINT)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    OpenAIInstrumentor().instrument()
    PHOENIX_ACTIVE = True
except Exception:
    PHOENIX_ACTIVE = False

# ── OpenAI client ────────────────────────────────────────────────────────────
client = OpenAI(base_url=OPENAI_BASE_URL, api_key=OPENAI_API_KEY)

# ── In-memory briefing store ─────────────────────────────────────────────────
briefings: dict[str, dict[str, Any]] = {}

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Dynex MBS Intelligence API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def load_portfolio() -> list[dict[str, Any]]:
    with open(PORTFOLIO_CSV_PATH, newline="") as f:
        return list(csv.DictReader(f))


def load_commentary() -> str:
    with open(COMMENTARY_PATH) as f:
        return f.read()


def llm(system: str, user: str, max_tokens: int = 1500) -> str:
    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        return f"[LLM unavailable — mock response] Error: {e}"


# ── Models ────────────────────────────────────────────────────────────────────
class AnalyzeExposureRequest(BaseModel):
    query: str
    portfolio_path: str | None = None


class GenerateBriefingRequest(BaseModel):
    market_commentary: str | None = None
    portfolio_path: str | None = None


class ApproveBriefingRequest(BaseModel):
    briefing_id: str
    approved: bool
    comments: str = ""


class BriefingStatusUpdate(BaseModel):
    briefing_id: str
    approved: bool
    approver_name: str = "CFO"


# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "phoenix_active": PHOENIX_ACTIVE, "model": MODEL}


@app.get("/api/portfolio")
def get_portfolio():
    positions = load_portfolio()
    return {
        "positions": positions,
        "count": len(positions),
        "as_of": "Q1 2026",
        "total_face_value": sum(float(p["Face_Value"]) for p in positions),
    }


@app.post("/api/analyze-exposure")
def analyze_exposure(req: AnalyzeExposureRequest):
    portfolio = load_portfolio()
    commentary = load_commentary()

    portfolio_summary = "\n".join(
        f"CUSIP: {p['CUSIP']} | Type: {p['Pool_Type']} | Face: ${int(float(p['Face_Value'])):,} | "
        f"Coupon: {p['Coupon']}% | WAC: {p['WAC']}% | WAM: {p['WAM']}mo | "
        f"Price: {p['Price']} | OAS: {p['OAS']}bps | Duration: {p['Duration']}yr | Issuer: {p['Issuer']}"
        for p in portfolio
    )

    system = (
        "You are a senior MBS analyst at Dynex Capital. Analyze portfolio exposure based on the "
        "analyst's query, cross-referencing positions with current market conditions. "
        "Return a JSON object with: ranked_positions (array of {cusip, pool_type, face_value, "
        "exposure_score (0-100), impact_estimate (dollar), reasoning}), "
        "summary (string), total_at_risk (number), key_theme (string). "
        "Be specific with numbers. Format impact_estimate as negative dollar amounts for losses."
    )
    user = (
        f"Query: {req.query}\n\n"
        f"Portfolio:\n{portfolio_summary}\n\n"
        f"Market Commentary:\n{commentary[:2000]}"
    )

    raw = llm(system, user, max_tokens=2000)

    # Try to parse JSON from response
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
    except Exception:
        # Fallback: construct mock analysis
        top_positions = sorted(
            portfolio,
            key=lambda p: float(p["Duration"]) * float(p["Face_Value"]),
            reverse=True,
        )[:5]
        result = {
            "ranked_positions": [
                {
                    "cusip": p["CUSIP"],
                    "pool_type": p["Pool_Type"],
                    "face_value": float(p["Face_Value"]),
                    "exposure_score": min(95, int(float(p["Duration"]) * 12)),
                    "impact_estimate": -round(float(p["Face_Value"]) * 0.025, 0),
                    "reasoning": (
                        f"{p['Pool_Type']} pool with {p['Duration']}yr duration. "
                        f"At 200 PSA, extension risk increases mark-to-market by ~2.5%."
                    ),
                }
                for p in top_positions
            ],
            "summary": raw[:500]
            if raw
            else "Duration extension risk concentrated in FNMA 30Y positions.",
            "total_at_risk": sum(float(p["Face_Value"]) * 0.025 for p in top_positions),
            "key_theme": "Duration extension risk from rate-hold environment",
        }

    return result


@app.post("/api/generate-briefing")
def generate_briefing(req: GenerateBriefingRequest):
    portfolio = load_portfolio()
    commentary = req.market_commentary or load_commentary()

    portfolio_summary = "\n".join(
        f"- {p['CUSIP']} ({p['Pool_Type']}, ${int(float(p['Face_Value'])):,}, {p['Duration']}yr duration, OAS {p['OAS']}bps)"
        for p in portfolio
    )

    system = (
        "You are a senior MBS analyst drafting the daily briefing for Dynex Capital's investment committee. "
        "Return a JSON object with: themes (array of strings, 3-5 key market themes), "
        "impact_summary (string, 2-3 sentences on portfolio impact), "
        "recommended_actions (array of {action, rationale, urgency: high/medium/low}), "
        "positions_affected (array of CUSIPs most impacted), "
        "executive_summary (string, 1 paragraph suitable for CFO), "
        "risk_level (overall: high/medium/low). "
        "Be specific, professional, and investment-committee ready."
    )
    user = (
        f"Market Commentary:\n{commentary[:3000]}\n\n"
        f"Portfolio Positions:\n{portfolio_summary}"
    )

    raw = llm(system, user, max_tokens=2500)

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        briefing_data = json.loads(raw[start:end])
    except Exception:
        briefing_data = {
            "themes": [
                "Fed holds at 5.25-5.50% — rate-sensitive positions remain under pressure",
                "Agency MBS spreads widened 8bps — OAS compensation improving but vol elevated",
                "Prepayment speeds 10%+ above consensus — premium pools exposed to negative convexity",
                "Duration extension risk in FNMA 30Y cohort — 6.8yr vs 6.2yr target",
                "MOVE index at 115 — elevated rate vol sustaining basis widening",
            ],
            "impact_summary": (
                "Portfolio duration has extended approximately 0.6yr beyond target on FNMA 30Y positions "
                "given the rate-hold environment and above-consensus prepayment speeds. "
                "OAS widening of 8bps translates to approximately $2.1M mark-to-market reduction on the "
                "agency portfolio. GNMA positions are showing better relative value on a risk-adjusted basis."
            ),
            "recommended_actions": [
                {
                    "action": "Reduce FNMA 30Y allocation in $40M+ face pools (31381SDB5, 31381KQM7)",
                    "rationale": "Highest duration extension exposure; OAS at 32-35bps provides insufficient compensation at current vol",
                    "urgency": "high",
                },
                {
                    "action": "Increase FHLMC 15Y allocation — better duration profile at 4.0-4.6yr",
                    "rationale": "15Y pools show lower negative convexity and tighter spread compression risk",
                    "urgency": "medium",
                },
                {
                    "action": "Monitor ARM positions (31416FVX2, 31416GWY3) for reset-date extension",
                    "rationale": "ARM-to-fixed conversion risk elevated if 30yr rates stay above 7%",
                    "urgency": "medium",
                },
            ],
            "positions_affected": [
                "31381SDB5",
                "31381KQM7",
                "31381AAR3",
                "36179NQB8",
                "31416FVX2",
            ],
            "executive_summary": (
                "Current market conditions — Fed hold, above-consensus prepayment speeds, and elevated rate "
                "volatility — are creating measurable duration extension and spread widening across our FNMA "
                "30Y positions. The portfolio's mark-to-market impact is approximately -$2.1M this week. "
                "We recommend reducing concentration in premium-priced FNMA 30Y pools and rotating into "
                "shorter-duration FHLMC 15Y paper where the risk-adjusted spread is more attractive."
            ),
            "risk_level": "medium",
        }

    briefing_id = str(uuid.uuid4())[:8]
    briefing_data["briefing_id"] = briefing_id
    briefing_data["status"] = "pending_approval"
    briefing_data["created_at"] = datetime.now(timezone.utc).isoformat()
    briefing_data["analyst"] = "Capital Markets Team"
    briefings[briefing_id] = briefing_data

    return briefing_data


@app.post("/api/approve-briefing")
def approve_briefing(req: ApproveBriefingRequest):
    if req.briefing_id not in briefings:
        # Allow any ID for demo
        briefings[req.briefing_id] = {"status": "pending_approval"}

    briefings[req.briefing_id]["status"] = "submitted_for_approval"
    briefings[req.briefing_id]["submitted_at"] = datetime.now(timezone.utc).isoformat()

    # Fire n8n webhook (non-blocking)
    try:
        payload = {
            "briefing_id": req.briefing_id,
            "status": "submitted",
            "analyst_name": "Capital Markets Analyst",
            "briefing_summary": briefings[req.briefing_id].get(
                "executive_summary", "MBS briefing submitted for approval"
            ),
            "approved": req.approved,
            "comments": req.comments,
        }
        httpx.post(N8N_APPROVAL_WEBHOOK, json=payload, timeout=3.0)
    except Exception:
        pass  # Webhook failure is non-blocking for demo

    return {
        "briefing_id": req.briefing_id,
        "status": "submitted_for_approval",
        "message": "Briefing submitted to CFO for approval. You will be notified when reviewed.",
        "submitted_at": briefings[req.briefing_id]["submitted_at"],
    }


@app.post("/api/briefing-status")
def update_briefing_status(update: BriefingStatusUpdate):
    """Called by n8n webhook after CFO approves/rejects."""
    if update.briefing_id not in briefings:
        briefings[update.briefing_id] = {}

    briefings[update.briefing_id]["status"] = (
        "approved" if update.approved else "rejected"
    )
    briefings[update.briefing_id]["approver"] = update.approver_name
    briefings[update.briefing_id]["reviewed_at"] = datetime.now(
        timezone.utc
    ).isoformat()

    return {
        "ok": True,
        "briefing_id": update.briefing_id,
        "status": briefings[update.briefing_id]["status"],
    }


@app.get("/api/briefing/{briefing_id}/status")
def get_briefing_status(briefing_id: str):
    if briefing_id not in briefings:
        return {"briefing_id": briefing_id, "status": "not_found"}
    return {
        "briefing_id": briefing_id,
        "status": briefings[briefing_id].get("status", "unknown"),
        "approver": briefings[briefing_id].get("approver"),
        "reviewed_at": briefings[briefing_id].get("reviewed_at"),
    }


@app.post("/api/extract-10q")
async def extract_10q(file: UploadFile | None = None, file_url: str | None = None):
    """Proxy to ExtractFlow for MBS pool data extraction."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as hclient:
            if file:
                content = await file.read()
                resp = await hclient.post(
                    f"{EXTRACTFLOW_URL}/extract",
                    files={"file": (file.filename, content, "application/pdf")},
                    data={
                        "schema": json.dumps(
                            {
                                "schema_name": "mbs_pool_data",
                                "fields": [
                                    {"name": "Pool_Number", "type": "string"},
                                    {"name": "Issuer", "type": "string"},
                                    {"name": "Face_Value", "type": "number"},
                                    {"name": "Coupon", "type": "number"},
                                    {"name": "WAC", "type": "number"},
                                    {"name": "WAM", "type": "integer"},
                                    {"name": "Prepayment_Speed_CPR", "type": "number"},
                                    {"name": "Credit_Enhancement", "type": "string"},
                                ],
                            }
                        )
                    },
                )
                return resp.json()
            elif file_url:
                resp = await hclient.post(
                    f"{EXTRACTFLOW_URL}/extract-url",
                    json={"url": file_url, "schema_name": "mbs_pool_data"},
                )
                return resp.json()
    except Exception:
        pass

    # Mock response for demo
    return {
        "schema_name": "mbs_pool_data",
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "source": "FNMA 10-Q Q4 2025 — Single-Family Guaranty Business",
        "records": [
            {
                "Pool_Number": "MA4521",
                "Issuer": "FNMA",
                "Face_Value": 2340000000,
                "Coupon": 6.5,
                "WAC": 7.12,
                "WAM": 287,
                "Prepayment_Speed_CPR": 8.2,
                "Credit_Enhancement": "Government guarantee",
            },
            {
                "Pool_Number": "MA4519",
                "Issuer": "FNMA",
                "Face_Value": 1890000000,
                "Coupon": 6.25,
                "WAC": 6.89,
                "WAM": 295,
                "Prepayment_Speed_CPR": 7.8,
                "Credit_Enhancement": "Government guarantee",
            },
            {
                "Pool_Number": "MA4515",
                "Issuer": "FNMA",
                "Face_Value": 3120000000,
                "Coupon": 7.00,
                "WAC": 7.58,
                "WAM": 271,
                "Prepayment_Speed_CPR": 9.1,
                "Credit_Enhancement": "Government guarantee",
            },
            {
                "Pool_Number": "MA4508",
                "Issuer": "FNMA",
                "Face_Value": 980000000,
                "Coupon": 5.50,
                "WAC": 6.18,
                "WAM": 312,
                "Prepayment_Speed_CPR": 5.4,
                "Credit_Enhancement": "Government guarantee",
            },
            {
                "Pool_Number": "MA4502",
                "Issuer": "FNMA",
                "Face_Value": 2670000000,
                "Coupon": 6.75,
                "WAC": 7.35,
                "WAM": 279,
                "Prepayment_Speed_CPR": 8.8,
                "Credit_Enhancement": "Government guarantee",
            },
            {
                "Pool_Number": "MA4498",
                "Issuer": "FNMA",
                "Face_Value": 1450000000,
                "Coupon": 6.00,
                "WAC": 6.65,
                "WAM": 302,
                "Prepayment_Speed_CPR": 6.9,
                "Credit_Enhancement": "Government guarantee",
            },
            {
                "Pool_Number": "MA4491",
                "Issuer": "FNMA",
                "Face_Value": 4200000000,
                "Coupon": 7.25,
                "WAC": 7.82,
                "WAM": 263,
                "Prepayment_Speed_CPR": 10.2,
                "Credit_Enhancement": "Government guarantee",
            },
            {
                "Pool_Number": "MA4487",
                "Issuer": "FNMA",
                "Face_Value": 1750000000,
                "Coupon": 5.75,
                "WAC": 6.32,
                "WAM": 308,
                "Prepayment_Speed_CPR": 6.1,
                "Credit_Enhancement": "Government guarantee",
            },
        ],
        "total_pools": 8,
        "total_face_value": 18400000000,
        "extraction_method": "ExtractFlow AI schema extraction",
        "note": "Demo extraction from FNMA Q4 2025 10-Q filing. Real extraction requires live ExtractFlow connection.",
    }


@app.get("/api/audit-traces")
def audit_traces():
    return {
        "phoenix_url": ARIZE_PHOENIX_URL,
        "phoenix_active": PHOENIX_ACTIVE,
        "dashboard_url": f"{ARIZE_PHOENIX_URL}/projects",
        "note": "All LLM calls instrumented with OpenInference/OpenTelemetry",
    }
