import json
from typing import Dict, Any, List
import networkx as nx
from sqlalchemy.orm import Session
from app.models import Application, Document, ExtractedField, VerificationFinding, ComplianceRule

def build_claim_evidence_graph(db: Session, application_id: str) -> Dict[str, Any]:
    """
    Constructs a NetworkX Claim-Evidence Graph linking:
    Application -> Documents -> Extracted Claims/Fields -> Verification Rules -> Findings.
    Returns serializable nodes and edges with layout metadata.
    """
    G = nx.DiGraph()

    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        return {"nodes": [], "edges": []}

    # Root Node: Application
    app_node_id = f"app_{app.id}"
    G.add_node(
        app_node_id,
        label=f"Application: {app.application_number}",
        type="application",
        status=app.status,
        details={
            "institution_name": app.institution_name,
            "institution_id": app.institution_id,
            "academic_year": app.academic_year,
            "risk_score": app.risk_score
        }
    )

    docs = db.query(Document).filter(Document.application_id == application_id).all()
    fields = db.query(ExtractedField).filter(ExtractedField.application_id == application_id).all()
    findings = db.query(VerificationFinding).filter(VerificationFinding.application_id == application_id).all()

    # Document Nodes
    for doc in docs:
        doc_node_id = f"doc_{doc.id}"
        G.add_node(
            doc_node_id,
            label=doc.filename,
            type="document",
            status=doc.extraction_status,
            details={
                "document_type": doc.document_type,
                "is_duplicate": doc.is_duplicate,
                "extraction_method": doc.extraction_method,
                "sha256": doc.sha256_hash[:10] + "..."
            }
        )
        G.add_edge(app_node_id, doc_node_id, relationship="contains")

    # Claim/Field Nodes (Key claims)
    key_fields = ["approved_intake", "institution_name", "institution_id", "expiry_date", "course_programme"]
    for f in fields:
        if f.field_name in key_fields:
            val = f.corrected_value if f.is_corrected else f.normalized_value
            claim_node_id = f"claim_{f.id}"
            display_name = f.field_name.replace("_", " ").title()
            G.add_node(
                claim_node_id,
                label=f"{display_name}: {val}",
                type="claim",
                details={
                    "field_name": f.field_name,
                    "value": val,
                    "confidence": f.confidence,
                    "page": f.page_number,
                    "is_corrected": f.is_corrected
                }
            )
            doc_node_id = f"doc_{f.document_id}"
            if G.has_node(doc_node_id):
                G.add_edge(doc_node_id, claim_node_id, relationship="claims")

    # Finding Nodes & Rules
    for finding in findings:
        f_node_id = f"finding_{finding.id}"
        G.add_node(
            f_node_id,
            label=finding.title,
            type="finding",
            severity=finding.severity,
            status=finding.review_status,
            details={
                "rule_code": finding.rule_code,
                "description": finding.description,
                "review_status": finding.review_status
            }
        )
        G.add_edge(app_node_id, f_node_id, relationship="has_finding")

        # Link finding to involved document or claim nodes
        try:
            conflicts = json.loads(finding.conflicting_values_json or "{}")
            # If intake conflict, connect finding to related intake claims
            if finding.rule_code == "CR-INTAKE-002":
                for f in fields:
                    if f.field_name == "approved_intake":
                        claim_node_id = f"claim_{f.id}"
                        if G.has_node(claim_node_id):
                            G.add_edge(claim_node_id, f_node_id, relationship="contradicts")
            elif finding.rule_code == "CR-EXPIRY-004":
                for f in fields:
                    if f.field_name == "expiry_date":
                        claim_node_id = f"claim_{f.id}"
                        if G.has_node(claim_node_id):
                            G.add_edge(claim_node_id, f_node_id, relationship="violates")
        except Exception:
            pass

    # Convert graph to serializable format
    nodes_list = []
    for node_id, data in G.nodes(data=True):
        nodes_list.append({
            "id": node_id,
            "label": data.get("label", node_id),
            "type": data.get("type", "unknown"),
            "severity": data.get("severity"),
            "status": data.get("status"),
            "details": data.get("details", {})
        })

    edges_list = []
    for u, v, data in G.edges(data=True):
        edges_list.append({
            "source": u,
            "target": v,
            "relationship": data.get("relationship", "related_to")
        })

    return {
        "nodes": nodes_list,
        "edges": edges_list
    }
