"""Extractive answers and summaries. Every returned sentence comes from its cited chunk."""
import re
from collections import Counter

from app.services.search_service import remove_accents


def normalized(text):
    return " ".join(re.findall(r"\w+", remove_accents(text.casefold())))


_STOP = set(normalized("là gì có của các một trong thì cho được những với người và sẽ nào hãy cho biết thế như bao nhiêu tại sao vì làm theo đến bằng về này đó hay đang").split())


def terms(text):
    return set(normalized(text).split()) - _STOP


def sentences(body):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", body) if s.strip()]


def _fits_question(question, sentence):
    q, s = normalized(question), normalized(sentence)
    if "nam nao" in q:
        return bool(re.search(r"\b(?:1[5-9]|20)\d{2}\b", s))
    if "bao nhieu" in q:
        target = re.search(r"bao nhieu ([a-z0-9]+)", q)
        return bool(re.search(r"\b(\d+|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\b", s)) and (
            not target or target[1] in s.split()
        )
    if any(word in q for word in ("phia nao", "ben nao", "huong nao")):
        if not re.search(r"\b(trai|phai|tren|duoi|bac|nam|dong|tay)\b", s):
            return False
        # A passage naming both branches or denying the claim is only related evidence.
        if "khong" in s.split() or ("trai" in s.split() and "phai" in s.split()):
            return False
        if "lon nhat" in q and "lon nhat" not in s:
            return False
    return True


def answer(question, citations):
    query = terms(question)
    if not query:
        return {"status": "insufficient", "answer": None, "citations": []}
    candidates = []
    for rank, citation in enumerate(citations):
        lines = sentences(citation["text"])
        for i, sentence in enumerate(lines):
            if sentence.endswith("?"):
                continue
            quote = sentence
            # A pronoun or transition may depend on the immediately preceding condition.
            if i and re.match(r"(khi đó|do đó|vì vậy|trường hợp này|nó\b|then\b)", sentence, re.I):
                start = citation["text"].find(lines[i-1])
                end = citation["text"].find(sentence, start + len(lines[i-1])) + len(sentence)
                quote = citation["text"][start:end]
            if not _fits_question(question, quote):
                continue
            words = terms(quote)
            overlap = len(query & words)
            score = overlap / max(1, len(query))
            if score < 0.55 or overlap < min(2, len(query)) or not words - query:
                continue
            candidates.append((score, -rank, -i, quote, citation))
    if candidates:
        _, _, _, quote, source = max(candidates, key=lambda row: row[:3])
        return {"status": "answered", "answer": quote, "citations": [source]}
    return {"status": "insufficient", "answer": None, "citations": []}


def summarize(citations):
    sections = []
    for chunk in citations:
        label = chunk["heading"] or str(chunk["location"].get("page") or chunk["location"].get("slide") or chunk["chunk_id"])
        if not sections or sections[-1][0] != label:
            sections.append((label, []))
        sections[-1][1].extend((s, chunk) for s in sentences(chunk["text"]))
    seen = []
    items = []
    for _, section in sections:
        frequency = Counter(word for line, _ in section for word in terms(line))
        candidates = [(line, chunk) for line, chunk in section if terms(line)
                      and all(len(terms(line) & prior) / len(terms(line) | prior) < 0.8 for prior in seen)]
        if not candidates:
            continue
        def relevance(item):
            line, chunk = item
            words = terms(line)
            return (sum(frequency[w] for w in words) / len(words) ** 0.5
                    + len(words & terms(chunk["heading"])))
        line, chunk = max(candidates, key=relevance)
        seen.append(terms(line))
        items.append({"text": line, "citation": chunk})
    return items


def build_summary_text(items) -> str:
    """Nối các câu đại diện thành một đoạn văn duy nhất, loại câu trùng, chuẩn hóa khoảng trắng."""
    if not items:
        return ""
    seen = set()
    result = []
    for it in items:
        sentence = it.get("text", "").strip() if isinstance(it, dict) else str(it).strip()
        if not sentence:
            continue
        cleaned = " ".join(sentence.split())
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return " ".join(result)


def format_preview_text(text: str | None, max_chars: int = 400) -> str | None:
    """Chuẩn hóa khoảng trắng và cắt ngắn preview tối đa 400 ký tự (ưu tiên cuối câu hoặc ranh giới từ)."""
    if not text:
        return None
    cleaned = " ".join(text.split())
    if not cleaned:
        return None
    if len(cleaned) <= max_chars:
        return cleaned

    sub = cleaned[:max_chars]
    sentence_matches = [m.end() for m in re.finditer(r"[.!?](?:\s|$)", sub)]
    if sentence_matches and sentence_matches[-1] >= 60:
        return sub[:sentence_matches[-1]].rstrip()

    last_space = sub.rfind(" ")
    if last_space > 0:
        return sub[:last_space].rstrip() + "…"
    return sub + "…"
