const fallbackProfile = {
  name: "赵钧毅",
  headline: "Portfolio / Personal Homepage",
  email: "zhaojunyi20040110@gmail.com",
  phone: "18774986412",
  location: "待补充",
  bio: "个人介绍待补充。建议用 2-4 句话概括你的方向、能力、关注的问题和正在寻找的机会。",
  cv: "assets/docs/CV.pdf",
  avatar: "",
};

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

function text(value, fallback = "待补充") {
  return value && String(value).trim() ? value : fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sentence(value) {
  const clean = text(value, "说明待补充。");
  return clean.length > 220 ? `${clean.slice(0, 220)}...` : clean;
}

function setProfile(profile) {
  const safeProfile = { ...fallbackProfile, ...profile };
  document.title = `${text(safeProfile.name, "Homepage")} | Homepage`;
  document.querySelector("#profile-name").textContent = text(safeProfile.name, "Homepage");
  document.querySelector("#profile-headline").textContent = text(safeProfile.headline, fallbackProfile.headline);
  document.querySelector("#profile-bio").textContent = text(safeProfile.bio, fallbackProfile.bio);
  document.querySelector("#profile-phone").textContent = text(safeProfile.phone);
  document.querySelector("#profile-location").textContent = text(safeProfile.location);

  const email = text(safeProfile.email, fallbackProfile.email);
  const emailLink = document.querySelector("#profile-email");
  emailLink.textContent = email;
  emailLink.href = `mailto:${email}`;

  for (const link of [document.querySelector("#profile-cv"), document.querySelector("#cv-link-footer")]) {
    link.href = text(safeProfile.cv, fallbackProfile.cv);
  }

  const avatar = document.querySelector("#avatar");
  if (safeProfile.avatar) {
    avatar.innerHTML = `<img src="${escapeHtml(safeProfile.avatar)}" alt="${escapeHtml(safeProfile.name)}" />`;
  } else {
    avatar.textContent = text(safeProfile.name, "赵").slice(0, 1);
  }
}

function renderTags(tags = []) {
  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function projectEntry(project, index) {
  const title = escapeHtml(project.title || `作品 ${String(index + 1).padStart(2, "0")}`);
  const summary = escapeHtml(sentence(project.summary));
  const badge = `Pages ${escapeHtml(project.pages || "")}`;
  return `
    <article class="entry">
      <a class="entry-media" href="${escapeHtml(project.pdf)}" target="_blank" rel="noreferrer">
        <span class="badge">${badge}</span>
        <img src="${escapeHtml(project.cover)}" alt="${title} cover" loading="lazy" />
      </a>
      <div class="entry-body">
        <h3 class="entry-title"><a href="${escapeHtml(project.pdf)}" target="_blank" rel="noreferrer">${title}</a></h3>
        <p class="entry-authors"><strong>赵钧毅</strong></p>
        <ul class="entry-summary">
          <li>${summary}</li>
        </ul>
        <div class="tagline">${renderTags(project.tags || ["Portfolio"])}</div>
      </div>
    </article>
  `;
}

function paperEntry(paper) {
  const title = escapeHtml(paper.title || "Research manuscript");
  const summary = escapeHtml(sentence(paper.summary));
  return `
    <article class="entry">
      <a class="entry-media" href="${escapeHtml(paper.docx)}" target="_blank" rel="noreferrer">
        <span class="badge">DOCX</span>
        <img src="${escapeHtml(paper.cover)}" alt="${title} cover" loading="lazy" />
      </a>
      <div class="entry-body">
        <h3 class="entry-title"><a href="${escapeHtml(paper.docx)}" target="_blank" rel="noreferrer">${title}</a></h3>
        <p class="entry-authors"><strong>赵钧毅</strong> et al.</p>
        <ul class="entry-summary">
          <li>${summary}</li>
        </ul>
        <div class="tagline">
          <span class="tag">Research</span>
          <span class="tag">Manuscript</span>
        </div>
      </div>
    </article>
  `;
}

async function init() {
  const [profile, projects, papers] = await Promise.all([
    loadJson("data/profile.json", fallbackProfile),
    loadJson("data/projects.json", []),
    loadJson("data/papers.json", []),
  ]);

  setProfile(profile);
  document.querySelector("#projects-list").innerHTML = projects.map(projectEntry).join("");
  document.querySelector("#papers-list").innerHTML = papers.map(paperEntry).join("");
}

init();
