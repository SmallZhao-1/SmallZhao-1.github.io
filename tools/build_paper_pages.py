from __future__ import annotations

import json
import re
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PAPER_CONTENT_DIR = DATA / "paper-content"
PAPERS_DIR = ROOT / "assets" / "papers"
DOCS_DIR = ROOT / "assets" / "docs"

PAPER_SOURCES = [
    ("heal", ROOT / "heal.docx"),
    ("manuscript", ROOT / "Manuscript.docx"),
]

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
}

HEADING_HINTS = {
    "abstract",
    "keywords",
    "introduction",
    "literature review",
    "methodology",
    "methods",
    "results",
    "discussion",
    "conclusion",
    "references",
}


@dataclass
class ImageAsset:
    source_name: str
    public_path: str
    width: int | None
    height: int | None


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def clean_text(value: str) -> str:
    value = value.replace("\xa0", " ")
    replacements = {
        "鈥檚": "'s",
        "鈥檛": "n't",
        "鈥": "'",
        "鈥?": "-",
        "鈥?": "-",
        "鈥攁": "-a",
        "鈥擟": "C",
        "鈧?": "2",
        "銆?": ".",
        "锛圲TCI锛塼o": " (UTCI) to",
        "虏": "2",
        "臋": "e",
    }
    for old, new in replacements.items():
        value = value.replace(old, new)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def paragraph_text(paragraph: ET.Element) -> str:
    parts = []
    for node in paragraph.iter():
        if node.tag == f"{{{NS['w']}}}t" and node.text:
            parts.append(node.text)
        elif node.tag == f"{{{NS['w']}}}tab":
            parts.append(" ")
        elif node.tag == f"{{{NS['w']}}}br":
            parts.append("\n")
    return clean_text("".join(parts))


def paragraph_style(paragraph: ET.Element) -> str:
    style = paragraph.find("./w:pPr/w:pStyle", NS)
    return style.attrib.get(f"{{{NS['w']}}}val", "") if style is not None else ""


def heading_level(text: str, style: str, index: int) -> int | None:
    normalized_style = style.lower()
    normalized_text = clean_text(text).lower().rstrip(":")

    match = re.search(r"heading\s*([1-6])", normalized_style)
    if match:
        return min(int(match.group(1)), 3)

    if "title" in normalized_style and index < 4:
        return 1

    if normalized_text in HEADING_HINTS:
        return 2

    if re.match(r"^\d+(\.\d+)*\.?\s+[A-Z]", text) and len(text) < 120:
        return 2

    return None


def image_rel_ids(paragraph: ET.Element) -> list[str]:
    rel_ids = []
    for blip in paragraph.findall(".//a:blip", NS):
        rel_id = blip.attrib.get(f"{{{NS['r']}}}embed")
        if rel_id:
            rel_ids.append(rel_id)
    return rel_ids


def docx_relationships(zf: zipfile.ZipFile) -> dict[str, str]:
    rel_path = "word/_rels/document.xml.rels"
    tree = ET.fromstring(zf.read(rel_path))
    rels = {}
    for rel_node in tree:
        rel_id = rel_node.attrib.get("Id")
        target = rel_node.attrib.get("Target", "")
        if rel_id and target.startswith("media/"):
            rels[rel_id] = f"word/{target}"
    return rels


def export_images(zf: zipfile.ZipFile, slug: str) -> dict[str, ImageAsset]:
    target_dir = PAPERS_DIR / slug
    target_dir.mkdir(parents=True, exist_ok=True)

    media_names = [
        name
        for name in zf.namelist()
        if name.startswith("word/media/") and not name.endswith("/")
    ]

    assets = {}
    for index, media_name in enumerate(media_names, start=1):
        suffix = Path(media_name).suffix.lower() or ".bin"
        output = target_dir / f"image-{index:02d}{suffix}"
        with zf.open(media_name) as src, output.open("wb") as dst:
            shutil.copyfileobj(src, dst)

        width = height = None
        try:
            with Image.open(output) as img:
                width, height = img.size
        except Exception:
            pass

        assets[media_name] = ImageAsset(
            source_name=media_name,
            public_path=rel(output),
            width=width,
            height=height,
        )
    return assets


def document_blocks(docx_path: Path, slug: str) -> tuple[list[dict], dict[str, ImageAsset]]:
    with zipfile.ZipFile(docx_path) as zf:
        rels = docx_relationships(zf)
        assets = export_images(zf, slug)
        document = ET.fromstring(zf.read("word/document.xml"))
        body = document.find("w:body", NS)
        if body is None:
            return [], assets

        blocks: list[dict] = []
        image_count = 0
        paragraph_index = 0
        for child in body:
            if child.tag != f"{{{NS['w']}}}p":
                continue

            text = paragraph_text(child)
            style = paragraph_style(child)
            rel_ids = image_rel_ids(child)

            for rel_id in rel_ids:
                media_name = rels.get(rel_id)
                asset = assets.get(media_name or "")
                if not asset:
                    continue

                image_count += 1
                blocks.append(
                    {
                        "type": "image",
                        "src": asset.public_path,
                        "alt": f"{slug} figure {image_count}",
                        "width": asset.width,
                        "height": asset.height,
                    }
                )

            if not text:
                continue

            level = heading_level(text, style, paragraph_index)
            if level:
                block = {"type": "heading", "level": level, "text": text}
            elif re.match(r"^(fig\.?|figure)\s*\d+", text, re.I):
                block = {"type": "caption", "text": text}
            else:
                block = {"type": "paragraph", "text": text}

            blocks.append(block)
            paragraph_index += 1

    return compact_blocks(blocks), assets


def compact_blocks(blocks: list[dict]) -> list[dict]:
    compacted: list[dict] = []
    for block in blocks:
        if (
            block["type"] == "paragraph"
            and compacted
            and compacted[-1]["type"] == "paragraph"
            and len(compacted[-1]["text"]) < 80
            and len(block["text"]) < 80
        ):
            compacted[-1]["text"] = clean_text(f"{compacted[-1]['text']} {block['text']}")
            continue
        compacted.append(block)
    return compacted


def first_text_block(blocks: list[dict], title: str, min_len: int = 120) -> str:
    for block in blocks:
        text = block.get("text", "")
        if text == title or text.lower().startswith(("junyi zhao", "keywords")):
            continue
        if block.get("type") == "paragraph" and len(text) >= min_len:
            return text
    for block in blocks:
        text = block.get("text", "")
        if text == title or text.lower().startswith(("junyi zhao", "keywords")):
            continue
        if block.get("type") == "paragraph":
            return block["text"]
    return ""


def title_from_blocks(blocks: list[dict], fallback: str) -> str:
    for block in blocks[:8]:
        text = block.get("text", "")
        if (
            block.get("type") == "paragraph"
            and 8 <= len(text) <= 220
            and not text.lower().startswith(("junyi zhao", "keywords"))
        ):
            return text
    for block in blocks[:8]:
        text = block.get("text", "")
        if block.get("type") == "heading" and text.lower() != "abstract" and 8 <= len(text) <= 220:
            return text
    return fallback


def first_reasonable_image(assets: dict[str, ImageAsset]) -> str:
    for asset in assets.values():
        if asset.width and asset.height and asset.width >= 500 and asset.height >= 260:
            return asset.public_path
    for asset in assets.values():
        return asset.public_path
    return ""


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def build() -> None:
    papers = []
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    for slug, source in PAPER_SOURCES:
        blocks, assets = document_blocks(source, slug)
        title = title_from_blocks(blocks, source.stem)
        abstract = first_text_block(blocks, title)
        source_out = DOCS_DIR / source.name
        shutil.copy2(source, source_out)

        paper = {
            "slug": slug,
            "title": title,
            "summary": abstract[:700],
            "cover": first_reasonable_image(assets),
            "docx": rel(source_out),
            "content": f"data/paper-content/{slug}.json",
            "images": [asset.public_path for asset in list(assets.values())[:8]],
        }
        papers.append(paper)

        write_json(
            PAPER_CONTENT_DIR / f"{slug}.json",
            {
                "slug": slug,
                "title": title,
                "summary": abstract,
                "docx": rel(source_out),
                "blocks": blocks,
            },
        )

    write_json(DATA / "papers.json", papers)
    print(f"Built {len(papers)} paper pages.")


if __name__ == "__main__":
    build()
