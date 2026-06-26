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

function renderToc(toc) {
  const items = Array.isArray(toc) ? toc : [];
  if (!items.length) return "";

  return `
    <nav class="paper-toc" aria-label="Paper sections">
      <h2>Contents</h2>
      <ol>
        ${items
          .map(
            (item) => `
              <li class="toc-level-${Math.min(Math.max(Number(item.level) || 2, 2), 4)}">
                <a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a>
              </li>
            `,
          )
          .join("")}
      </ol>
    </nav>
  `;
}

function renderList(block) {
  const items = Array.isArray(block.items) ? block.items : [];
  if (!items.length) return "";

  return `
    <ul class="paper-list">
      ${items.map((item) => `<li class="list-level-${Number(item.level) || 0}">${escapeHtml(item.text)}</li>`).join("")}
    </ul>
  `;
}

function renderTable(block) {
  const rows = Array.isArray(block.rows) ? block.rows : [];
  if (!rows.length) return "";

  return `
    <div class="paper-table-wrap">
      <table class="paper-table">
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderBlock(block, index) {
  const text = escapeHtml(block.text || "");

  if (block.type === "heading") {
    const level = Math.min(Math.max(Number(block.level) || 2, 2), 4);
    const id = block.id ? ` id="${escapeHtml(block.id)}"` : "";
    return `<h${level}${id} class="paper-heading paper-heading-${level}">${text}</h${level}>`;
  }

  if (block.type === "image") {
    const thumb = block.thumb || block.src;
    const full = block.src || block.thumb;
    return `
      <figure class="paper-figure">
        <img class="lazy-paper-image" src="${escapeHtml(thumb)}" data-src="${escapeHtml(full)}" alt="${escapeHtml(block.alt || `Research figure ${index + 1}`)}" ${imageAttributes(block)} loading="lazy" decoding="async" />
      </figure>
    `;
  }

  if (block.type === "caption") {
    return `<p class="paper-caption">${text}</p>`;
  }

  if (block.type === "list") {
    return renderList(block);
  }

  if (block.type === "table") {
    return renderTable(block);
  }

  return `<p>${text}</p>`;
}

function normalizedBlocks(paper) {
  const title = paper.title || "";
  let skippedTitle = false;

  return (paper.blocks || []).filter((block) => {
    if (!skippedTitle && block.type === "heading" && block.level === 1 && block.text === title) {
      skippedTitle = true;
      return false;
    }
    if (block.type === "paragraph" && (/^junyi zhao/i.test(block.text || "") || String(block.text || "").includes("@"))) {
      return false;
    }
    return Boolean(block.text || block.src || block.rows || block.items);
  });
}

function activateLazyImages() {
  const images = [...document.querySelectorAll(".lazy-paper-image[data-src]")];
  if (!("IntersectionObserver" in window)) {
    images.forEach((image) => {
      image.src = image.dataset.src;
      image.removeAttribute("data-src");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        image.src = image.dataset.src;
        image.removeAttribute("data-src");
        observer.unobserve(image);
      });
    },
    { rootMargin: "600px 0px" },
  );

  images.forEach((image) => observer.observe(image));
}

function renderPaper(paper, metaPaper) {
  const title = escapeHtml(paper.title || metaPaper.title || "Research manuscript");
  const summary = escapeHtml(paper.summary || metaPaper.summary || "");
  const authors = escapeHtml(paper.authors || "");
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
    <div class="paper-layout">
      ${renderToc(paper.toc)}
      <div class="paper-content">
        ${blocks.map(renderBlock).join("")}
      </div>
    </div>
  `;
  activateLazyImages();
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
