import os
import sys
from pathlib import Path

# Add backend directory to path if run standalone
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.config import SAMPLE_DATA_DIR

def create_sample_pdf(file_path: str, title: str, doc_type: str, fields: dict, body_notes: str = ""):
    """Helper to generate a cleanly formatted synthetic institutional PDF for testing."""
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(file_path, pagesize=letter, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0F172A"),
        alignment=1 # Center
    )

    sub_style = ParagraphStyle(
        'SubHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1E3A8A"),
        alignment=1
    )

    label_style = ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155")
    )

    val_style = ParagraphStyle(
        'FieldValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0F172A")
    )

    notes_style = ParagraphStyle(
        'Notes',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569")
    )

    elements = []
    elements.append(Paragraph("STATUTORY REGULATORY & COMPLIANCE AUTHORITY", header_style))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(f"Official Document: {title}", sub_style))
    elements.append(Spacer(1, 15))

    # Field rows
    table_data = []
    for k, v in fields.items():
        table_data.append([
            Paragraph(f"{k}:", label_style),
            Paragraph(str(v), val_style)
        ])

    t = Table(table_data, colWidths=[180, 350])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 15))

    if body_notes:
        elements.append(Paragraph(body_notes, notes_style))
        elements.append(Spacer(1, 15))

    footer_text = "Certified True Copy for Institutional Accreditation & Compliance Review. VeriDoc AI Synthetic Benchmark Artifact."
    elements.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, textColor=colors.HexColor("#94A3B8"), alignment=1)))

    doc.build(elements)

def generate_all_sample_pdfs():
    """Generates all 5 demonstration scenario PDF test files in sample_data/."""
    SAMPLE_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Scenario A: Consistent / Clean
    create_sample_pdf(
        file_path=str(SAMPLE_DATA_DIR / "scenario_a_approval.pdf"),
        title="Annual Regulatory Approval Letter",
        doc_type="approval_letter",
        fields={
            "Institution Name": "Apex Institute of Technology",
            "Institution ID": "INST-AICTE-1001",
            "Application Number": "APP-2026-001",
            "Course Programme": "B.Tech Computer Science and Engineering",
            "Approved Intake": "120",
            "Academic Year": "2026-2027",
            "Issue Date": "15-May-2026",
            "Expiry Date": "30-June-2028",
            "Issuing Authority": "National Technical Education Regulatory Council",
            "Reference Number": "REG-AUTH/2026/APEX-001"
        },
        body_notes="Sanction is accorded for conducting the technical programme with sanctioned intake of 120 seats."
    )

    create_sample_pdf(
        file_path=str(SAMPLE_DATA_DIR / "scenario_a_affiliation.pdf"),
        title="State University Affiliation Certificate",
        doc_type="affiliation_certificate",
        fields={
            "Institution Name": "Apex Institute of Technology",
            "Institution ID": "INST-AICTE-1001",
            "Application Number": "APP-2026-001",
            "Course Programme": "B.Tech Computer Science and Engineering",
            "Approved Intake": "120",
            "Academic Year": "2026-2027",
            "Issue Date": "20-June-2026",
            "Expiry Date": "30-June-2028",
            "Issuing Authority": "State Technological University",
            "Reference Number": "STU/AFFIL/2026/894"
        },
        body_notes="Provisional affiliation is granted for academic session 2026-2027 for approved intake of 120 seats."
    )

    # 2. Scenario B: Intake Mismatch (120 vs 90)
    create_sample_pdf(
        file_path=str(SAMPLE_DATA_DIR / "scenario_b_approval.pdf"),
        title="Sanction & Approval Order",
        doc_type="approval_letter",
        fields={
            "Institution Name": "Horizon College of Engineering",
            "Institution ID": "INST-AICTE-2002",
            "Application Number": "APP-2026-002",
            "Course Programme": "B.Tech Information Technology",
            "Approved Intake": "120",
            "Academic Year": "2026-2027",
            "Issue Date": "10-April-2026",
            "Expiry Date": "30-June-2027",
            "Issuing Authority": "Central Educational Board",
            "Reference Number": "CEB/APPR/2026/HCE-12"
        },
        body_notes="Total intake sanctioned by the Central Board is 120 students for the session 2026-2027."
    )

    create_sample_pdf(
        file_path=str(SAMPLE_DATA_DIR / "scenario_b_affiliation.pdf"),
        title="University Affiliation Sanction Order",
        doc_type="affiliation_certificate",
        fields={
            "Institution Name": "Horizon College of Engineering",
            "Institution ID": "INST-AICTE-2002",
            "Application Number": "APP-2026-002",
            "Course Programme": "B.Tech Information Technology",
            "Approved Intake": "90",  # MISMATCH: 90 vs 120!
            "Academic Year": "2026-2027",
            "Issue Date": "25-May-2026",
            "Expiry Date": "30-June-2027",
            "Issuing Authority": "Metropolitan Technical University",
            "Reference Number": "MTU/SANCTION/2026/HCE-90"
        },
        body_notes="Affiliation committee approved restricted seat allocation of 90 seats due to faculty ratios."
    )

    # 3. Scenario C: Expired Supporting Document
    create_sample_pdf(
        file_path=str(SAMPLE_DATA_DIR / "scenario_c_approval.pdf"),
        title="Institutional Operating License",
        doc_type="approval_letter",
        fields={
            "Institution Name": "Greenfield Polytechnic",
            "Institution ID": "INST-AICTE-3003",
            "Application Number": "APP-2026-003",
            "Course Programme": "Diploma in Mechanical Engineering",
            "Approved Intake": "60",
            "Academic Year": "2026-2027",
            "Issue Date": "01-July-2026",
            "Expiry Date": "30-June-2028",
            "Issuing Authority": "State Directorate of Technical Education",
            "Reference Number": "DTE/OPER/2026/GFP-01"
        }
    )

    create_sample_pdf(
        file_path=str(SAMPLE_DATA_DIR / "scenario_c_safety_cert.pdf"),
        title="Building Fire & Structural Safety Certificate",
        doc_type="building_safety_certificate",
        fields={
            "Institution Name": "Greenfield Polytechnic",
            "Institution ID": "INST-AICTE-3003",
            "Application Number": "APP-2026-003",
            "Document Type": "Building Fire Safety Clearance",
            "Issue Date": "15-March-2020",
            "Expiry Date": "15-March-2023",  # EXPIRED in 2023!
            "Issuing Authority": "Municipal Fire Prevention Services",
            "Reference Number": "MFPS/NOC/2020/9981"
        },
        body_notes="This safety clearance is strictly valid for 3 years from date of issue and must be re-inspected upon lapse."
    )

    # 4. Scenario D: Duplicate Document
    create_sample_pdf(
        file_path=str(SAMPLE_DATA_DIR / "scenario_d_approval.pdf"),
        title="Board Recognition Order",
        doc_type="approval_letter",
        fields={
            "Institution Name": "Metro Academy of Sciences",
            "Institution ID": "INST-AICTE-4004",
            "Application Number": "APP-2026-004",
            "Course Programme": "B.Tech Electronics & Communication",
            "Approved Intake": "60",
            "Academic Year": "2026-2027",
            "Issue Date": "12-June-2026",
            "Expiry Date": "30-June-2028",
            "Issuing Authority": "State Academic Council",
            "Reference Number": "SAC/REC/2026/MAS-01"
        }
    )

    create_sample_pdf(
        file_path=str(SAMPLE_DATA_DIR / "scenario_d_land_affidavit.pdf"),
        title="Campus Land Ownership Affidavit",
        doc_type="land_affidavit",
        fields={
            "Institution Name": "Metro Academy of Sciences",
            "Institution ID": "INST-AICTE-4004",
            "Application Number": "APP-2026-004",
            "Document Type": "Land Title and Possession Affidavit",
            "Issue Date": "05-January-2026",
            "Expiry Date": "31-December-2035",
            "Issuing Authority": "Sub-Registrar Revenue Department",
            "Reference Number": "REV/AFF/2026/445"
        },
        body_notes="Affidavit certifying contiguous undisputed freehold title of 5.2 acres."
    )

    # 5. Scenario E: Low Quality / Scanned Document
    create_sample_pdf(
        file_path=str(SAMPLE_DATA_DIR / "scenario_e_scanned_charter.pdf"),
        title="Historical Institutional Charter",
        doc_type="other",
        fields={
            "Institution Name": "Crestview Technical Institute",
            "Institution ID": "INST-AICTE-5005",
            "Application Number": "APP-2026-005",
            "Document Type": "Foundational Trust Charter",
            "Issue Date": "12-August-1998",
            "Expiry Date": "31-December-2099",
            "Issuing Authority": "Charity Commissioner",
            "Reference Number": "CC/TRUST/1998/002"
        },
        body_notes="Archived scan copy reproduced from microfiche storage."
    )

if __name__ == "__main__":
    generate_all_sample_pdfs()
    print("All sample PDFs successfully generated.")
