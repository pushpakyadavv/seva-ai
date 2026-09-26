"""Seva AI — FastAPI backend"""
from fastapi import FastAPI, HTTPException, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from supabase import create_client, Client
from dotenv import load_dotenv
import joblib, os, numpy as np, io, csv
from typing import List
from datetime import datetime

load_dotenv()

app = FastAPI(title="Seva AI Backend", version="2.4.1")

origins = os.getenv("FRONTEND_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

MODEL = joblib.load("stress_model.pkl")


# ---------- SCHEMAS ----------
class PredictInput(BaseModel):
    soldier_token: str
    leave_anomaly: float = 0.2
    career_index: float = 0.7
    hrv: int = 55
    heart_rate: int = 75
    sleep_hours: float = 7.0
    self_report: int = 5
    family_separation: int = 0
    grievance: int = 0

class BiometricInput(BaseModel):
    soldier_token: str
    heart_rate: int = Field(..., ge=30, le=200)
    hrv: int = Field(..., ge=10, le=150)
    sleep_hours: float = Field(..., ge=0, le=24)

class SelfReportInput(BaseModel):
    soldier_token: str
    stress_level: int = Field(..., ge=1, le=10)
    notes: str = ""

class SelfReportSet(BaseModel):
    soldier_token: str
    set_number: int = Field(..., ge=1, le=3)
    answers: List[int]
    notes: str = ""


# ---------- HELPERS ----------
def verify_token(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing auth token")
    jwt = authorization.replace("Bearer ", "")
    try:
        user_resp = supabase.auth.get_user(jwt)
        if not user_resp.user:
            raise HTTPException(401, "Invalid token")
        return user_resp.user
    except Exception as e:
        raise HTTPException(401, f"Auth failed: {e}")

def get_profile(user_id: str):
    r = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    if not r.data:
        raise HTTPException(403, "Profile not found")
    return r.data

def get_token_for_user(user_id: str):
    r = supabase.table("soldier_tokens").select("token").eq("soldier_id", user_id).single().execute()
    if not r.data:
        raise HTTPException(404, "Token not found for user")
    return r.data["token"]

def log_audit(actor_id, actor_role, action, target_token=None, meta=None):
    try:
        supabase.table("audit_log").insert({
            "actor_id": actor_id,
            "actor_role": actor_role,
            "action": action,
            "target_token": target_token,
            "metadata": meta or {}
        }).execute()
    except Exception:
        pass


# ---------- ROUTES ----------
@app.get("/")
def root():
    return {
        "service": "Seva AI",
        "version": "2.4.1",
        "status": "operational",
        "time": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/predict")
def predict(data: PredictInput, authorization: str = Header(None)):
    user = verify_token(authorization)
    features = np.array([[
        data.leave_anomaly, data.career_index, data.hrv, data.heart_rate,
        data.sleep_hours, data.self_report, data.family_separation, data.grievance
    ]])
    prob = float(MODEL.predict_proba(features)[0][1])
    risk = "High" if prob > 0.6 else "Medium" if prob > 0.35 else "Low"

    supabase.table("stress_predictions").insert({
        "soldier_token": data.soldier_token,
        "prediction_score": prob,
        "risk_level": risk
    }).execute()

    return {"risk_level": risk, "score": round(prob, 3)}

@app.post("/biometrics")
def add_biometrics(data: BiometricInput, authorization: str = Header(None)):
    user = verify_token(authorization)
    supabase.table("biometrics").insert({
        "soldier_token": data.soldier_token,
        "heart_rate": data.heart_rate,
        "hrv": data.hrv,
        "sleep_hours": data.sleep_hours
    }).execute()
    return {"status": "saved"}

@app.post("/self-report")
def add_self_report(data: SelfReportInput, authorization: str = Header(None)):
    user = verify_token(authorization)
    supabase.table("self_reports").insert({
        "soldier_token": data.soldier_token,
        "stress_level": data.stress_level,
        "notes": data.notes
    }).execute()

    latest_bio = supabase.table("biometrics").select("*").eq(
        "soldier_token", data.soldier_token
    ).order("recorded_at", desc=True).limit(1).execute()

    bio = latest_bio.data[0] if latest_bio.data else {}

    farr = np.array([[
        0.2, 0.7, bio.get("hrv", 55), bio.get("heart_rate", 75),
        bio.get("sleep_hours", 7.0), data.stress_level, 0, 0
    ]])
    prob = float(MODEL.predict_proba(farr)[0][1])
    risk = "High" if prob > 0.6 else "Medium" if prob > 0.35 else "Low"

    supabase.table("stress_predictions").insert({
        "soldier_token": data.soldier_token,
        "prediction_score": prob,
        "risk_level": risk
    }).execute()

    return {"status": "saved", "risk_level": risk, "score": round(prob, 3)}

@app.post("/self-report-set")
def self_report_set(data: SelfReportSet, authorization: str = Header(None)):
    user = verify_token(authorization)
    total = sum(data.answers) * 2
    stress_level = min(10, max(1, total // max(1, len(data.answers)) // 2))

    supabase.table("self_reports").insert({
        "soldier_token": data.soldier_token,
        "stress_level": stress_level,
        "notes": data.notes,
        "set_number": data.set_number,
        "answers": data.answers,
        "total_score": total
    }).execute()

    latest_bio = supabase.table("biometrics").select("*").eq(
        "soldier_token", data.soldier_token
    ).order("recorded_at", desc=True).limit(1).execute()
    bio = latest_bio.data[0] if latest_bio.data else {}

    feats = np.array([[
        0.2, 0.7, bio.get("hrv", 55), bio.get("heart_rate", 75),
        bio.get("sleep_hours", 7.0), stress_level, 0, 0
    ]])
    prob = float(MODEL.predict_proba(feats)[0][1])
    risk = "High" if prob > 0.6 else "Medium" if prob > 0.35 else "Low"

    supabase.table("stress_predictions").insert({
        "soldier_token": data.soldier_token,
        "prediction_score": prob,
        "risk_level": risk
    }).execute()

    return {"risk_level": risk, "score": round(prob, 3), "total_score": total}

@app.get("/personal/me")
def personal_me(authorization: str = Header(None)):
    user = verify_token(authorization)
    profile = get_profile(user.id)

    if profile["role"] != "personal":
        raise HTTPException(403, "This endpoint is for personal role only.")

    try:
        token = get_token_for_user(user.id)
    except HTTPException:
        return {"risk_level": "Unknown", "score": 0, "suggestion": "No data. Sync your device."}

    pred = supabase.table("stress_predictions").select("*").eq(
        "soldier_token", token
    ).order("created_at", desc=True).limit(1).execute()

    if not pred.data:
        return {"risk_level": "Unknown", "score": 0, "suggestion": "No assessments yet.", "token": token}

    p = pred.data[0]
    suggestions = {
        "High": "Priority: Consult the Welfare Officer within 24 hours. Your wellbeing is paramount.",
        "Medium": "Advisory: Practice breathing exercises, maintain 7–8 hrs rest, hydrate regularly.",
        "Low": "Status nominal. Maintain current routine and report any change."
    }

    log_audit(user.id, "personal", "view_personal", token)

    return {
        "risk_level": p["risk_level"],
        "score": p["prediction_score"],
        "suggestion": suggestions.get(p["risk_level"], "Maintain regular schedule."),
        "token": token,
        "updated_at": p["created_at"]
    }

@app.get("/officer/register")
def officer_register(authorization: str = Header(None)):
    user = verify_token(authorization)
    profile = get_profile(user.id)

    if profile["role"] != "welfare_officer":
        raise HTTPException(403, "Welfare Officer access required.")

    tokens = supabase.table("soldier_tokens").select(
        "token, profiles!soldier_id(full_name, service_number, rank, unit_id)"
    ).execute()

    results = []
    for row in tokens.data:
        token = row["token"]
        info = row.get("profiles") or {}

        pred = supabase.table("stress_predictions").select("*").eq(
            "soldier_token", token
        ).order("created_at", desc=True).limit(1).execute()

        results.append({
            "name": info.get("full_name", "Unknown"),
            "service_number": info.get("service_number", "—"),
            "rank": info.get("rank", "—"),
            "unit_id": info.get("unit_id", "—"),
            "token": token,
            "risk_level": pred.data[0]["risk_level"] if pred.data else "Unknown",
            "score": pred.data[0]["prediction_score"] if pred.data else 0,
            "updated_at": pred.data[0]["created_at"] if pred.data else None
        })

    log_audit(user.id, "welfare_officer", "view_register", None, {"count": len(results)})
    return results

@app.get("/commander/overview")
def commander_overview(authorization: str = Header(None)):
    user = verify_token(authorization)
    profile = get_profile(user.id)

    if profile["role"] != "commander":
        raise HTTPException(403, "Commander access required.")

    unit_id = profile.get("unit_id", "UNIT-ALPHA")

    r = supabase.rpc("unit_overview", {"p_unit_id": unit_id}).execute()
    log_audit(user.id, "commander", "view_overview", None, {"unit": unit_id})

    if not r.data:
        return {
            "unit_id": unit_id,
            "total_soldiers": 0, "high_risk": 0, "medium_risk": 0, "low_risk": 0,
            "avg_score": 0, "wellness_index": 0
        }

    row = r.data[0]
    return {
        "unit_id": unit_id,
        "total_soldiers": row.get("total_soldiers", 0),
        "high_risk": row.get("high_risk", 0),
        "medium_risk": row.get("medium_risk", 0),
        "low_risk": row.get("low_risk", 0),
        "avg_score": row.get("avg_score", 0),
        "wellness_index": row.get("wellness_index", 0)
    }

@app.post("/commander/import")
async def commander_import(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    user = verify_token(authorization)
    profile = get_profile(user.id)
    if profile["role"] != "commander":
        raise HTTPException(403, "Commander access required.")

    content = await file.read()
    text = content.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))

    inserted, skipped, errors = 0, 0, []

    for i, row in enumerate(reader, start=1):
        try:
            svc = (row.get("service_number") or "").strip()
            if not svc:
                skipped += 1
                continue

            r = supabase.rpc("token_for_service_no", {"p_svc": svc}).execute()
            if not r.data:
                errors.append({"row": i, "reason": f"service_number {svc} not found"})
                skipped += 1
                continue

            token = r.data

            if row.get("heart_rate") or row.get("hrv") or row.get("sleep_hours"):
                supabase.table("biometrics").insert({
                    "soldier_token": token,
                    "heart_rate": int(row["heart_rate"]) if row.get("heart_rate") else None,
                    "hrv": int(row["hrv"]) if row.get("hrv") else None,
                    "sleep_hours": float(row["sleep_hours"]) if row.get("sleep_hours") else None
                }).execute()

            if row.get("stress_level"):
                supabase.table("self_reports").insert({
                    "soldier_token": token,
                    "stress_level": int(row["stress_level"]),
                    "notes": row.get("notes", "Bulk import")
                }).execute()

                feats = np.array([[
                    0.2, 0.7, int(row.get("hrv", 55)), int(row.get("heart_rate", 75)),
                    float(row.get("sleep_hours", 7.0)), int(row["stress_level"]), 0, 0
                ]])
                prob = float(MODEL.predict_proba(feats)[0][1])
                risk = "High" if prob > 0.6 else "Medium" if prob > 0.35 else "Low"
                supabase.table("stress_predictions").insert({
                    "soldier_token": token,
                    "prediction_score": prob,
                    "risk_level": risk
                }).execute()

            inserted += 1
        except Exception as e:
            errors.append({"row": i, "reason": str(e)})
            skipped += 1

    supabase.table("import_log").insert({
        "actor_id": user.id,
        "filename": file.filename,
        "rows_inserted": inserted,
        "rows_skipped": skipped,
        "errors": errors[:20]
    }).execute()

    return {
        "filename": file.filename,
        "rows_inserted": inserted,
        "rows_skipped": skipped,
        "errors": errors[:20],
        "status": "success"
    }

@app.get("/officer/export")
def officer_export(format: str = "csv", authorization: str = Header(None)):
    user = verify_token(authorization)
    profile = get_profile(user.id)
    if profile["role"] not in ("welfare_officer", "commander"):
        raise HTTPException(403, "Access denied.")

    tokens = supabase.table("soldier_tokens").select(
        "token, profiles!soldier_id(full_name, service_number, rank, unit_id)"
    ).execute()

    rows = []
    for t in tokens.data:
        token = t["token"]
        info = t.get("profiles") or {}

        pred = supabase.table("stress_predictions").select("*").eq(
            "soldier_token", token
        ).order("created_at", desc=True).limit(1).execute()

        bio = supabase.table("biometrics").select("*").eq(
            "soldier_token", token
        ).order("recorded_at", desc=True).limit(1).execute()

        rep = supabase.table("self_reports").select("*").eq(
            "soldier_token", token
        ).order("reported_at", desc=True).limit(1).execute()

        rows.append({
            "service_number": info.get("service_number", ""),
            "name": info.get("full_name", ""),
            "rank": info.get("rank", ""),
            "unit": info.get("unit_id", ""),
            "risk_level": pred.data[0]["risk_level"] if pred.data else "Unknown",
            "score": round(pred.data[0]["prediction_score"], 3) if pred.data else 0,
            "last_heart_rate": bio.data[0]["heart_rate"] if bio.data else "",
            "last_hrv": bio.data[0]["hrv"] if bio.data else "",
            "last_sleep_hrs": bio.data[0]["sleep_hours"] if bio.data else "",
            "last_self_report": rep.data[0]["stress_level"] if rep.data else "",
            "last_updated": pred.data[0]["created_at"] if pred.data else ""
        })

    supabase.table("export_log").insert({
        "actor_id": user.id,
        "format": format,
        "scope": "full_register",
        "row_count": len(rows)
    }).execute()

    if format.lower() == "json":
        return rows

    if not rows:
        rows = [{"info": "no data"}]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)

    filename = f"seva_ai_register_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )