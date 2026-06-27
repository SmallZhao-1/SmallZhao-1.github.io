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

function renderAuthors(authors) {
  if (Array.isArray(authors)) {
    return authors
      .filter((author) => author && author.name)
      .map((author) => {
        const name = escapeHtml(author.name);
        const sup = author.sup ? `<sup>${escapeHtml(author.sup)}</sup>` : "";
        return `${name}${sup}`;
      })
      .join(", ");
  }
  return escapeHtml(authors || "");
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
      <h2>Paper Outline</h2>
      <ol>
        ${items
          .map(
            (item) => `
              <li class="toc-level-${Math.min(Math.max(Number(item.level) || 2, 2), 4)}">
                <a href="#${escapeHtml(item.id)}"><span>${escapeHtml(item.number)}</span>${escapeHtml(item.text)}</a>
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
        <img class="lazy-paper-image" src="${escapeHtml(thumb)}" data-src="${escapeHtml(full)}" alt="${escapeHtml(block.alt || `Research figure ${index + 1}`)}" ${imageAttributes(block)} loading="lazy" decoding="async" draggable="false" />
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

function outlineDepth(rawLevel, depthByRawLevel) {
  if (rawLevel <= 1) return 1;
  const parentDepth = depthByRawLevel.get(rawLevel - 1);
  return parentDepth ? parentDepth + 1 : 1;
}

function buildOutline(blocks) {
  const counters = [];
  const depthByRawLevel = new Map();
  const outline = [];
  const numberById = new Map();

  blocks.forEach((block) => {
    if (block.type !== "heading" || !block.id) return;

    const rawLevel = Number(block.level) || 2;
    const depth = Math.min(outlineDepth(rawLevel, depthByRawLevel), 4);
    depthByRawLevel.set(rawLevel, depth);
    [...depthByRawLevel.keys()].forEach((level) => {
      if (level > rawLevel) depthByRawLevel.delete(level);
    });

    counters[depth - 1] = (counters[depth - 1] || 0) + 1;
    counters.length = depth;
    const number = counters.join(".");
    const item = { id: block.id, level: depth + 1, number, text: block.text };
    outline.push(item);
    numberById.set(block.id, number);
  });

  return { outline, numberById };
}

function renderNumberedBlock(block, index, numberById) {
  if (block.type !== "heading") return renderBlock(block, index);

  const number = numberById.get(block.id);
  const level = Math.min(Math.max(Number(block.level) || 2, 2), 4);
  const id = block.id ? ` id="${escapeHtml(block.id)}"` : "";
  const text = number ? `${number} ${block.text || ""}` : block.text || "";
  return `<h${level}${id} class="paper-heading paper-heading-${level}">${escapeHtml(text)}</h${level}>`;
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

function activateTocSpy() {
  const links = [...document.querySelectorAll(".paper-toc a[href^='#']")];
  const headings = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!links.length || !headings.length || !("IntersectionObserver" in window)) return;

  const setActive = (id) => {
    links.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    },
    { rootMargin: "-96px 0px -65% 0px" },
  );

  headings.forEach((heading) => observer.observe(heading));
}

function activateCopyGuards() {
  const root = document.querySelector("#paper-detail");
  if (!root) return;

  ["copy", "cut", "contextmenu", "selectstart"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      if (root.contains(event.target)) event.preventDefault();
    });
  });

  document.addEventListener("dragstart", (event) => {
    if (root.contains(event.target)) event.preventDefault();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && ["c", "x", "a"].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  });
}

function renderPaper(paper, metaPaper) {
  const title = escapeHtml(paper.title || metaPaper.title || "Research manuscript");
  const summary = escapeHtml(paper.summary || metaPaper.summary || "");
  const authors = renderAuthors(paper.authors || metaPaper.authors);
  const blocks = normalizedBlocks(paper);
  const { outline, numberById } = buildOutline(blocks);

  document.title = `${paper.title || metaPaper.title || "Research"} | 赵钧毅`;
  document.querySelector("#paper-detail").innerHTML = `
    <div class="paper-reader">
      ${renderToc(outline)}
      <div class="paper-main">
        <header class="paper-header">
          <a class="back-link" href="index.html#research">Back to research</a>
          <p class="project-kicker">Research manuscript</p>
          <h1>${title}</h1>
          ${authors ? `<p class="paper-authors">${authors}</p>` : ""}
          ${summary ? `<p class="paper-abstract">${summary}</p>` : ""}
        </header>
        <div class="paper-content">
          ${blocks.map((block, index) => renderNumberedBlock(block, index, numberById)).join("")}
        </div>
      </div>
    </div>
  `;
  activateLazyImages();
  activateTocSpy();
  activateCopyGuards();
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
