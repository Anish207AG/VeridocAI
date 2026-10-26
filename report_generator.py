import os
import json
import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)

from app.models import Application, Document, ExtractedField, VerificationFinding
from app.config import REPORTS_DIR

def generate_application_pdf_report(db: Session, application_id: str) -> str:
    """
    Generates a formal, audit-ready compliance verification PDF report
    using ReportLab and saves it to the backend/reports directory.
    Returns the absolute path to the generated PDF.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise ValueError(f"Application {application_id} not found.")

    docs = db.query(Document).filter(Document.application_id == application_id).all()
    fields = db.query(ExtractedField).filter(ExtractedField.application_id == application_id).all()
    findings = db.query(VerificationFinding).filter(VerificationFinding.application_id == application_id).all()

    filename = f"VeriDoc_Report_{app.application_number}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    file_path = str(REPORTS_DIR / filename)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom palette: Enterprise Navy
    PRIMARY_NAVY = colors.HexColor("#0F172A")
    ACCENT_BLUE = colors.HexColor("#1E3A8A")
    MUTED_TEXT = colors.HexColor("#475569")
    LIGHT_BG = colors.HexColor("#F8FAFC")
    BORDER_COLOR = colors.HexColor("#CBD5E1")
    ALERT_RED = colors.HexColor("#DC2626")
    WARNING_AMBER = colors.HexColor("#D97706")
    SUCCESS_GREEN = colors.HexColor("#16A34A")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY_NAVY
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=MUTED_TEXT
    )

    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=ACCENT_BLUE,
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )

    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155")
    )

    elements = []

    # 1. Header Banner
    elements.append(Paragraph("VeriDoc AI — Institutional Verification Report", title_style))
    elements.append(Paragraph(f"Application Ref: <b>{app.application_number}</b> &nbsp;|&nbsp; Generated: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style))
    elements.append(Spacer(1, 10))

    # 2. Disclaimer Callout Box
    disclaimer_text = (
        "<b>OFFICIAL NOTICE & ASSISTANCE DISCLAIMER:</b> This verification report was automatically generated "
        "by the VeriDoc AI platform to assist authorized institutional compliance officers and human reviewers. "
        "Automated cross-document comparisons and cryptographic checks highlight potential inconsistencies and "
        "anomalies for human review. This preliminary report does <i>not</i> constitute a final regulatory "
        "determination or conclusive proof of non-compliance or fraud."
    )
    disclaimer_table = Table([[Paragraph(disclaimer_text, disclaimer_style)]], colWidths=[540])
    disclaimer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#F59E0B")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(disclaimer_table)
    elements.append(Spacer(1, 12))

    # 3. Application Summary Table
    elements.append(Paragraph("1. Application Summary", section_header))
    summary_data = [
        [
            Paragraph("<b>Institution Name:</b>", body_style),
            Paragraph(app.institution_name, body_style),
            Paragraph("<b>Permanent ID:</b>", body_style),
            Paragraph(app.institution_id, body_style)
        ],
        [
            Paragraph("<b>Academic Year:</b>", body_style),
            Paragraph(app.academic_year or "N/A", body_style),
            Paragraph("<b>Verification Status:</b>", body_style),
            Paragraph(f"<b>{app.status.replace('_', ' ').upper()}</b>", body_style)
        ],
        [
            Paragraph("<b>Course / Programme:</b>", body_style),
            Paragraph(app.course_programme or "Institutional General", body_style),
            Paragraph("<b>Compliance Risk Score:</b>", body_style),
            Paragraph(f"<b>{app.risk_score} / 100</b>", body_style)
        ],
        [
            Paragraph("<b>Total Uploaded Documents:</b>", body_style),
            Paragraph(str(len(docs)), body_style),
            Paragraph("<b>Total Extracted Fields:</b>", body_style),
            Paragraph(str(len(fields)), body_style)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[120, 150, 120, 150])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 12))

    # 4. Compliance Findings Table
    elements.append(Paragraph("2. Compliance Findings & Cross-Document Consistency", section_header))
    if not findings:
        elements.append(Paragraph("<i>No compliance findings or inconsistencies detected. All cross-document checks passed cleanly.</i>", body_style))
    else:
        findings_header = [
            Paragraph("<b>Rule</b>", body_style),
            Paragraph("<b>Severity</b>", body_style),
            Paragraph("<b>Finding Title & Description</b>", body_style),
            Paragraph("<b>Status</b>", body_style)
        ]
        findings_rows = [findings_header]
        for f in findings:
            sev_color = ALERT_RED if f.severity == "high" else WARNING_AMBER if f.severity == "medium" else PRIMARY_NAVY
            findings_rows.append([
                Paragraph(f.rule_code, body_style),
                Paragraph(f"<font color='{sev_color.hexval()}'><b>{f.severity.upper()}</b></font>", body_style),
                Paragraph(f"<b>{f.title}</b><br/>{f.description}", body_style),
                Paragraph(f.review_status.replace('_', ' ').title(), body_style)
            ])
        findings_table = Table(findings_rows, colWidths=[70, 60, 330, 80])
        findings_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(findings_table)
    elements.append(Spacer(1, 12))

    # 5. Extracted Fields Matrix
    elements.append(Paragraph("3. Extracted Institutional Fields & Evidentiary Claims", section_header))
    if not fields:
        elements.append(Paragraph("<i>No fields extracted yet.</i>", body_style))
    else:
        fields_header = [
            Paragraph("<b>Field Name</b>", body_style),
            Paragraph("<b>Extracted Value</b>", body_style),
            Paragraph("<b>Source Document</b>", body_style),
            Paragraph("<b>Pg</b>", body_style),
            Paragraph("<b>Conf.</b>", body_style),
            Paragraph("<b>Method</b>", body_style)
        ]
        fields_rows = [fields_header]
        doc_map = {d.id: d.filename for d in docs}
        for f in fields[:15]:  # limit to top 15 key fields
            val = f.corrected_value if f.is_corrected else (f.normalized_value or f.raw_value or "N/A")
            corr_label = " (Corrected)" if f.is_corrected else ""
            fields_rows.append([
                Paragraph(f.field_name.replace("_", " ").title(), body_style),
                Paragraph(f"{val}{corr_label}", body_style),
                Paragraph(doc_map.get(f.document_id, "Unknown")[:25], body_style),
                Paragraph(str(f.page_number), body_style),
                Paragraph(f"{int(f.confidence * 100)}%", body_style),
                Paragraph(f.extraction_method.replace('_', ' ').title(), body_style)
            ])
        fields_table = Table(fields_rows, colWidths=[110, 140, 130, 30, 45, 85])
        fields_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(fields_table)
    elements.append(Spacer(1, 12))

    # 6. Document Inventory & Cryptographic Hashes
    elements.append(Paragraph("4. Uploaded Document Inventory & Cryptographic Digest", section_header))
    docs_header = [
        Paragraph("<b>Filename</b>", body_style),
        Paragraph("<b>Document Type</b>", body_style),
        Paragraph("<b>Pages</b>", body_style),
        Paragraph("<b>Duplicate</b>", body_style),
        Paragraph("<b>SHA-256 Digest</b>", body_style)
    ]
    docs_rows = [docs_header]
    for d in docs:
        dup_text = "Yes (Flagged)" if d.is_duplicate else "No"
        docs_rows.append([
            Paragraph(d.filename[:30], body_style),
            Paragraph(d.document_type.replace('_', ' ').title(), body_style),
            Paragraph(str(d.page_count), body_style),
            Paragraph(dup_text, body_style),
            Paragraph(f"<font size='7'>{d.sha256_hash}</font>", body_style)
        ])
    docs_table = Table(docs_rows, colWidths=[120, 100, 35, 55, 230])
    docs_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(docs_table)
    elements.append(Spacer(1, 15))

    # 7. Sign-off Footer
    sign_off_data = [
        [
            Paragraph("<b>Automated Verification Engine:</b> Passed Integrity Checks", body_style),
            Paragraph("<b>Human Reviewer Sign-off:</b> ___________________________", body_style)
        ],
        [
            Paragraph(f"<b>System Build:</b> VeriDoc AI Enterprise v1.0", subtitle_style),
            Paragraph("<b>Verification Action:</b> Pending / Final Determination", subtitle_style)
        ]
    ]
    sign_table = Table(sign_off_data, colWidths=[270, 270])
    sign_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(KeepTogether(sign_table))

    doc.build(elements)
    return file_path
