"""
Chunker — sentence-aware text splitting.

Uses pysbd for sentence segmentation (handles "Fig. 3", "et al.", etc.)
then RecursiveCharacterTextSplitter for final chunking (380 tokens, 45 overlap).
"""

import pysbd
import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter

from l88_backend.config import CHUNK_SIZE, CHUNK_OVERLAP

# tiktoken encoder for accurate token counting
_encoder = tiktoken.get_encoding("cl100k_base")


def _token_length(text: str) -> int:
    """Count tokens using tiktoken cl100k_base."""
    return len(_encoder.encode(text))


# Sentence segmenter — handles scientific abbreviations
_segmenter = pysbd.Segmenter(language="en", clean=False)

# LangChain splitter — uses our token counter
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    length_function=_token_length,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    Split parsed PDF pages into overlapping chunks.

    Args:
        pages: Output from parser.parse_pdf — [{text, page, filename}]

    Returns:
        List of chunk dicts:
        [{text, page, filename, chunk_idx}]
        chunk_idx is globally unique within this document.
    """
    chunks = []
    chunk_idx = 0

    for page_data in pages:
        # Sentence-segment first for cleaner chunk boundaries
        sentences = _segmenter.segment(page_data["text"])
        rejoined = " ".join(sentences)

        # Split into token-sized chunks
        splits = _splitter.split_text(rejoined)
        for split_text in splits:
            chunks.append({
                "text": split_text,
                "page": page_data["page"],
                "filename": page_data["filename"],
                "chunk_idx": chunk_idx,
            })
            chunk_idx += 1

    return chunks
