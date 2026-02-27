"""
PDF parser — extracts text page-by-page using PyMuPDF (fitz).

Includes post-processing to strip headers, footers, page numbers,
watermarks, and other non-content noise that pollutes chunks.
"""

import re
import fitz  # PyMuPDF


# ── Noise patterns to strip from extracted text ───────────────────────

# Matches common page-number patterns: "Page 5", "5 of 12", "- 5 -", solo integers on a line
_PAGE_NUM_RE = re.compile(
    r'^\s*(?:page\s+\d+\s*(?:of\s+\d+)?|\d+\s+of\s+\d+|[-–]\s*\d+\s*[-–]|\d+)\s*$',
    re.IGNORECASE | re.MULTILINE,
)

# Matches repeated short lines that appear verbatim on many pages (headers/footers)
# We detect these cross-page in _detect_repeating_lines().
_WHITESPACE_RE = re.compile(r'\n{3,}', re.MULTILINE)


def _detect_repeating_lines(all_pages: list[str], threshold: int = 2) -> set[str]:
    """
    Identify lines that appear on >= threshold pages — likely headers or footers.
    Only considers short lines (< 120 chars) to avoid stripping legitimate repeated content.
    """
    from collections import Counter
    line_page_count: Counter = Counter()
    for page_text in all_pages:
        # Use a set so we count once per page, not once per occurrence
        unique_lines = set(
            ln.strip() for ln in page_text.splitlines()
            if ln.strip() and len(ln.strip()) < 120
        )
        for ln in unique_lines:
            line_page_count[ln] += 1

    return {ln for ln, cnt in line_page_count.items() if cnt >= threshold}


def _clean_page(text: str, noise_lines: set[str]) -> str:
    """Remove noise lines, page numbers, leading/trailing whitespace."""
    lines = text.splitlines()
    cleaned = []
    for ln in lines:
        stripped = ln.strip()
        if not stripped:
            cleaned.append("")
            continue
        # Skip lines identified as headers/footers
        if stripped in noise_lines:
            continue
        # Skip bare page number lines
        if _PAGE_NUM_RE.match(stripped):
            continue
        cleaned.append(ln)

    # Collapse excessive blank lines
    result = "\n".join(cleaned)
    result = _WHITESPACE_RE.sub("\n\n", result)
    return result.strip()


def parse_pdf(filepath: str, filename: str) -> list[dict]:
    """
    Extract text from a PDF file, page by page.

    Strips headers, footers, page numbers, and watermarks before
    returning the cleaned text.

    Args:
        filepath: Absolute path to the PDF file on disk.
        filename: Original filename (for metadata).

    Returns:
        List of dicts: [{"text": str, "page": int, "filename": str}]
        Pages are 1-indexed.
    """
    doc = fitz.open(filepath)

    # First pass: extract raw text from all pages
    raw_pages = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        raw_pages.append(text)

    # Detect cross-page repeating lines (headers / footers)
    noise_lines = _detect_repeating_lines(raw_pages, threshold=2)

    # Second pass: clean and filter
    pages = []
    for page_num, raw_text in enumerate(raw_pages):
        cleaned = _clean_page(raw_text, noise_lines)
        if cleaned:
            pages.append({
                "text": cleaned,
                "page": page_num + 1,
                "filename": filename,
            })

    doc.close()
    return pages
