"""Collect citeable sections from the existing two renditions and original file."""
import re
from contextlib import contextmanager
from pathlib import Path

from app.services.file_processor import extract_text, get_file_group
from app.services.file_service import download_r2_to_temp_file, local_storage_path


@contextmanager
def local_copy(key):
    local = local_storage_path(key)
    temporary = bool(key and not local.is_file())
    if temporary:
        local = download_r2_to_temp_file(key)
    try:
        yield local
    finally:
        if temporary and local:
            local.unlink(missing_ok=True)


def units(path, group):
    if group == "pdf":
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                value = page.extract_text() or ""
                if not value.strip() and i <= 5:
                    from pdf2image import convert_from_path
                    import pytesseract
                    images = convert_from_path(path, first_page=i, last_page=i, dpi=200)
                    value = pytesseract.image_to_string(images[0], lang="vie+eng")
                yield i, value
    elif group == "pptx":
        from pptx import Presentation
        for i, slide in enumerate(Presentation(path).slides, 1):
            yield i, "\n".join(s.text for s in slide.shapes if hasattr(s, "text"))


def paragraphs(value):
    for block in re.split(r"\n\s*\n", value.strip()):
        block = block.strip()
        while len(block) > 1600:
            end = max(block.rfind("\n", 800, 1600), block.rfind(" ", 800, 1600))
            end = end if end > 0 else 1600
            yield block[:end]
            block = block[end:].lstrip()
        if block:
            yield block


def merge_sources(markdown, content, pages, unit):
    chunks = []
    seen = set()
    seen_lines = set()
    normalized = lambda s: " ".join(s.split())
    page_text = [(n, normalized(value)) for n, value in pages if value.strip()]
    heading = ""
    def add(value, source, location):
        key = normalized(value)
        if not key or key in seen:
            return
        seen.add(key)
        seen_lines.update(normalized(line) for line in value.splitlines() if line.strip())
        chunks.append(dict(body=value, source=source, heading=heading, location=location))

    for section in re.split(r"(?m)(?=^#{1,6}\s)", markdown):
        match = re.match(r"^#{1,6}\s+([^\n]+)", section)
        if match:
            heading = match[1].strip()
            section = section[match.end():]
        for value in paragraphs(section):
            location = {"section": heading} if heading else {}
            matches = [n for n, page in page_text if normalized(value) in page]
            if len(matches) == 1:
                location[unit] = matches[0]
            add(value, "markdown", location)
    heading = ""
    for n, page in pages:
        for value in paragraphs(page):
            # Remove lines already present in Markdown at this location.
            remainder = [line for line in value.splitlines() if normalized(line) not in seen_lines]
            for piece in paragraphs("\n".join(remainder)):
                add(piece, unit, {unit: n})
    full_pages = normalized(" ".join(text for _, text in pages))
    for block in paragraphs(content):
        if normalized(block) in full_pages:
            continue
        remainder = [line for line in block.splitlines() if normalized(line) not in seen_lines]
        for piece in paragraphs("\n".join(remainder)):
            add(piece, "content", {})
    if pages:
        read = len(page_text)
        return chunks, dict(
            state="full" if read == len(pages) else "partial",
            unit=unit,
            read=read,
            total=len(pages),
        )

    if chunks:
        sections = {chunk["heading"] for chunk in chunks if chunk["heading"]}
        total = len(sections) or len(chunks)
        return chunks, dict(state="full", unit="section", read=total, total=total)
    return chunks, dict(state="empty", unit="section", read=0, total=0)


def collect(doc):
    with local_copy(doc["markdown_path"]) as md:
        markdown = md.read_text(encoding="utf-8") if md else ""
    content = doc["content"] or ""
    group = get_file_group(doc["file_type"] or "", doc["file_path"])
    pages = []
    if group in {"pdf", "pptx"} or not (markdown or content):
        with local_copy(doc["file_path"]) as original:
            if original:
                pages = list(units(original, group))
                if not pages and not (markdown or content):
                    content = extract_text(str(original), doc["file_type"] or "")
            elif not (markdown or content):
                raise OSError("Không đọc được tệp nguồn")
    return merge_sources(markdown, content, pages, "slide" if group == "pptx" else "page")
