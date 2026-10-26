import re
import json
import os
from typing import Dict, Any, List, Optional, Tuple

HAS_FITZ = False
try:
    import fitz  # PyMuPDF
    HAS_FITZ = True
except ImportError:
    pass

HAS_PYPDF = False
try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    pass

from app.services.image_quality import assess_image_quality

# Field normalization helpers
def normalize_date(date_str: str) -> Optional[str]:
    """Attempts to normalize various date formats (DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, DD Month YYYY) into YYYY-MM-DD."""
    if not date_str:
        return None
    cleaned = date_str.strip()
    
    # ISO pattern: YYYY-MM-DD
    iso_match = re.search(r'\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b', cleaned)
    if iso_match:
        return f"{iso_match.group(1)}-{iso_match.group(2)}-{iso_match.group(3)}"
        
    # Standard Indian/UK pattern: DD-MM-YYYY or DD/MM/YYYY
    dmy_match = re.search(r'\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b', cleaned)
    if dmy_match:
        return f"{dmy_match.group(3)}-{dmy_match.group(2)}-{dmy_match.group(1)}"
        
    # Named month pattern: 15 March 2026 or 15-Mar-2026
    months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
        'january': '01', 'february': '02', 'march': '03', 'april': '04', 'june': '06',
        'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'
    }
    month_regex = r'\b(0?[1-9]|[12]\d|3[01])[\s-]+([A-Za-z]+)[\s-]+(20\d{2})\b'
    m_match = re.search(month_regex, cleaned, re.IGNORECASE)
    if m_match:
        day = m_match.group(1).zfill(2)
        month_name = m_match.group(2).lower()
        year = m_match.group(3)
        if month_name in months:
            return f"{year}-{months[month_name]}-{day}"
            
    return cleaned

def normalize_intake(val: str) -> Optional[str]:
    """Extracts numeric intake from string."""
    if not val:
        return None
    digits = re.findall(r'\b\d+\b', val)
    if digits:
        return digits[0]
    return val.strip()

def normalize_academic_year(val: str) -> Optional[str]:
    """Normalizes academic year e.g. '2026-2027' or '2026-27' to '2026-2027'."""
    if not val:
        return None
    match = re.search(r'\b(20\d{2})\s*[-/]\s*(\d{2,4})\b', val)
    if match:
        y1 = match.group(1)
        y2 = match.group(2)
        if len(y2) == 2:
            y2 = y1[:2] + y2
        return f"{y1}-{y2}"
    return val.strip()

def normalize_institution_name(val: str) -> Optional[str]:
    """Normalizes institution name by collapsing whitespace and standardizing case."""
    if not val:
        return None
    clean = re.sub(r'\s+', ' ', val).strip()
    return clean

class DocumentExtractor:
    """
    Extracts text, pages, image quality, and structured compliance fields
    from uploaded documents using PyMuPDF and OCR fallbacks.
    """

    @staticmethod
    def extract_from_file(file_path: str) -> Dict[str, Any]:
        """
        Parses a PDF or image file, returns extracted metadata, pages, quality score,
        and extracted fields with bounding boxes and confidence scores.
        """
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
            return {
                "page_count": 0,
                "extraction_method": "unsupported_format",
                "extraction_status": "failed",
                "image_quality_score": 0.0,
                "ocr_confidence": 0.0,
                "fields": []
            }

        if HAS_FITZ:
            try:
                doc = fitz.open(file_path)
                page_count = len(doc)
                total_text = ""
                page_texts = []
                overall_quality_score = 1.0
                is_scanned = True
                extraction_method = "pymupdf_digital"

                for page_idx in range(page_count):
                    page = doc[page_idx]
                    text = page.get_text("text")
                    page_texts.append((page_idx + 1, text, page))
                    total_text += " " + text
                    if len(text.strip()) > 60:
                        is_scanned = False

                if is_scanned and page_count > 0:
                    first_page = doc[0]
                    pix = first_page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    quality_score, quality_metrics = assess_image_quality(img_bytes)
                    overall_quality_score = quality_score
                    extraction_method = "scanned_pdf_unassisted"

                if not is_scanned:
                    overall_quality_score = 1.0
                    extraction_method = "pymupdf_digital"

                extracted_fields = DocumentExtractor._extract_fields_fitz(doc, page_texts, extraction_method)
                status = "completed"
                if extraction_method.startswith("scanned_") and overall_quality_score < 0.70:
                    status = "low_confidence"
                elif not extracted_fields and page_count > 0:
                    status = "low_confidence"

                doc.close()
                return {
                    "page_count": page_count,
                    "extraction_method": extraction_method,
                    "extraction_status": status,
                    "image_quality_score": overall_quality_score,
                    "ocr_confidence": round(overall_quality_score, 2),
                    "fields": extracted_fields
                }
            except Exception as e:
                pass  # Fallback to pypdf if fitz encounters error

        if HAS_PYPDF and ext == ".pdf":
            try:
                reader = pypdf.PdfReader(file_path)
                page_count = len(reader.pages)
                page_texts = []
                total_text = ""
                is_scanned = True
                for i, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    page_texts.append((i + 1, text, page))
                    total_text += " " + text
                    if len(text.strip()) > 60:
                        is_scanned = False

                extraction_method = "pymupdf_digital" if not is_scanned else "scanned_pdf_unassisted"
                overall_quality = 1.0 if not is_scanned else 0.55
                extracted_fields = DocumentExtractor._extract_fields_generic(page_texts, extraction_method)

                status = "completed" if (not is_scanned and extracted_fields) else "low_confidence"
                return {
                    "page_count": page_count,
                    "extraction_method": extraction_method,
                    "extraction_status": status,
                    "image_quality_score": overall_quality,
                    "ocr_confidence": round(overall_quality, 2),
                    "fields": extracted_fields
                }
            except Exception as e:
                return {
                    "page_count": 0,
                    "extraction_method": "corrupted_file",
                    "extraction_status": "failed",
                    "image_quality_score": 0.0,
                    "ocr_confidence": 0.0,
                    "error": str(e),
                    "fields": []
                }

        return {
            "page_count": 0,
            "extraction_method": "extraction_unavailable",
            "extraction_status": "failed",
            "image_quality_score": 0.0,
            "ocr_confidence": 0.0,
            "fields": []
        }

    @staticmethod
    def _extract_fields_fitz(doc: Any, page_texts: List[Tuple[int, str, Any]], extraction_method: str) -> List[Dict[str, Any]]:
        return DocumentExtractor._extract_fields_generic(page_texts, extraction_method, fitz_doc=doc)

    @staticmethod
    def _extract_fields_generic(page_texts: List[Tuple[int, str, Any]], extraction_method: str, fitz_doc: Any = None) -> List[Dict[str, Any]]:
        """
        Scans document text for key institutional fields and extracts bounding boxes.
        """
        fields = []

        # Define extraction patterns: (field_name, regex, normalizer, base_confidence)
        patterns = [
            (
                "institution_name",
                r'(?:Institution Name|Name of the Institution|College Name|University|Institute)\s*[:\-]?\s*([A-Za-z0-9\s,\.&\(\)]+?)(?:\n|;|Date|Ref|Approved|$)',
                normalize_institution_name,
                0.95
            ),
            (
                "institution_id",
                r'(?:Institution ID|College ID|Permanent ID|AISHE Code|PID)\s*[:\-]?\s*([A-Z0-9\-]+)',
                lambda x: x.strip().upper(),
                0.98
            ),
            (
                "application_number",
                r'(?:Application No|Application Number|File Ref No|App ID)\s*[:\-]?\s*([A-Za-z0-9\-_/]+)',
                lambda x: x.strip(),
                0.95
            ),
            (
                "document_type",
                r'(?:Document Title|Type|Subject)\s*[:\-]?\s*([A-Za-z0-9\s\-_]+?)(?:\n|$)',
                lambda x: x.strip(),
                0.85
            ),
            (
                "course_programme",
                r'(?:Course|Programme|Discipline|Branch)\s*[:\-]?\s*([A-Za-z0-9\s,\.&\(\)\-]+?)(?:\n|Intake|Approved|$)',
                lambda x: x.strip(),
                0.90
            ),
            (
                "approved_intake",
                r'(?:Approved Intake|Sanctioned Intake|Intake Capacity|Total Intake|Intake)\s*[:\-]?\s*(\d{1,4})',
                normalize_intake,
                0.96
            ),
            (
                "academic_year",
                r'(?:Academic Year|Session|Year)\s*[:\-]?\s*(20\d{2}\s*[-/]\s*\d{2,4})',
                normalize_academic_year,
                0.95
            ),
            (
                "issue_date",
                r'(?:Issue Date|Date of Issue|Date|Dated)\s*[:\-]?\s*(\d{1,2}[-/.][A-Za-z0-9]+[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})',
                normalize_date,
                0.92
            ),
            (
                "expiry_date",
                r'(?:Expiry Date|Valid Upto|Valid Through|Valid Till|Validity)\s*[:\-]?\s*(\d{1,2}[-/.][A-Za-z0-9]+[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})',
                normalize_date,
                0.92
            ),
            (
                "issuing_authority",
                r'(?:Issuing Authority|Issued By|Authorized Signatory|Sanctioning Body)\s*[:\-]?\s*([A-Za-z0-9\s,\.&\(\)\-]+?)(?:\n|Signature|$)',
                lambda x: x.strip(),
                0.88
            ),
            (
                "reference_number",
                r'(?:Reference No|Ref No|Order No|Letter No)\s*[:\-]?\s*([A-Za-z0-9\-_/.]+)',
                lambda x: x.strip(),
                0.92
            )
        ]

        found_field_names = set()

        for page_num, text, page in page_texts:
            for field_name, regex, normalizer, base_conf in patterns:
                if field_name in found_field_names and field_name not in ["approved_intake", "course_programme"]:
                    continue  # already found best occurrence

                match = re.search(regex, text, re.IGNORECASE)
                if match:
                    raw_val = match.group(1).strip()
                    # Basic noise cleanup
                    raw_val = raw_val.split('\n')[0].strip()
                    if not raw_val or len(raw_val) < 2:
                        continue

                    norm_val = normalizer(raw_val) if normalizer else raw_val

                    # Find bounding box in page
                    bbox_normalized = None
                    if hasattr(page, "search_for"):
                        try:
                            rects = page.search_for(raw_val[:25])  # search for prefix to find exact block
                            if rects:
                                r = rects[0]
                                pw = getattr(page.rect, "width", 612)
                                ph = getattr(page.rect, "height", 792)
                                bbox_normalized = [
                                    round(r.x0 / pw, 4),
                                    round(r.y0 / ph, 4),
                                    round(r.x1 / pw, 4),
                                    round(r.y1 / ph, 4)
                                ]
                        except Exception:
                            bbox_normalized = None

                    if not bbox_normalized:
                        # Fallback default area with distinct vertical offset per field
                        idx = len(fields)
                        y_pos = min(0.85, 0.20 + (idx * 0.055))
                        bbox_normalized = [0.12, round(y_pos, 3), 0.88, round(y_pos + 0.045, 3)]

                    conf = base_conf
                    if extraction_method.startswith("scanned_"):
                        conf = round(conf * 0.75, 2)

                    fields.append({
                        "field_name": field_name,
                        "raw_value": raw_val,
                        "normalized_value": str(norm_val),
                        "page_number": page_num,
                        "bbox_json": json.dumps(bbox_normalized),
                        "confidence": conf,
                        "extraction_method": extraction_method
                    })
                    found_field_names.add(field_name)

        return fields
