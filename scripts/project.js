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
  if (Array.isArray(project.keywords)) return project.keywords.filter(Boolean).join(", ");
  return project.keywords || "";
}

function renderProject(project, index) {
  const title = escapeHtml(project.title || `作品 ${String(index + 1).padStart(2, "0")}`);
  const summary = escapeHtml(project.summary || "说明待补充。");
  const keywords = escapeHtml(projectKeywords(project));
  const images = projectPageImages(project);

  document.title = `${title} | 赵钧毅`;
  document.querySelector("#project-detail").innerHTML = `
    <div class="project-header">
      <a class="back-link" href="index.html#projects">Back to selected works</a>
      <p class="project-kicker">Selected Work${project.pages ? ` / Pages ${escapeHtml(project.pages)}` : ""}</p>
      <h1>${title}</h1>
      <p>${summary}</p>
      <p class="project-keywords"><span>Keywords:</span>${keywords ? ` ${keywords}` : ""}</p>
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

async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("project");
  const projects = await loadJson("data/projects.json", []);
  const index = projects.findIndex((project) => project.slug === slug);
  const project = projects[index];

  if (!project) {
    document.querySelector("#project-detail").innerHTML = `
      <div class="project-header">
        <a class="back-link" href="index.html#projects">Back to selected works</a>
        <h1>Project not found</h1>
        <p>The selected project could not be loaded. Please return to the homepage and choose a work again.</p>
      </div>
    `;
    return;
  }

  renderProject(project, index);
}

init();
