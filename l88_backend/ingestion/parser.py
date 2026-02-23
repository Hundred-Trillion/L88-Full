"""
PDF parser — extracts text page-by-page using PyMuPDF (fitz).
"""

import fitz  # PyMuPDF


def parse_pdf(filepath: str, filename: str) -> list[dict]:
    """
    Extract text from a PDF file, page by page.

    Args:
        filepath: Absolute path to the PDF file on disk.
        filename: Original filename (for metadata).

    Returns:
        List of dicts: [{"text": str, "page": int, "filename": str}]
        Pages are 1-indexed.
    """
    pages = []
    doc = fitz.open(filepath)
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if text.strip():
            pages.append({
                "text": text,
                "page": page_num + 1,
                "filename": filename,
            })
    doc.close()
    return pages
