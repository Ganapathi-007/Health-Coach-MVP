import os
import pdfplumber
from typing import List

DOCS_DIR = os.path.join(os.path.dirname(__file__), "../docs")

def _read_file(path: str) -> str:
    if path.endswith(".pdf"):
        with pdfplumber.open(path) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def _chunk(text: str, size: int = 800) -> List[str]:
    words = text.split()
    chunks, current = [], []
    for word in words:
        current.append(word)
        if len(current) >= size:
            chunks.append(" ".join(current))
            current = []
    if current:
        chunks.append(" ".join(current))
    return chunks

def load_protocol() -> str:
    for filename in os.listdir(DOCS_DIR):
        if filename.endswith((".pdf", ".txt")) and not filename.startswith("."):
            return _read_file(os.path.join(DOCS_DIR, filename))
    return ""

protocol_text: str = load_protocol()
protocol_chunks: List[str] = _chunk(protocol_text)
