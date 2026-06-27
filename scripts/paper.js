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

const translations = {
  zh: {
    htmlLang: "zh-CN",
    navLabel: "主导航",
    navHome: "主页",
    navProjects: "代表作品",
    navResearch: "研究论文",
    toggleLabel: "Switch to English",
    toggleText: "EN",
    tocLabel: "论文目录",
    tocTitle: "论文目录",
    back: "返回研究论文",
    kicker: "研究论文",
    notFoundTitle: "未找到论文",
    notFoundText: "无法加载所选研究页面。请返回主页后重新选择论文。",
    titleSuffix: "赵钧毅",
  },
  en: {
    htmlLang: "en",
    navLabel: "Primary navigation",
    navHome: "Homepage",
    navProjects: "Selected Works",
    navResearch: "Research",
    toggleLabel: "切换到中文",
    toggleText: "中文",
    tocLabel: "Paper sections",
    tocTitle: "Paper Outline",
    back: "Back to research",
    kicker: "Research manuscript",
    notFoundTitle: "Paper not found",
    notFoundText: "The selected research page could not be loaded. Please return to the homepage and choose a paper again.",
    titleSuffix: "Junyi Zhao",
  },
};

const supportedLanguages = Object.keys(translations);
let currentLanguage = getInitialLanguage();
let paperState = { paper: null, metaPaper: null };

function getInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("lang");
  if (supportedLanguages.includes(fromUrl)) return fromUrl;

  const stored = window.localStorage.getItem("homepageLanguage");
  return supportedLanguages.includes(stored) ? stored : "zh";
}

function currentText() {
  return translations[currentLanguage] || translations.zh;
}

function localized(source, key) {
  if (!source || typeof source !== "object") return source;
  if (currentLanguage === "en") return source[`${key}En`] || source[key];
  return source[key] || source[`${key}En`];
}

function updateHomeLinks() {
  document.documentElement.lang = currentText().htmlLang;
  document.querySelector(".topnav").setAttribute("aria-label", currentText().navLabel);
  document.querySelector('[data-nav="home"]').textContent = currentText().navHome;
  document.querySelector('[data-nav="projects"]').textContent = currentText().navProjects;
  document.querySelector('[data-nav="research"]').textContent = currentText().navResearch;
  document.querySelectorAll(".topnav a[href^='index.html']").forEach((link) => {
    const target = new URL(link.getAttribute("href"), window.location.href);
    target.searchParams.set("lang", currentLanguage);
    link.href = `${target.pathname.split("/").pop()}${target.search}${target.hash}`;
  });

  const toggle = document.querySelector("#language-toggle");
  if (toggle) {
    toggle.textContent = currentText().toggleText;
    toggle.setAttribute("aria-label", currentText().toggleLabel);
    toggle.setAttribute("title", currentText().toggleLabel);
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
    <nav class="paper-toc" aria-label="${currentText().tocLabel}">
      <h2>${currentText().tocTitle}</h2>
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
  updateHomeLinks();
  const titleText = localized(metaPaper, "title") || localized(paper, "title") || "Research manuscript";
  const summaryText = localized(metaPaper, "summary") || localized(paper, "summary") || "";
  const title = escapeHtml(titleText);
  const summary = escapeHtml(summaryText);
  const authors = renderAuthors(paper.authors || metaPaper.authors);
  const blocks = normalizedBlocks(paper);
  const { outline, numberById } = buildOutline(blocks);

  document.title = `${titleText || currentText().navResearch} | ${currentText().titleSuffix}`;
  document.querySelector("#paper-detail").innerHTML = `
    <div class="paper-reader">
      ${renderToc(outline)}
      <div class="paper-main">
        <header class="paper-header">
          <a class="back-link" href="index.html?lang=${currentLanguage}#research">${currentText().back}</a>
          <p class="project-kicker">${currentText().kicker}</p>
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

function renderNotFound() {
  updateHomeLinks();
  document.querySelector("#paper-detail").innerHTML = `
    <header class="paper-header">
      <a class="back-link" href="index.html?lang=${currentLanguage}#research">${currentText().back}</a>
      <h1>${currentText().notFoundTitle}</h1>
      <p>${currentText().notFoundText}</p>
    </header>
  `;
}

function setLanguage(language) {
  currentLanguage = supportedLanguages.includes(language) ? language : "zh";
  window.localStorage.setItem("homepageLanguage", currentLanguage);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", currentLanguage);
  window.history.replaceState({}, "", url);

  if (paperState.paper && paperState.metaPaper) renderPaper(paperState.paper, paperState.metaPaper);
  else renderNotFound();
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("paper");
  const papers = await loadJson("data/papers.json", []);
  const metaPaper = papers.find((paper) => paper.slug === slug);

  document.querySelector("#language-toggle")?.addEventListener("click", () => {
    setLanguage(currentLanguage === "zh" ? "en" : "zh");
  });

  if (!metaPaper) {
    renderNotFound();
    return;
  }

  const paper = await loadJson(metaPaper.content, metaPaper);
  paperState = { paper, metaPaper };
  renderPaper(paper, metaPaper);
}

init();
