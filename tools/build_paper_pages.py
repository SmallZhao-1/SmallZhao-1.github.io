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

SECTION_NAMES = {
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
    "acknowledgements",
    "data availability",
}

MOJIBAKE_FIXES = {
    "鈥檚": "'s",
    "鈥檛": "n't",
    "鈥檙": "'r",
    "鈥": "'",
    "鈥?": "-",
    "鈥?": "-",
    "鈥攁": "-a",
    "鈥擟": "C",
    "鈧?": "2",
    "銆?": ".",
    "虏": "2",
    "臋": "e",
    "锛圲TCI锛塼o": " (UTCI) to",
}


@dataclass
class ImageAsset:
    source_name: str
    original: str
    display: str
    thumb: str
    width: int | None
    height: int | None


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def clean_text(value: str) -> str:
    value = value.replace("\xa0", " ")
    for old, new in MOJIBAKE_FIXES.items():
        value = value.replace(old, new)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug[:72] or "section"


def dedupe_id(base: str, used: set[str]) -> str:
    candidate = base
    index = 2
    while candidate in used:
        candidate = f"{base}-{index}"
        index += 1
    used.add(candidate)
    return candidate


def child_attr(element: ET.Element, path: str, attr: str) -> str:
    child = element.find(path, NS)
    return child.attrib.get(f"{{{NS['w']}}}{attr}", "") if child is not None else ""


def paragraph_style(paragraph: ET.Element, style_names: dict[str, str]) -> tuple[str, str]:
    style_id = child_attr(paragraph, "./w:pPr/w:pStyle", "val")
    return style_id, style_names.get(style_id, "")


def docx_style_names(zf: zipfile.ZipFile) -> dict[str, str]:
    if "word/styles.xml" not in zf.namelist():
        return {}
    tree = ET.fromstring(zf.read("word/styles.xml"))
    names: dict[str, str] = {}
    for style in tree.findall("w:style", NS):
        style_id = style.attrib.get(f"{{{NS['w']}}}styleId")
        name_node = style.find("w:name", NS)
        if style_id and name_node is not None:
            names[style_id] = name_node.attrib.get(f"{{{NS['w']}}}val", "")
    return names


def paragraph_numbering(paragraph: ET.Element) -> tuple[str, str]:
    ilvl = child_attr(paragraph, "./w:pPr/w:numPr/w:ilvl", "val")
    num_id = child_attr(paragraph, "./w:pPr/w:numPr/w:numId", "val")
    return ilvl, num_id


def text_from_element(element: ET.Element) -> str:
    parts: list[str] = []
    for node in element.iter():
        if node.tag == f"{{{NS['w']}}}t" and node.text:
            parts.append(node.text)
        elif node.tag == f"{{{NS['w']}}}tab":
            parts.append(" ")
        elif node.tag == f"{{{NS['w']}}}br":
            parts.append("\n")
    return clean_text("".join(parts))


def image_rel_ids(element: ET.Element) -> list[str]:
    rel_ids: list[str] = []
    for blip in element.findall(".//a:blip", NS):
        rel_id = blip.attrib.get(f"{{{NS['r']}}}embed")
        if rel_id:
            rel_ids.append(rel_id)
    return rel_ids


def docx_relationships(zf: zipfile.ZipFile) -> dict[str, str]:
    tree = ET.fromstring(zf.read("word/_rels/document.xml.rels"))
    rels: dict[str, str] = {}
    for rel_node in tree:
        rel_id = rel_node.attrib.get("Id")
        target = rel_node.attrib.get("Target", "")
        if rel_id and target.startswith("media/"):
            rels[rel_id] = f"word/{target}"
    return rels


def convert_image(original_path: Path, output_path: Path, max_width: int, quality: int) -> tuple[int, int]:
    with Image.open(original_path) as img:
        original_mtime = original_path.stat().st_mtime
        if output_path.exists() and output_path.stat().st_mtime >= original_mtime:
            return img.size
        if img.mode not in {"RGB", "RGBA"}:
            img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
        width, height = img.size
        if width > max_width:
            new_height = round(height * max_width / width)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, "WEBP", quality=quality, method=6)
        return width, height


def export_images(zf: zipfile.ZipFile, slug: str) -> dict[str, ImageAsset]:
    target_dir = PAPERS_DIR / slug
    target_dir.mkdir(parents=True, exist_ok=True)

    media_names = [
        name
        for name in zf.namelist()
        if name.startswith("word/media/") and not name.endswith("/")
    ]

    assets: dict[str, ImageAsset] = {}
    for index, media_name in enumerate(media_names, start=1):
        suffix = Path(media_name).suffix.lower() or ".bin"
        original = target_dir / f"image-{index:02d}{suffix}"
        with zf.open(media_name) as src, original.open("wb") as dst:
            shutil.copyfileobj(src, dst)

        display = target_dir / f"image-{index:02d}-display.webp"
        thumb = target_dir / f"image-{index:02d}-thumb.webp"
        width = height = None
        try:
            width, height = convert_image(original, display, max_width=1400, quality=82)
            convert_image(original, thumb, max_width=720, quality=72)
        except Exception:
            display = original
            thumb = original
            try:
                with Image.open(original) as img:
                    width, height = img.size
            except Exception:
                pass

        assets[media_name] = ImageAsset(
            source_name=media_name,
            original=rel(original),
            display=rel(display),
            thumb=rel(thumb),
            width=width,
            height=height,
        )

    return assets


def heading_level(text: str, style_id: str, style_name: str, paragraph_index: int) -> int | None:
    normalized_style = f"{style_id} {style_name}".lower().replace(" ", "")
    normalized_text = text.lower().strip().rstrip(":")

    match = re.search(r"heading([1-6])", normalized_style)
    if match:
        return min(int(match.group(1)), 4)

    if style_name.lower().startswith("heading "):
        number = re.search(r"(\d+)", style_name)
        if number:
            return min(int(number.group(1)), 4)

    if normalized_style == "subtitle" and normalized_text in SECTION_NAMES:
        return 2

    if normalized_text in SECTION_NAMES:
        return 2

    numbered = re.match(r"^(\d+(?:\.\d+)*)\.?\s*(.+)$", text)
    looks_like_reference = any(marker in text.lower() for marker in [" et al", "http", "doi", "available at"])
    if numbered and len(text) < 95 and not looks_like_reference:
        depth = numbered.group(1).count(".") + 1
        return min(depth + 1, 4)

    if paragraph_index == 0 and 12 <= len(text) <= 240:
        return 1

    return None


def block_from_paragraph(
    paragraph: ET.Element,
    rels: dict[str, str],
    assets: dict[str, ImageAsset],
    slug: str,
    counters: dict[str, int],
    paragraph_index: int,
    used_ids: set[str],
    style_names: dict[str, str],
) -> list[dict]:
    blocks: list[dict] = []
    text = text_from_element(paragraph)
    style_id, style_name = paragraph_style(paragraph, style_names)
    rel_ids = image_rel_ids(paragraph)

    for rel_id in rel_ids:
        media_name = rels.get(rel_id)
        asset = assets.get(media_name or "")
        if not asset:
            continue
        counters["image"] += 1
        blocks.append(
            {
                "type": "image",
                "src": asset.display,
                "thumb": asset.thumb,
                "original": asset.original,
                "alt": f"{slug} figure {counters['image']}",
                "width": asset.width,
                "height": asset.height,
            }
        )

    if not text:
        return blocks

    level = heading_level(text, style_id, style_name, paragraph_index)
    if level:
        heading_id = dedupe_id(slugify(text), used_ids)
        blocks.append({"type": "heading", "level": level, "id": heading_id, "text": text})
        return blocks

    if re.match(r"^(fig\.?|figure|table)\s*[\d.]*", text, re.I):
        blocks.append({"type": "caption", "text": text})
        return blocks

    ilvl, num_id = paragraph_numbering(paragraph)
    if style_name.lower().replace(" ", "") == "listparagraph" or num_id:
        blocks.append({"type": "listItem", "level": int(ilvl or 0), "text": text})
        return blocks

    blocks.append({"type": "paragraph", "text": text})
    return blocks


def table_to_block(table: ET.Element, rels: dict[str, str], assets: dict[str, ImageAsset], slug: str, counters: dict[str, int]) -> dict | list[dict] | None:
    image_blocks: list[dict] = []
    rows: list[list[str]] = []

    for row in table.findall("./w:tr", NS):
        cells: list[str] = []
        for cell in row.findall("./w:tc", NS):
            for rel_id in image_rel_ids(cell):
                media_name = rels.get(rel_id)
                asset = assets.get(media_name or "")
                if not asset:
                    continue
                counters["image"] += 1
                image_blocks.append(
                    {
                        "type": "image",
                        "src": asset.display,
                        "thumb": asset.thumb,
                        "original": asset.original,
                        "alt": f"{slug} figure {counters['image']}",
                        "width": asset.width,
                        "height": asset.height,
                    }
                )

            text = text_from_element(cell)
            cells.append(text)
        if any(cells):
            rows.append(cells)

    if rows and sum(len(" ".join(row)) for row in rows) > 0:
        return [*image_blocks, {"type": "table", "rows": rows}] if image_blocks else {"type": "table", "rows": rows}

    return image_blocks or None


def merge_list_items(blocks: list[dict]) -> list[dict]:
    merged: list[dict] = []
    open_list: dict | None = None
    for block in blocks:
        if block.get("type") == "listItem":
            if open_list is None:
                open_list = {"type": "list", "items": []}
                merged.append(open_list)
            open_list["items"].append({"level": block.get("level", 0), "text": block.get("text", "")})
            continue
        open_list = None
        merged.append(block)
    return merged


def document_blocks(docx_path: Path, slug: str) -> tuple[list[dict], dict[str, ImageAsset]]:
    with zipfile.ZipFile(docx_path) as zf:
        rels = docx_relationships(zf)
        style_names = docx_style_names(zf)
        assets = export_images(zf, slug)
        document = ET.fromstring(zf.read("word/document.xml"))
        body = document.find("w:body", NS)
        if body is None:
            return [], assets

        blocks: list[dict] = []
        counters = {"image": 0}
        paragraph_index = 0
        in_references = False
        used_ids: set[str] = set()

        for child in body:
            if child.tag == f"{{{NS['w']}}}p":
                new_blocks = block_from_paragraph(child, rels, assets, slug, counters, paragraph_index, used_ids, style_names)
                if text_from_element(child):
                    paragraph_index += 1
                if any(block.get("type") == "heading" and block.get("text", "").lower().strip() == "references" for block in new_blocks):
                    in_references = True
                elif in_references:
                    for block in new_blocks:
                        if block.get("type") == "heading" and re.match(r"^\d+\.?\s+", block.get("text", "")):
                            block["type"] = "paragraph"
                            block.pop("level", None)
                            block.pop("id", None)
                blocks.extend(new_blocks)
            elif child.tag == f"{{{NS['w']}}}tbl":
                table_block = table_to_block(child, rels, assets, slug, counters)
                if isinstance(table_block, list):
                    blocks.extend(table_block)
                elif table_block:
                    blocks.append(table_block)

    return merge_list_items(blocks), assets


def title_from_blocks(blocks: list[dict], fallback: str) -> str:
    for block in blocks[:10]:
        text = block.get("text", "")
        if block.get("type") == "heading" and block.get("level") == 1:
            return text
    for block in blocks[:10]:
        text = block.get("text", "")
        if block.get("type") in {"paragraph", "heading"} and 12 <= len(text) <= 240 and not text.lower().startswith(("junyi zhao", "keywords")):
            return text
    return fallback


def author_from_blocks(blocks: list[dict]) -> str:
    parts: list[str] = []
    for block in blocks[:8]:
        text = block.get("text", "")
        if text.lower().startswith("junyi zhao") or "@" in text:
            parts.append(text)
    return clean_text(" ".join(parts))


def summary_from_blocks(blocks: list[dict], title: str) -> str:
    found_abstract = False
    for block in blocks:
        if block.get("type") == "heading" and block.get("text", "").lower() == "abstract":
            found_abstract = True
            continue
        text = block.get("text", "")
        if found_abstract and block.get("type") == "paragraph" and len(text) > 80:
            return text

    for block in blocks:
        text = block.get("text", "")
        if block.get("type") == "paragraph" and len(text) > 120 and text != title and "@" not in text:
            return text
    return ""


def table_of_contents(blocks: list[dict]) -> list[dict]:
    items = []
    for block in blocks:
        if block.get("type") == "heading" and block.get("level", 9) >= 2:
            items.append({"id": block["id"], "level": block["level"], "text": block["text"]})
    return items


def first_reasonable_image(assets: dict[str, ImageAsset], attr: str = "thumb") -> str:
    for asset in assets.values():
        if asset.width and asset.height and asset.width >= 500 and asset.height >= 260:
            return getattr(asset, attr)
    for asset in assets.values():
        return getattr(asset, attr)
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
        summary = summary_from_blocks(blocks, title)
        author = author_from_blocks(blocks)
        source_out = DOCS_DIR / source.name
        shutil.copy2(source, source_out)

        papers.append(
            {
                "slug": slug,
                "title": title,
                "summary": summary[:700],
                "cover": first_reasonable_image(assets, "thumb"),
                "docx": rel(source_out),
                "content": f"data/paper-content/{slug}.json",
                "images": [asset.thumb for asset in list(assets.values())[:8]],
            }
        )

        write_json(
            PAPER_CONTENT_DIR / f"{slug}.json",
            {
                "slug": slug,
                "title": title,
                "authors": author,
                "summary": summary,
                "docx": rel(source_out),
                "toc": table_of_contents(blocks),
                "blocks": blocks,
            },
        )

    write_json(DATA / "papers.json", papers)
    print(f"Built {len(papers)} paper pages.")


if __name__ == "__main__":
    build()
