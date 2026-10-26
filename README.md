# VeriDoc AI — Intelligent Document Verification and Compliance Platform

**VeriDoc AI** is an enterprise-grade institutional document verification and compliance support platform. It assists human reviewers in evaluating educational and regulatory filings (approval letters, university affiliation certificates, building safety clearances, land ownership affidavits) through automated optical extraction, cross-document reconciliation, configurable compliance rules, evidence-linked highlighting, cryptographic audit chains, and downloadable PDF reports.

> **CRITICAL HUMAN-IN-THE-LOOP NOTICE**: VeriDoc AI is engineered as an intelligent preliminary verification assistant. It performs cryptographic hashing, field extraction, and cross-document integrity checks to highlight potential discrepancies for human decision-makers. It strictly avoids declaring a filing fraudulent or officially approved based solely on automated evaluations.

---

## Architecture Overview

```
veridoc-ai/
├── frontend/             # React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, PDF.js
│   ├── src/
│   │   ├── api/          # Typed API client with proxy to http://localhost:8000
│   │   ├── components/   # Header, Sidebar, PdfViewer (canvas+bbox), EvidenceGraph (SVG), Modals
│   │   ├── pages/        # 14 complete functional application pages
│   │   └── types/        # TypeScript schema definitions
├── backend/              # Python FastAPI & SQLite
│   ├── app/
│   │   ├── main.py       # FastAPI application, CORS, router mounts
│   │   ├── models.py     # SQLAlchemy ORM models (Applications, Documents, Claims, Rules, Audit)
│   │   ├── schemas.py    # Pydantic v2 validation models
│   │   ├── services/     # PyMuPDF extractor, OpenCV quality, Rules engine, Graph, Audit, ReportLab
│   │   └── routers/      # 11 REST API routers
│   ├── data/             # Persistent SQLite database (veridoc.db)
│   ├── uploads/          # Uploaded PDF and image files
│   ├── reports/          # Compiled ReportLab inspection PDF reports
│   └── seed.py           # Automated DB seeder & test scenario generator
├── sample_data/          # Programmatically generated synthetic PDF files for Scenarios A-E
├── tests/                # Pytest automated test suite
├── start_veridoc.bat     # One-click Windows startup batch script
├── stop_veridoc.bat      # Clean port-specific service shutdown script
├── README.md             # Platform documentation & manual runbook
├── .env.example
└── .gitignore
```

---

## 1-Click Windows Launch

To launch the complete application on Windows:

1. Double-click **`start_veridoc.bat`** (located in the project folder or root).
2. The script will automatically:
   - Detect Python and Node.js.
   - Set up the Python virtual environment (`backend\.venv`).
   - Install backend dependencies without unnecessary reinstalls.
   - Install frontend packages via npm if not present.
   - Initialize the SQLite database schema and generate realistic sample PDFs.
   - Launch the FastAPI backend on `http://127.0.0.1:8000`.
   - Launch the Vite frontend on `http://localhost:5173`.
   - Poll health endpoints and automatically open `http://localhost:5173` in your default browser.

### Stopping the Application

Double-click **`stop_veridoc.bat`**. It safely inspects ports `8000` and `5173` using `netstat` and terminates only the relevant listeners without terminating unrelated Python or Node.js processes.

---

## Manual Execution (Alternative)

If you prefer to run services manually from separate command prompts:

### Terminal 1: Backend
```cmd
cd backend
python -m venv --system-site-packages .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python seed.py
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2: Frontend
```cmd
cd frontend
npm install
npm run dev
```

### URLs
- **Web Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Documentation**: `http://localhost:8000/docs`
- **System Health Diagnostics**: `http://localhost:8000/api/health`

---

## The 14 Functional Pages

1. **Dashboard (`/`)**: High-level KPI cards (Total Filings, Clean vs Discrepant, Manual Review Queue, Cryptographic Audit Status), interactive findings breakdown, and 1-click scenario launchers.
2. **Applications (`/applications`)**: Searchable and filterable registry of all institutional dossiers with status badges and risk scores.
3. **Create Application (`/applications/new`)**: Dossier registration form for new institutional filings.
4. **Application Details (`/applications/:id`)**: Comprehensive multi-tab view covering Dossier Overview, Document Inventory, Extracted Claims, Compliance Findings, and Claim-Evidence Graph.
5. **Document Upload (`/upload`)**: Drag-and-drop file upload with pre-computed client-side SHA-256 duplicate detection.
6. **Extracted Fields (`/fields`)**: Searchable table of all extracted institutional entities with confidence metrics and manual override modal.
7. **Document & Evidence Viewer (`/documents/:id`)**: PDF.js canvas viewer with page controls, zoom, and dynamic bounding box highlight overlay.
8. **Verification Findings (`/findings`)**: Cross-document discrepancy matrix with severity ratings and resolution workflows.
9. **Claim–Evidence Graph (`/graph`)**: NetworkX-generated directed graph illustrating relationships between filings, documents, claims, rules, and findings.
10. **Manual Review Queue (`/review-queue`)**: Priority triage queue for low-confidence extractions, degraded scans, and unresolved discrepancies.
11. **Compliance Rules (`/rules`)**: Management console for enabling/disabling rules, adjusting severity, and adding custom statutory constraints.
12. **Audit Trail (`/audit`)**: Immutable ledger of all platform actions with a 1-click **Cryptographic Hash Chain Integrity Verification** tool.
13. **Reports Center (`/reports`)**: Archive of compiled verification dossiers and on-demand ReportLab PDF compiler.
14. **Settings & System Status (`/settings`)**: Subsystem diagnostics (PyMuPDF, OpenCV, SQLite, SHA-256) and a safe, confirmation-gated **Reset Demo Data** utility.

---

## Demonstration Scenarios (Pre-Built)

VeriDoc AI includes 5 realistic institutional demonstration scenarios generated via synthetic PDFs:

| Scenario | Title | Description | Triggered Finding |
|---|---|---|---|
| **Scenario A** | Clean Application | Consistent 120 intake across regulatory approval and state affiliation letters; current validity dates. | **None (Verified Clean)** |
| **Scenario B** | Intake Mismatch | Regulatory Approval letter sanctions 120 seats, while University Affiliation sanctions 90 seats. | **High: `CR-INTAKE-002`** (Intake Discrepancy) |
| **Scenario C** | Expired Supporting Document | Building Fire Safety Certificate expired on 15-Mar-2023. | **High: `CR-EXPIRY-004`** (Expired Clearance) |
| **Scenario D** | Duplicate File Upload | Identical Land Ownership Affidavit PDF uploaded twice. | **Medium: `CR-DUP-005`** (Exact Duplicate SHA-256 Match) |
| **Scenario E** | Degraded / Blurry Scan | Low-contrast foundational charter scan triggering OpenCV optical degradation alert. | **Medium: `CR-QUAL-006`** (Routed to Review Queue) |

You can launch any scenario with a single click directly from the Dashboard.

---

## Cryptographic Hash-Chain Audit Ledger

Every sensitive operation in VeriDoc AI appends an immutable block to the `audit_events` ledger:
$$\text{Hash}_N = \text{SHA256}(\text{Hash}_{N-1} \parallel \text{Seq} \parallel \text{Timestamp} \parallel \text{EventType} \parallel \text{Actor} \parallel \text{Data})$$

The **Verify Cryptographic Chain Integrity** button recalculates every hash in sequence. If any database record is altered or omitted, the verification tool pinpoints the exact sequence number where the cryptographic link broke.

---

## Running Automated Tests

To execute the complete automated test suite:

```cmd
backend\.venv\Scripts\pytest tests/ -v
```

This verifies:
- Application CRUD
- Document upload and SHA-256 duplicate detection
- Digital PDF extraction via PyMuPDF
- Cross-document intake mismatch detection (Scenario B)
- Expiry date verification (Scenario C)
- Manual field correction and audit event creation
- Audit hash-chain verification and tamper detection
- PDF report generation via ReportLab.
