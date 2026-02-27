"""
PDF parser — extracts text page-by-page using PyMuPDF (fitz).

Strategy (per page):
  1. Try native text layer (fast, perfect for born-digital PDFs)
  2. If usable text < OCR_MIN_CHARS, fall back to Tesseract OCR via pytesseract
     (renders page to grayscale image, runs OCR at 300 DPI)
  3. Cross-page header/footer stripping applied after all pages are gathered

Dependencies:
  - pymupdf   : pip install pymupdf
  - pytesseract + pillow: pip install pytesseract pillow
  - tesseract  : conda install -c conda-forge tesseract
"""

import re
import warnings
import fitz  # PyMuPDF

try:
    import pytesseract
    from PIL import Image
    import io
    _TESSERACT_AVAILABLE = True
except ImportError:
    _TESSERACT_AVAILABLE = False
    warnings.warn(
        "[PARSER] pytesseract / pillow not installed — OCR fallback disabled. "
        "Install with: pip install pytesseract pillow",
        ImportWarning,
        stacklevel=2,
    )


# ── Thresholds ──────────────────────────────────────────────────────────────

# Pages with fewer extractable characters than this will trigger OCR.
OCR_MIN_CHARS = 50


# ── Noise-line detection ─────────────────────────────────────────────────────

_PAGE_NUM_RE = re.compile(
    r'^\s*(?:page\s+\d+\s*(?:of\s+\d+)?|\d+\s+of\s+\d+|[-–]\s*\d+\s*[-–]|\d+)\s*$',
    re.IGNORECASE | re.MULTILINE,
)

_WHITESPACE_RE = re.compile(r'\n{3,}', re.MULTILINE)


def _detect_repeating_lines(all_pages: list[str], threshold: int = 2) -> set[str]:
    """Lines appearing on >= threshold distinct pages — likely headers/footers."""
    from collections import Counter
    line_page_count: Counter = Counter()
    for page_text in all_pages:
        unique_lines = {
            ln.strip() for ln in page_text.splitlines()
            if ln.strip() and len(ln.strip()) < 120
        }
        for ln in unique_lines:
            line_page_count[ln] += 1
    return {ln for ln, cnt in line_page_count.items() if cnt >= threshold}


def _clean_page(text: str, noise_lines: set[str]) -> str:
    """Strip noise lines, bare page numbers, and collapse blank lines."""
    lines = text.splitlines()
    cleaned = []
    for ln in lines:
        stripped = ln.strip()
        if not stripped:
            cleaned.append("")
            continue
        if stripped in noise_lines:
            continue
        if _PAGE_NUM_RE.match(stripped):
            continue
        cleaned.append(ln)
    result = "\n".join(cleaned)
    result = _WHITESPACE_RE.sub("\n\n", result)
    return result.strip()


# ── OCR helper ───────────────────────────────────────────────────────────────

def _ocr_page(page: fitz.Page) -> str:
    """
    Render the page to a grayscale image and run Tesseract OCR via pytesseract.
    Returns empty string if unavailable or on failure.
    """
    if not _TESSERACT_AVAILABLE:
        return ""
    try:
        # 2× scale factor → better OCR accuracy on small text
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
        img_bytes = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_bytes))
        text = pytesseract.image_to_string(img, lang="eng")
        return text
    except Exception as exc:
        print(f"[PARSER] OCR failed on page {page.number + 1}: {exc}")
        return ""


# ── Public API ───────────────────────────────────────────────────────────────

def parse_pdf(filepath: str, filename: str) -> list[dict]:
    """
    Extract and clean text from every page of a PDF.

    - Pages with a text layer → fast native extraction
    - Pages without text (scanned) → Tesseract OCR fallback
    - All pages → header/footer stripping, page-number removal

    Returns:
        List of {"text": str, "page": int, "filename": str, "ocr": bool}
        (1-indexed pages, empty/blank pages excluded)
    """
    doc = fitz.open(filepath)
    raw_pages: list[str] = []
    ocr_flags: list[bool] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        used_ocr = False

        if len(text.strip()) < OCR_MIN_CHARS:
            ocr_text = _ocr_page(page)
            if len(ocr_text.strip()) > len(text.strip()):
                text = ocr_text
                used_ocr = True
                print(
                    f"[PARSER] OCR applied: {filename} p{page_num + 1} "
                    f"({len(ocr_text.strip())} chars recovered)"
                )

        raw_pages.append(text)
        ocr_flags.append(used_ocr)

    noise_lines = _detect_repeating_lines(raw_pages, threshold=2)

    pages: list[dict] = []
    for page_num, (raw_text, used_ocr) in enumerate(zip(raw_pages, ocr_flags)):
        cleaned = _clean_page(raw_text, noise_lines)
        if cleaned:
            pages.append({
                "text": cleaned,
                "page": page_num + 1,
                "filename": filename,
                "ocr": used_ocr,
            })

    doc.close()

    ocr_count = sum(1 for f in ocr_flags if f)
    total = len(pages)
    print(f"[PARSER] {filename}: {total} pages extracted"
          + (f", {ocr_count} via OCR" if ocr_count else ""))

    return pages
