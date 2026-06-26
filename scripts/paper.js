async function loadJson(path, fallback) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`Could not load ${path}`, error);
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function imageAttributes(block) {
  const width = Number(block.width) || 1200;
  const height = Number(block.height) || 800;
  return `width="${width}" height="${height}"`;
}

function renderBlock(block, index) {
  const text = escapeHtml(block.text || "");

  if (block.type === "heading") {
    const level = Math.min(Math.max(Number(block.level) || 2, 2), 3);
    return `<h${level} class="paper-heading paper-heading-${level}">${text}</h${level}>`;
  }

  if (block.type === "image") {
    return `
      <figure class="paper-figure">
        <img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || `Research figure ${index + 1}`)}" ${imageAttributes(block)} loading="${index < 4 ? "eager" : "lazy"}" decoding="async" />
      </figure>
    `;
  }

  if (block.type === "caption") {
    return `<p class="paper-caption">${text}</p>`;
  }

  return `<p>${text}</p>`;
}

function normalizedBlocks(paper) {
  const title = paper.title || "";
  let skippedTitle = false;

  return (paper.blocks || []).filter((block) => {
    if (!skippedTitle && block.type === "paragraph" && block.text === title) {
      skippedTitle = true;
      return false;
    }
    if (block.type === "paragraph" && /^junyi zhao/i.test(block.text || "")) {
      return false;
    }
    return Boolean(block.text || block.src);
  });
}

function paperAuthors(paper) {
  const authorBlock = (paper.blocks || []).find((block) => {
    return block.type === "paragraph" && /^junyi zhao/i.test(block.text || "");
  });
  return authorBlock?.text || "";
}

function renderPaper(paper, metaPaper) {
  const title = escapeHtml(paper.title || metaPaper.title || "Research manuscript");
  const summary = escapeHtml(paper.summary || metaPaper.summary || "");
  const authors = escapeHtml(paperAuthors(paper));
  const docx = paper.docx || metaPaper.docx || "";
  const blocks = normalizedBlocks(paper);

  document.title = `${paper.title || metaPaper.title || "Research"} | 赵钧毅`;
  document.querySelector("#paper-detail").innerHTML = `
    <header class="paper-header">
      <a class="back-link" href="index.html#research">Back to research</a>
      <p class="project-kicker">Research manuscript</p>
      <h1>${title}</h1>
      ${authors ? `<p class="paper-authors">${authors}</p>` : ""}
      ${summary ? `<p class="paper-abstract">${summary}</p>` : ""}
      ${docx ? `<a class="download-link" href="${escapeHtml(docx)}" target="_blank" rel="noreferrer">Download Word file</a>` : ""}
    </header>
    <div class="paper-content">
      ${blocks.map(renderBlock).join("")}
    </div>
  `;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("paper");
  const papers = await loadJson("data/papers.json", []);
  const metaPaper = papers.find((paper) => paper.slug === slug);

  if (!metaPaper) {
    document.querySelector("#paper-detail").innerHTML = `
      <header class="paper-header">
        <a class="back-link" href="index.html#research">Back to research</a>
        <h1>Paper not found</h1>
        <p>The selected research page could not be loaded. Please return to the homepage and choose a paper again.</p>
      </header>
    `;
    return;
  }

  const paper = await loadJson(metaPaper.content, metaPaper);
  renderPaper(paper, metaPaper);
}

init();
