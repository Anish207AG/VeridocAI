import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine, Base, SessionLocal
from app.models import Reviewer, Application
from app.services.rules_engine import seed_default_rules
from app.services.sample_generator import generate_all_sample_pdfs
from app.services.audit_service import log_audit_event
from app.routers.demo import SCENARIOS, load_single_scenario

def run_seed():
    print("Initialising VeriDoc AI database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Reviewer
        reviewer = db.query(Reviewer).first()
        if not reviewer:
            r = Reviewer(
                name="Ananya Sharma",
                email="ananya.sharma@veridoc.local",
                role="Senior Institutional Compliance Officer"
            )
            db.add(r)
            db.commit()
            print("Default reviewer created.")

        # 2. Rules
        seed_default_rules(db)
        print("Default compliance rules verified.")

        # 3. Sample PDFs
        print("Generating realistic synthetic demonstration PDFs in sample_data/...")
        generate_all_sample_pdfs()
        print("Sample PDFs generated.")

        # 4. Demo Scenarios
        if db.query(Application).count() == 0:
            print("Loading initial demonstration scenarios A through E...")
            for sc_key in SCENARIOS:
                print(f"  -> Loading {sc_key}...")
                load_single_scenario(db, sc_key)

            log_audit_event(
                db=db,
                event_type="database_seeded",
                actor="System Boot Script",
                details={"status": "Seeded initial demonstration records"}
            )
            print("Demonstration scenarios successfully loaded.")
        else:
            print("Database already contains records. Preserving existing data.")

    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
    print("VeriDoc AI database ready.")
