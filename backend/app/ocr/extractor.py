"""
OCR / text extraction pipeline.

Three real extraction paths, chosen automatically by file type and
content:

1. PDF with an embedded text layer  -> pypdf (fast, high confidence,
   no rasterization needed).
2. PDF with no text layer (scanned) -> each page is rasterized with
   `pdftoppm` (poppler-utils) and run through Tesseract.
3. Image (PNG/JPG/TIFF)             -> Tesseract directly.

This is genuinely functional against the Tesseract 5 + poppler-utils
installed in this environment — not a stub. Docling (listed in the
target tech stack for richer layout-aware parsing) is a drop-in
upgrade for path 2/3 in a later phase; the OCRResult contract below is
designed so that swap doesn't touch any caller.
"""

import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import pytesseract
from PIL import Image
from pypdf import PdfReader

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}


@dataclass
class OCRResult:
    text: str
    confidence: float
    """0-100. For text-layer PDFs this is a fixed high-confidence value
    (extraction is deterministic, not probabilistic); for Tesseract
    paths it's the mean word-level confidence Tesseract reports."""
    page_count: int
    method: str
    per_page_confidence: list[float] = field(default_factory=list)


def extract_text(file_path: str) -> OCRResult:
    suffix = Path(file_path).suffix.lower()

    if suffix == ".pdf":
        return _extract_pdf(file_path)
    if suffix in IMAGE_EXTENSIONS:
        return _extract_image(file_path)
    if suffix == ".docx":
        return _extract_docx(file_path)

    raise ValueError(f"Unsupported file type for OCR: {suffix}")


def _extract_pdf(file_path: str) -> OCRResult:
    reader = PdfReader(file_path)
    page_texts = [page.extract_text() or "" for page in reader.pages]
    combined = "\n".join(page_texts).strip()

    # A text layer with a reasonable character count means this is a
    # native/digital PDF, not a scan — no rasterization needed.
    if len(combined) > 40:
        return OCRResult(
            text=combined,
            confidence=99.0,
            page_count=len(reader.pages),
            method="pdf_text_layer",
        )

    # No usable text layer -> treat as scanned; rasterize each page and OCR it.
    return _ocr_scanned_pdf(file_path, expected_pages=len(reader.pages))


def _ocr_scanned_pdf(file_path: str, expected_pages: int) -> OCRResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        prefix = str(Path(tmpdir) / "page")
        subprocess.run(
            ["pdftoppm", "-jpeg", "-r", "200", file_path, prefix],
            check=True,
            capture_output=True,
        )
        page_images = sorted(Path(tmpdir).glob("page-*.jpg"))

        texts: list[str] = []
        confidences: list[float] = []
        for image_path in page_images:
            page_text, page_conf = _tesseract_ocr(image_path)
            texts.append(page_text)
            confidences.append(page_conf)

        return OCRResult(
            text="\n".join(texts).strip(),
            confidence=sum(confidences) / len(confidences) if confidences else 0.0,
            page_count=len(page_images) or expected_pages,
            method="pdftoppm_tesseract",
            per_page_confidence=confidences,
        )


def _extract_image(file_path: str) -> OCRResult:
    text, confidence = _tesseract_ocr(Path(file_path))
    return OCRResult(text=text, confidence=confidence, page_count=1, method="tesseract")


def _extract_docx(file_path: str) -> OCRResult:
    # DOCX is XML-based, not scanned content — extract via python-docx
    # in a later phase if native .docx upload volume warrants it.
    # For Phase 2, unsupported paths fail loudly rather than silently
    # returning empty text.
    raise NotImplementedError("DOCX extraction lands in a later phase (python-docx integration).")


def _tesseract_ocr(image_path: Path) -> tuple[str, float]:
    """Runs Tesseract and returns (text, mean word confidence 0-100)."""
    image = Image.open(image_path)
    text = pytesseract.image_to_string(image)

    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    word_confidences = [int(c) for c in data["conf"] if c not in ("-1", -1)]
    mean_confidence = sum(word_confidences) / len(word_confidences) if word_confidences else 0.0

    return text.strip(), mean_confidence
