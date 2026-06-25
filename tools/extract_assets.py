from __future__ import annotations

import json
import re
import shutil
import subprocess
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from docx import Document
from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
DATA = ROOT / "data"
PROJECTS_DIR = ASSETS / "projects"
PAPERS_DIR = ASSETS / "papers"
DOCS_DIR = ASSETS / "docs"

PORTFOLIO_PDF = ROOT / "赵钧毅-作品集.pdf"
CV_PDF = ROOT / "CV.pdf"

PROJECT_RANGES = [
    ("project-01", 3, 7),
    ("project-02", 8, 14),
    ("project-03", 15, 18),
    ("project-04", 19, 24),
    ("project-05", 25, 29),
    ("project-06", 30, 32),
    ("project-07", 33, 35),
    ("project-08", 36, 39),
    ("project-09", 40, 41),
]

PAPER_SOURCES = [
    ("heal", ROOT / "heal.docx"),
    ("manuscript", ROOT / "Manuscript.docx"),
]


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def ensure_dirs() -> None:
    for path in [ASSETS, DATA, PROJECTS_DIR, PAPERS_DIR, DOCS_DIR]:
        path.mkdir(parents=True, exist_ok=True)


def render_pdf_page(pdf_path: Path, page: int, output_prefix: Path, width: int = 1200) -> Path:
    cmd = [
        "pdftoppm",
        "-f",
        str(page),
        "-l",
        str(page),
        "-png",
        "-singlefile",
        "-scale-to-x",
        str(width),
        "-scale-to-y",
        "-1",
        str(pdf_path),
        str(output_prefix),
    ]
    subprocess.run(cmd, check=True)
    return output_prefix.with_suffix(".png")


def split_projects() -> list[dict]:
    reader = PdfReader(str(PORTFOLIO_PDF))
    projects = []
    for index, (slug, start, end) in enumerate(PROJECT_RANGES, start=1):
        writer = PdfWriter()
        for page_number in range(start, end + 1):
            writer.add_page(reader.pages[page_number - 1])

        project_pdf = PROJECTS_DIR / f"{slug}.pdf"
        with project_pdf.open("wb") as f:
            writer.write(f)

        cover = render_pdf_page(PORTFOLIO_PDF, start, PROJECTS_DIR / f"{slug}-cover")
        projects.append(
            {
                "slug": slug,
                "title": f"作品 {index:02d}",
                "summary": "项目标题和说明待补充。可在 data/projects.json 中修改。",
                "pages": f"{start}-{end}",
                "cover": rel(cover),
                "pdf": rel(project_pdf),
                "tags": ["Portfolio"],
            }
        )
    return projects


def extract_pdf_text_with_pypdf(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    parts = []
    for page in reader.pages:
        text = page.extract_text() or ""
        parts.append(text)
    return "\n".join(parts)


def extract_cv() -> dict:
    cv_out = DOCS_DIR / "CV.pdf"
    shutil.copy2(CV_PDF, cv_out)
    text = extract_pdf_text_with_pypdf(CV_PDF)
    compact_lines = [line.strip() for line in text.splitlines() if line.strip()]

    name = "赵钧毅"
    email_match = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text)
    phone_match = re.search(r"(?:\+?86[-\s]?)?1[3-9]\d{9}", text)

    return {
        "name": name,
        "headline": "Portfolio / Personal Homepage",
        "email": email_match.group(0) if email_match else "",
        "phone": phone_match.group(0) if phone_match else "",
        "location": "",
        "bio": "个人介绍待补充。建议用 2-4 句话概括你的方向、能力、关注的问题和正在寻找的机会。",
        "cv": rel(cv_out),
    }


def docx_text(docx_path: Path) -> list[str]:
    doc = Document(str(docx_path))
    paragraphs = []
    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def extract_docx_images(docx_path: Path, target_dir: Path) -> list[Path]:
    target_dir.mkdir(parents=True, exist_ok=True)
    images = []
    with zipfile.ZipFile(docx_path) as zf:
        media = [name for name in zf.namelist() if name.startswith("word/media/")]
        for i, name in enumerate(media, start=1):
            suffix = Path(name).suffix.lower() or ".bin"
            out = target_dir / f"image-{i:02d}{suffix}"
            with zf.open(name) as src, out.open("wb") as dst:
                shutil.copyfileobj(src, dst)
            images.append(out)
    return images


def first_reasonable_image(images: list[Path]) -> str:
    for image in images:
        if image.suffix.lower() in {".png", ".jpg", ".jpeg"} and image.stat().st_size > 30_000:
            return rel(image)
    return rel(images[0]) if images else ""


def guess_title(paragraphs: list[str], fallback: str) -> str:
    for text in paragraphs[:12]:
        clean = re.sub(r"\s+", " ", text).strip()
        if 8 <= len(clean) <= 180 and not clean.lower().startswith(("abstract", "keywords")):
            return clean
    return fallback


def guess_abstract(paragraphs: list[str]) -> str:
    for i, text in enumerate(paragraphs):
        if text.strip().lower() in {"abstract", "摘要"} and i + 1 < len(paragraphs):
            return paragraphs[i + 1][:700]
        lowered = text.lower()
        if lowered.startswith("abstract") and len(text) > 30:
            return re.sub(r"^abstract[:\s-]*", "", text, flags=re.I)[:700]
    candidates = [p for p in paragraphs if len(p) > 120]
    return candidates[0][:700] if candidates else "论文简介待补充。"


def extract_papers() -> list[dict]:
    papers = []
    for slug, source in PAPER_SOURCES:
        paper_dir = PAPERS_DIR / slug
        images = extract_docx_images(source, paper_dir)
        paragraphs = docx_text(source)
        title = guess_title(paragraphs, source.stem)
        abstract = guess_abstract(paragraphs)
        source_out = DOCS_DIR / source.name
        shutil.copy2(source, source_out)
        papers.append(
            {
                "slug": slug,
                "title": title,
                "summary": abstract,
                "cover": first_reasonable_image(images),
                "docx": rel(source_out),
                "images": [rel(img) for img in images[:8]],
                "note": "标题、摘要和封面为自动提取结果，可在 data/papers.json 中修改。",
            }
        )
    return papers


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    ensure_dirs()
    projects = split_projects()
    profile = extract_cv()
    papers = extract_papers()
    write_json(DATA / "projects.json", projects)
    write_json(DATA / "profile.json", profile)
    write_json(DATA / "papers.json", papers)
    print(f"Extracted {len(projects)} projects, {len(papers)} papers.")


if __name__ == "__main__":
    main()
