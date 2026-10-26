from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import GraphData
from app.services.graph_service import build_claim_evidence_graph

router = APIRouter(prefix="/api/graph", tags=["Claim-Evidence Graph"])

@router.get("/{application_id}", response_model=GraphData)
def get_graph(application_id: str, db: Session = Depends(get_db)):
    """
    Returns NetworkX Claim–Evidence Graph data (nodes and edges)
    linking applications, documents, claims, rules, and verification findings.
    """
    graph_data = build_claim_evidence_graph(db, application_id)
    return graph_data
