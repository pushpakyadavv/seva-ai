"""Seed 60 realistic Indian soldiers + officers + commanders into Supabase.
Run:  python seed_data.py
"""
import os, random
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timedelta

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

RANKS = ["Sepoy", "Naik", "Havildar", "Naib Subedar", "Subedar", "Subedar Major"]
UNITS = ["UNIT-ALPHA", "UNIT-BRAVO", "UNIT-CHARLIE"]
FIRST_NAMES = [
    "Rahul","Amit","Vikram","Suresh","Manoj","Arjun","Prakash","Ravi","Deepak","Sanjay",
    "Rajesh","Kiran","Anil","Vijay","Rakesh","Sunil","Mahesh","Naresh","Ramesh","Ashok",
    "Karthik","Arun","Vignesh","Surya","Balaji","Gopal","Krishnan","Raman","Murugan","Sekar",
    "Harsh","Yogesh","Naveen","Tarun","Varun","Rohit","Manish","Gaurav","Akash","Nikhil",
    "Sameer","Imran","Faizan","Arif","Aditya","Siddharth","Kunal","Rishabh","Ankit","Vishal",
    "Pradeep","Sandeep","Vinod","Ajay","Sachin","Dinesh","Kishore","Senthil","Prasad","Karthikeyan"
]
LAST_NAMES = [
    "Sharma","Patel","Kumar","Singh","Verma","Reddy","Nair","Gupta","Yadav","Rao",
    "Pillai","Menon","Iyer","Chauhan","Joshi","Mishra","Tiwari","Das","Bose","Mehta",
    "Krishnan","Murthy","Naidu","Raju","Khan","Ahmed","Sheikh","Prasad","Bhat","Kulkarni"
]

def make_email(name, idx):
    return f"soldier{idx:02d}@army.in"

def create_user(email, password, meta):
    try:
        res = sb.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": meta
        })
        return res.user
    except Exception as e:
        print(f"  skip {email}: {e}")
        return None

def seed():
    print("🌱 Seeding Seva AI database...\n")

    officers = [
        {"email": "officer@army.in", "password": "Officer@123",
         "meta": {"full_name": "Sub. Maj. Verma", "role": "welfare_officer",
                  "service_number": "WO-1182", "rank": "Subedar Major"}},
    ]
    commanders = [
        {"email": "commander@army.in", "password": "Commander@123",
         "meta": {"full_name": "Col. Singh", "role": "commander",
                  "service_number": "CO-0412", "rank": "Colonel"}},
    ]

    for u in officers + commanders:
        print(f"👤 {u['email']}")
        create_user(u["email"], u["password"], u["meta"])

    sb.table("profiles").update({"unit_id": "UNIT-ALPHA"}).eq(
        "service_number", "CO-0412"
    ).execute()

    random.seed(42)
    soldiers_created = []

    for i in range(1, 61):
        fn = FIRST_NAMES[(i - 1) % len(FIRST_NAMES)]
        ln = LAST_NAMES[(i - 1) % len(LAST_NAMES)]
        full_name = f"{RANKS[i % len(RANKS)]}. {fn} {ln}"
        rank = RANKS[i % len(RANKS)]
        unit = UNITS[i % len(UNITS)]
        svc = f"AR-{23000 + i * 7:05d}-{chr(65 + (i % 26))}"
        email = make_email(fn, i)

        meta = {
            "full_name": full_name,
            "role": "personal",
            "service_number": svc,
            "rank": rank
        }
        u = create_user(email, "Soldier@123", meta)
        if u:
            soldiers_created.append({"id": u.id, "svc": svc, "unit": unit})
            print(f"  ✅ {i:02d}. {full_name} ({svc}) - {unit}")

    for s in soldiers_created:
        sb.table("profiles").update({"unit_id": s["unit"]}).eq("service_number", s["svc"]).execute()

    print(f"\n✅ Created {len(soldiers_created)} soldiers.\n")

    print("🩺 Seeding biometrics, reports, predictions...")
    for s in soldiers_created:
        try:
            token_row = sb.table("soldier_tokens").select("token").eq("soldier_id", s["id"]).single().execute()
            if not token_row.data: continue
            token = token_row.data["token"]

            for k in range(5):
                sb.table("biometrics").insert({
                    "soldier_token": token,
                    "heart_rate": random.randint(62, 105),
                    "hrv": random.randint(25, 75),
                    "sleep_hours": round(random.uniform(4.0, 8.5), 1),
                    "recorded_at": (datetime.utcnow() - timedelta(days=k)).isoformat()
                }).execute()

            for k in range(2):
                stress = random.randint(1, 10)
                sb.table("self_reports").insert({
                    "soldier_token": token,
                    "stress_level": stress,
                    "notes": f"Set {k+1} auto-seed",
                    "set_number": k + 1,
                    "total_score": stress
                }).execute()

                prob = min(0.99, max(0.01, (stress - 1) / 10 + random.uniform(-0.1, 0.1)))
                risk = "High" if prob > 0.6 else "Medium" if prob > 0.35 else "Low"
                sb.table("stress_predictions").insert({
                    "soldier_token": token,
                    "prediction_score": round(prob, 3),
                    "risk_level": risk
                }).execute()
        except Exception as e:
            print(f"  ⚠️  {s['svc']}: {e}")

    print("\n🎉 Seeding complete!")

if __name__ == "__main__":
    seed()