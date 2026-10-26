import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import APP_NAME, APP_DESCRIPTION, VERSION, UPLOADS_DIR, DATA_DIR, REPORTS_DIR, SAMPLE_DATA_DIR
from app.database import engine, Base, SessionLocal
from app.models import Application, Reviewer
from app.services.rules_engine import seed_default_rules
from app.services.sample_generator import generate_all_sample_pdfs
from app.services.audit_service import log_audit_event
from app.routers.demo import SCENARIOS, load_single_scenario

# Import Routers
from app.routers.health import router as health_router
from app.routers.applications import router as applications_router
from app.routers.documents import router as documents_router
from app.routers.fields import router as fields_router
from app.routers.verification import router as verification_router
from app.routers.graph import router as graph_router
from app.routers.review_queue import router as review_queue_router
from app.routers.rules import router as rules_router
from app.routers.audit import router as audit_router
from app.routers.reports import router as reports_router
from app.routers.demo import router as demo_router

app = FastAPI(
    title=APP_NAME,
    description=APP_DESCRIPTION,
    version=VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all localhost ports e.g. 5173, 3000, etc.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router)
app.include_router(applications_router)
app.include_router(documents_router)
app.include_router(fields_router)
app.include_router(verification_router)
app.include_router(graph_router)
app.include_router(review_queue_router)
app.include_router(rules_router)
app.include_router(audit_router)
app.include_router(reports_router)
app.include_router(demo_router)

@app.on_event("startup")
def on_startup():
    """Initializes tables, seeds initial reviewer, rules, and demo data on fresh setup."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default reviewer
        reviewer = db.query(Reviewer).first()
        if not reviewer:
            r = Reviewer(
                name="Ananya Sharma",
                email="ananya.sharma@veridoc.local",
                role="Senior Institutional Compliance Officer"
            )
            db.add(r)
            db.commit()

        # Seed default compliance rules
        seed_default_rules(db)

        # Generate sample PDFs
        generate_all_sample_pdfs()

        # Check if database has applications; if fresh, seed demo scenarios A through E
        existing_count = db.query(Application).count()
        if existing_count == 0:
            for sc_key in SCENARIOS:
                try:
                    load_single_scenario(db, sc_key)
                except Exception as ex:
                    print(f"Error seeding {sc_key}: {ex}")

            log_audit_event(
                db=db,
                event_type="system_initialized",
                actor="System Boot",
                details={"status": "Database initialized and initial demo scenarios loaded."}
            )
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "app": APP_NAME,
        "description": APP_DESCRIPTION,
        "version": VERSION,
        "api_docs": "/docs",
        "health_check": "/api/health"
    }
