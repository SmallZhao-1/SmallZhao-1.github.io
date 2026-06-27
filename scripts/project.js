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
    back: "返回代表作品",
    selectedWork: "代表作品",
    pages: "页码",
    keywords: "关键词：",
    notFoundTitle: "未找到项目",
    notFoundText: "无法加载所选项目。请返回主页后重新选择作品。",
    fallbackTitle: "作品",
    fallbackSummary: "说明待补充。",
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
    back: "Back to selected works",
    selectedWork: "Selected Work",
    pages: "Pages",
    keywords: "Keywords:",
    notFoundTitle: "Project not found",
    notFoundText: "The selected project could not be loaded. Please return to the homepage and choose a work again.",
    fallbackTitle: "Work",
    fallbackSummary: "Description to be added.",
    titleSuffix: "Junyi Zhao",
  },
};

const supportedLanguages = Object.keys(translations);
let currentLanguage = getInitialLanguage();
let projectState = { projects: [], project: null, index: -1 };

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

function projectPageImages(project) {
  if (Array.isArray(project.images) && project.images.length) return project.images;

  const pages = String(project.pages || "")
    .split("-")
    .map((item) => Number.parseInt(item, 10))
    .filter(Number.isFinite);
  const total = pages.length === 2 ? pages[1] - pages[0] + 1 : 1;

  return Array.from({ length: Math.max(total, 1) }, (_, index) => {
    return `assets/projects/${project.slug}/page-${index + 1}.png`;
  });
}

function optimizedProjectImage(image) {
  return image.replace(/\.png$/i, ".webp");
}

function previewProjectImage(image) {
  return image.replace(/\.png$/i, "-preview.webp");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(src);
    image.onerror = reject;
    image.src = src;
  });
}

function upgradeProjectImage(image) {
  const full = image.dataset.src;
  if (!full) return;

  const fallback = image.dataset.fallback;
  loadImage(full)
    .catch(() => (fallback ? loadImage(fallback) : Promise.reject()))
    .then((src) => {
      image.src = src;
      image.removeAttribute("data-src");
      image.classList.add("is-loaded");
    })
    .catch(() => {
      image.removeAttribute("data-src");
    });
}

function activateProgressiveProjectImages() {
  const images = [...document.querySelectorAll(".progressive-project-image[data-src]")];
  if (!images.length) return;

  if (!("IntersectionObserver" in window)) {
    images.forEach(upgradeProjectImage);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        upgradeProjectImage(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "1400px 0px" },
  );

  images.forEach((image) => observer.observe(image));
}

function prewarmProjectImages(images) {
  const fullImages = images.map(optimizedProjectImage).slice(1, 4);
  const warm = () => {
    fullImages.forEach((src) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warm, { timeout: 1200 });
  } else {
    window.setTimeout(warm, 300);
  }
}

function projectKeywords(project) {
  const keywords = localized(project, "keywords") || project.keywords;
  if (Array.isArray(keywords)) return keywords.filter(Boolean).join(", ");
  return keywords || "";
}

function renderProject(project, index) {
  updateHomeLinks();
  const title = escapeHtml(localized(project, "title") || `${currentText().fallbackTitle} ${String(index + 1).padStart(2, "0")}`);
  const summary = escapeHtml(localized(project, "summary") || currentText().fallbackSummary);
  const keywords = escapeHtml(projectKeywords(project));
  const images = projectPageImages(project);

  document.title = `${title} | ${currentText().titleSuffix}`;
  document.querySelector("#project-detail").innerHTML = `
    <div class="project-header">
      <a class="back-link" href="index.html?lang=${currentLanguage}#projects">${currentText().back}</a>
      <p class="project-kicker">${currentText().selectedWork}${project.pages ? ` / ${currentText().pages} ${escapeHtml(project.pages)}` : ""}</p>
      <h1>${title}</h1>
      <p>${summary}</p>
      <p class="project-keywords"><span>${currentText().keywords}</span>${keywords ? ` ${keywords}` : ""}</p>
    </div>
    <div class="project-pages">
      ${images
        .map(
          (image, pageIndex) => {
            const full = escapeHtml(optimizedProjectImage(image));
            const preview = escapeHtml(previewProjectImage(image));
            const fallback = escapeHtml(image);
            return `
            <figure class="project-page">
              <img class="progressive-project-image" src="${preview}" data-src="${full}" data-fallback="${fallback}" alt="${title} page ${pageIndex + 1}" width="1400" height="991" loading="${pageIndex === 0 ? "eager" : "lazy"}" decoding="async" fetchpriority="${pageIndex === 0 ? "high" : "auto"}" onerror="this.onerror=null;this.src=this.dataset.src || this.dataset.fallback" />
            </figure>
          `;
          },
        )
        .join("")}
    </div>
  `;
  activateProgressiveProjectImages();
  prewarmProjectImages(images);
}

function renderNotFound() {
  updateHomeLinks();
  document.querySelector("#project-detail").innerHTML = `
    <div class="project-header">
      <a class="back-link" href="index.html?lang=${currentLanguage}#projects">${currentText().back}</a>
      <h1>${currentText().notFoundTitle}</h1>
      <p>${currentText().notFoundText}</p>
    </div>
  `;
}

function setLanguage(language) {
  currentLanguage = supportedLanguages.includes(language) ? language : "zh";
  window.localStorage.setItem("homepageLanguage", currentLanguage);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", currentLanguage);
  window.history.replaceState({}, "", url);

  if (projectState.project) renderProject(projectState.project, projectState.index);
  else renderNotFound();
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("project");
  const projects = await loadJson("data/projects.json", []);
  const index = projects.findIndex((project) => project.slug === slug);
  const project = projects[index];
  projectState = { projects, project, index };

  document.querySelector("#language-toggle")?.addEventListener("click", () => {
    setLanguage(currentLanguage === "zh" ? "en" : "zh");
  });

  if (!project) {
    renderNotFound();
    return;
  }

  renderProject(project, index);
}

init();
