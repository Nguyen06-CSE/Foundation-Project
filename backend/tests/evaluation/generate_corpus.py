#!/usr/bin/env python3
"""Sinh 30 tài liệu tổng hợp + manifest/questions cho Phase 0B.

Chạy:
    backend/.venv/bin/python backend/tests/evaluation/generate_corpus.py

Yêu cầu: python-docx, python-pptx, Pillow, pdfplumber, pypdfium2 (đã có trong
requirements) và lệnh macOS `cupsfilter` để tạo PDF có text layer. File PDF đã
sinh được lưu trong repo nên chỉ cần chạy lại khi sửa corpus.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unicodedata
from pathlib import Path
from typing import Any

EVAL_DIR = Path(__file__).resolve().parent
FILES_DIR = EVAL_DIR / "fixtures" / "files"
RUNTIME_DIR = EVAL_DIR / ".runtime" / "build"
FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")

sys.path.insert(0, str(EVAL_DIR))
import corpus  # noqa: E402


def slugify(value: str, max_len: int = 48) -> str:
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    value = value.replace("đ", "d").replace("Đ", "D")
    value = "".join(c.lower() if c.isalnum() else "_" for c in value)
    value = "_".join(part for part in value.split("_") if part)
    return value[:max_len].strip("_") or "tai_lieu"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _pdf_text_pages(text: str, out_path: Path) -> None:
    """Tạo PDF có text layer bằng cupsfilter (text/plain -> application/pdf)."""
    if not shutil.which("cupsfilter"):
        raise RuntimeError("Thiếu lệnh cupsfilter (macOS) để tạo PDF text layer")
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    txt = RUNTIME_DIR / f"{out_path.stem}.txt"
    txt.write_text(text, encoding="utf-8")
    with out_path.open("wb") as f:
        proc = subprocess.run(
            ["cupsfilter", "-m", "application/pdf", str(txt)],
            stdout=f,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    if proc.returncode != 0 or out_path.stat().st_size == 0:
        raise RuntimeError(f"cupsfilter thất bại cho {out_path.name}")


def _render_scan_page(text: str, out_path: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    if not FONT_PATH.exists():
        raise RuntimeError(f"Thiếu font hỗ trợ tiếng Việt: {FONT_PATH}")
    image = Image.new("RGB", (1240, 1754), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(FONT_PATH), 27)
    bold = ImageFont.truetype(str(FONT_PATH), 30)
    y = 90
    for line in text.splitlines():
        wrapped = textwrap.wrap(line, width=68) or [""]
        for idx, part in enumerate(wrapped):
            use = bold if idx == 0 and line and line[0].isupper() and len(line) < 70 else font
            draw.text((70, y), part, font=use, fill="black")
            y += 42
        y += 8
    image.save(out_path, "PDF", resolution=150.0)


def _scan_pdf(segments: list[dict[str, str]], out_path: Path) -> None:
    from PIL import Image

    pages: list[Image.Image] = []
    for seg in segments:
        page_path = RUNTIME_DIR / f"{out_path.stem}_{len(pages)}.pdf"
        _render_scan_page(seg["text"], page_path)
        # Mở lại PDF bằng pdfium rồi render thành ảnh để gộp nhiều trang.
        import pypdfium2 as pdfium

        pdf = pdfium.PdfDocument(str(page_path))
        bitmap = pdf[0].render(scale=1.0)
        pages.append(bitmap.to_pil().convert("RGB"))
        pdf.close()
    if not pages:
        raise ValueError("PDF scan cần ít nhất một trang")
    pages[0].save(
        out_path,
        "PDF",
        resolution=150.0,
        save_all=True,
        append_images=pages[1:],
    )


def _mixed_pdf(segments: list[dict[str, str]], out_path: Path) -> None:
    import pypdfium2 as pdfium

    text_pdf = RUNTIME_DIR / f"{out_path.stem}_text.pdf"
    _pdf_text_pages(segments[0]["text"], text_pdf)
    doc = pdfium.PdfDocument(str(text_pdf))
    try:
        for idx, seg in enumerate(segments[1:], start=1):
            scan_pdf = RUNTIME_DIR / f"{out_path.stem}_scan_{idx}.pdf"
            _scan_pdf([seg], scan_pdf)
            other = pdfium.PdfDocument(str(scan_pdf))
            try:
                doc.import_pages(other, pages=[0])
            finally:
                other.close()
        doc.save(str(out_path))
    finally:
        doc.close()


def _docx_file(doc: dict[str, Any], out_path: Path) -> None:
    from docx import Document as DocxDocument

    document = DocxDocument()
    document.add_heading(doc["title"], level=0)
    document.add_paragraph(doc["description"])
    for seg in doc["segments"]:
        document.add_heading(seg["location"], level=1)
        for line in seg["text"].splitlines():
            document.add_paragraph(line)
    document.save(out_path)


def _pptx_file(doc: dict[str, Any], out_path: Path) -> None:
    from pptx import Presentation
    from pptx.util import Pt

    prs = Presentation()
    for seg in doc["segments"]:
        slide = prs.slides.add_slide(prs.slide_layouts[1])
        slide.shapes.title.text = doc["title"]
        body = slide.placeholders[1].text_frame
        lines = seg["text"].splitlines()
        first = True
        for line in lines:
            paragraph = body.paragraphs[0] if first else body.add_paragraph()
            first = False
            paragraph.text = line
            paragraph.font.size = Pt(18)
    prs.save(out_path)


def _build_file(doc: dict[str, Any], filename: str) -> Path:
    out_path = FILES_DIR / filename
    fmt = doc["format"]
    if fmt == "pdf_text":
        _pdf_text_pages(doc["text"], out_path)
    elif fmt == "pdf_scan":
        _scan_pdf(doc["segments"], out_path)
    elif fmt == "pdf_mixed":
        _mixed_pdf(doc["segments"], out_path)
    elif fmt == "docx":
        _docx_file(doc, out_path)
    elif fmt == "pptx":
        _pptx_file(doc, out_path)
    else:
        raise ValueError(f"Format không hỗ trợ file: {fmt}")
    return out_path


def _audit_file(doc: dict[str, Any], path: Path) -> str:
    fmt = doc["format"]
    if fmt in {"pdf_text", "pdf_scan", "pdf_mixed"}:
        import pdfplumber

        with pdfplumber.open(path) as pdf:
            texts = [(page.extract_text() or "").strip() for page in pdf.pages]
        if fmt == "pdf_text":
            if not any(texts):
                raise AssertionError(f"{doc['id']}: PDF text không có text layer")
            return f"{len(texts)} trang có text"
        if fmt == "pdf_scan":
            if any(texts):
                raise AssertionError(f"{doc['id']}: PDF scan lại có text layer")
            return f"{len(texts)} trang scan (không text layer)"
        if not texts[0] or any(texts[1:]):
            raise AssertionError(f"{doc['id']}: PDF mixed phải có trang 1 text, trang 2 scan")
        return f"{len(texts)} trang (1 text + {len(texts) - 1} scan)"
    if fmt == "docx":
        from docx import Document as DocxDocument

        text = "\n".join(p.text for p in DocxDocument(path).paragraphs)
        if doc["text"].splitlines()[-1][:20] not in text:
            raise AssertionError(f"{doc['id']}: DOCX thiếu nội dung")
        return "DOCX đọc được"
    if fmt == "pptx":
        from pptx import Presentation

        text = "\n".join(
            shape.text
            for slide in Presentation(path).slides
            for shape in slide.shapes
            if hasattr(shape, "text")
        )
        if doc["text"].splitlines()[-1][:20] not in text:
            raise AssertionError(f"{doc['id']}: PPTX thiếu nội dung")
        return "PPTX đọc được"
    return "bundle metadata"


def _accessible(doc: dict[str, Any], user: str) -> bool:
    if doc["workspace"] is None:
        return doc["owner"] == user
    ws = corpus.WORKSPACES[doc["workspace"]]
    return ws["owner"] == user or user in ws["members"]


def _norm(value: str) -> str:
    return " ".join(value.split())


def validate(docs: list[dict[str, Any]], questions: list[dict[str, Any]]) -> None:
    assert len(docs) == 30, f"Cần 30 tài liệu, có {len(docs)}"
    assert len(questions) == 60, f"Cần 60 câu hỏi, có {len(questions)}"
    assert {d["split"] for d in docs} == {"calibration", "evaluation"}
    assert {q["split"] for q in questions} == {"calibration", "evaluation"}
    assert len([d for d in docs if d["split"] == "calibration"]) == 15
    assert len([d for d in docs if d["split"] == "evaluation"]) == 15
    assert len([q for q in questions if q["split"] == "calibration"]) == 30
    assert len([q for q in questions if q["split"] == "evaluation"]) == 30
    assert {q["type"] for q in questions} == {"answerable", "forbidden", "no_evidence"}

    by_id = {d["id"]: d for d in docs}
    for split in ("calibration", "evaluation"):
        qs = [q for q in questions if q["split"] == split]
        assert len([q for q in qs if q["type"] == "answerable"]) == 24
        assert len([q for q in qs if q["type"] == "forbidden"]) == 3
        assert len([q for q in qs if q["type"] == "no_evidence"]) == 3

    for doc in docs:
        for key in ("id", "title", "description", "segments", "text", "owner", "tags"):
            assert doc.get(key) not in (None, ""), f"{doc.get('id')} thiếu {key}"
        if doc["format"] != "bundle":
            assert doc.get("file") and doc.get("sha256"), f"{doc['id']} thiếu file/hash"
        if doc["duplicate_of"]:
            original = by_id[doc["duplicate_of"]]
            assert doc["format"] == original["format"], f"{doc['id']} khác format bản gốc"
            assert doc["sha256"] == original["sha256"], f"{doc['id']} không trùng byte bản gốc"
        for child in doc["bundle_children"]:
            assert child in by_id and by_id[child]["format"] != "bundle"

    for q in questions:
        assert q["user"] in corpus.USERS
        assert q["query"].strip(), f"{q['id']} thiếu query"
        if q["type"] in {"answerable", "forbidden"}:
            citation = q["citation"] or {}
            cite_doc = by_id.get(citation.get("doc_id"))
            assert cite_doc, f"{q['id']} citation trỏ tới tài liệu không tồn tại"
            assert _norm(citation["quote"]) in _norm(cite_doc["text"]), (
                f"{q['id']} quote không có trong {cite_doc['id']}"
            )
            assert citation["location"] in {s["location"] for s in cite_doc["segments"]}, (
                f"{q['id']} location không khớp segment"
            )
        if q["type"] == "answerable":
            assert q["gold_doc_ids"], f"{q['id']} thiếu gold"
            assert all(_accessible(by_id[doc_id], q["user"]) for doc_id in q["gold_doc_ids"]), (
                f"{q['id']} gold không accessible cho {q['user']}"
            )
            assert not q["forbidden_doc_ids"], f"{q['id']} answerable không có forbidden"
        elif q["type"] == "forbidden":
            assert q["forbidden_doc_ids"], f"{q['id']} thiếu forbidden"
            assert all(not _accessible(by_id[doc_id], q["user"]) for doc_id in q["forbidden_doc_ids"]), (
                f"{q['id']} forbidden lại accessible cho {q['user']}"
            )
            assert not q["gold_doc_ids"], f"{q['id']} forbidden không có gold"
        else:
            assert not q["gold_doc_ids"] and not q["forbidden_doc_ids"], f"{q['id']} no_evidence phải rỗng"
            assert q["answer"] is None and q["citation"] is None, f"{q['id']} no_evidence không có đáp án"


def main() -> None:
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    for old in FILES_DIR.iterdir():
        if old.is_file():
            old.unlink()

    docs_out: list[dict[str, Any]] = []
    file_map: dict[str, Path] = {}

    # Sinh bản gốc trước, bản sao sau để copy nguyên byte.
    ordered = sorted(corpus.DOCUMENTS, key=lambda d: (d["duplicate_of"] is not None, d["id"]))
    for doc in ordered:
        fmt = doc["format"]
        if fmt == "bundle":
            path = None
            filename = None
            audit = "bundle metadata"
        elif doc["duplicate_of"]:
            source = file_map[doc["duplicate_of"]]
            filename = f"{doc['id']}_{slugify(doc['title'])}_dup{source.suffix}"
            path = FILES_DIR / filename
            shutil.copyfile(source, path)
            audit = "bản sao byte-for-byte"
        else:
            ext = {"pdf_text": ".pdf", "pdf_scan": ".pdf", "pdf_mixed": ".pdf", "docx": ".docx", "pptx": ".pptx"}[fmt]
            filename = f"{doc['id']}_{slugify(doc['title'])}{ext}"
            path = _build_file(doc, filename)
            audit = _audit_file(doc, path)
            file_map[doc["id"]] = path

        if path is not None and doc["duplicate_of"] is None:
            file_map[doc["id"]] = path

        sha = sha256_file(path) if path else None
        out = {
            **doc,
            "file": str(path.relative_to(EVAL_DIR)) if path else None,
            "sha256": sha,
            "size": path.stat().st_size if path else 0,
            "workspace_id": corpus.WORKSPACES[doc["workspace"]]["id"] if doc["workspace"] else None,
            "owner_id": corpus.USERS[doc["owner"]]["id"],
            "audit": audit,
        }
        docs_out.append(out)
        print(f"  {doc['id']:>3} {fmt:<9} {audit:<28} {filename or '(bundle)'}")

    # Bản sao cần hash của bản gốc; kiểm tra sau khi đã có đủ docs.
    for doc in docs_out:
        if doc["duplicate_of"]:
            original = next(d for d in docs_out if d["id"] == doc["duplicate_of"])
            assert doc["sha256"] == original["sha256"], f"{doc['id']} copy sai hash"

    questions_out = [dict(q) for q in corpus.QUESTIONS]
    validate(docs_out, questions_out)

    manifest = {
        "dataset_version": corpus.DATASET_VERSION,
        "description": "Bộ 30 tài liệu tổng hợp tiếng Việt cho baseline tìm kiếm toàn văn.",
        "users": corpus.USERS,
        "workspaces": corpus.WORKSPACES,
        "documents": docs_out,
        "summary": {
            "documents": len(docs_out),
            "questions": len(questions_out),
            "splits": {
                split: {
                    "documents": len([d for d in docs_out if d["split"] == split]),
                    "questions": len([q for q in questions_out if q["split"] == split]),
                }
                for split in ("calibration", "evaluation")
            },
            "formats": {
                fmt: len([d for d in docs_out if d["format"] == fmt])
                for fmt in sorted({d["format"] for d in docs_out})
            },
            "duplicates": len([d for d in docs_out if d["duplicate_of"]]),
            "bundles": len([d for d in docs_out if d["format"] == "bundle"]),
        },
    }
    manifest["dataset_hash"] = hashlib.sha256(
        json.dumps(
            {"documents": docs_out, "questions": questions_out},
            ensure_ascii=False,
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    (EVAL_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (EVAL_DIR / "questions.json").write_text(
        json.dumps(
            {
                "dataset_version": corpus.DATASET_VERSION,
                "questions": questions_out,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    shutil.rmtree(RUNTIME_DIR, ignore_errors=True)
    print(
        f"\nOK: {len(docs_out)} tài liệu, {len(questions_out)} câu hỏi. "
        f"Manifest: {EVAL_DIR / 'manifest.json'}"
    )


if __name__ == "__main__":
    main()
