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

function projectTags(project) {
  const tags = [project.theme, ...(Array.isArray(project.tags) ? project.tags : [])].filter(Boolean);
  return [...new Set(tags)].map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function renderProject(project, index) {
  const title = escapeHtml(project.title || `作品 ${String(index + 1).padStart(2, "0")}`);
  const summary = escapeHtml(project.summary || "说明待补充。");
  const images = projectPageImages(project);

  document.title = `${title} | 赵钧毅`;
  document.querySelector("#project-detail").innerHTML = `
    <div class="project-header">
      <a class="back-link" href="index.html#projects">Back to selected works</a>
      <p class="project-kicker">Selected Work${project.pages ? ` / Pages ${escapeHtml(project.pages)}` : ""}</p>
      <h1>${title}</h1>
      <p>${summary}</p>
      <div class="project-actions">
        <a class="button-link" href="${escapeHtml(project.pdf)}" target="_blank" rel="noreferrer">Open original PDF</a>
      </div>
      <div class="tagline">${projectTags(project)}</div>
    </div>
    <div class="project-pages">
      ${images
        .map(
          (image, pageIndex) => `
            <figure class="project-page">
              <img src="${escapeHtml(image)}" alt="${title} page ${pageIndex + 1}" loading="${pageIndex === 0 ? "eager" : "lazy"}" />
            </figure>
          `,
        )
        .join("")}
    </div>
  `;
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
