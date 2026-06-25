const fallbackProfile = {
  name: "赵钧毅",
  headline: "Portfolio / Personal Homepage",
  email: "zhaojunyi20040110@gmail.com",
  phone: "18774986412",
  location: "待补充",
  bio: "个人介绍待补充。建议用 2-4 句话概括你的方向、能力、关注的问题和正在寻找的机会。",
  cv: "assets/docs/CV.pdf",
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

function setProfile(profile) {
  const safeProfile = { ...fallbackProfile, ...profile };
  document.title = `${text(safeProfile.name, "Portfolio")} | Portfolio`;
  document.querySelector(".brand").textContent = text(safeProfile.name, "Portfolio");
  document.querySelector("h1").textContent = text(safeProfile.name, "Portfolio");
  document.querySelector("#profile-headline").textContent = text(safeProfile.headline, fallbackProfile.headline);
  document.querySelector("#profile-bio").textContent = text(safeProfile.bio, fallbackProfile.bio);
  document.querySelector("#profile-phone").textContent = text(safeProfile.phone);
  document.querySelector("#profile-location").textContent = text(safeProfile.location);

  const email = text(safeProfile.email, fallbackProfile.email);
  const emailLink = document.querySelector("#profile-email");
  emailLink.textContent = email;
  emailLink.href = `mailto:${email}`;

  for (const link of [document.querySelector("#cv-link-hero"), document.querySelector("#cv-link-footer")]) {
    link.href = text(safeProfile.cv, fallbackProfile.cv);
  }
}

function projectCard(project) {
  const tags = (project.tags || ["Portfolio"]).map((tag) => `<span class="tag">${tag}</span>`).join("");
  return `
    <a class="project-card" href="${project.pdf}" target="_blank" rel="noreferrer">
      <div class="project-cover">
        <img src="${project.cover}" alt="${project.title} cover" loading="lazy" />
      </div>
      <div class="project-content">
        <div class="project-meta">
          <span class="tag">Pages ${project.pages}</span>
          ${tags}
        </div>
        <h3>${project.title}</h3>
        <p>${project.summary}</p>
      </div>
    </a>
  `;
}

function paperCard(paper) {
  const gallery = (paper.images || [])
    .slice(0, 4)
    .map(
      (image, index) => `
        <a href="${image}" target="_blank" rel="noreferrer">
          <img src="${image}" alt="${paper.title} figure ${index + 1}" loading="lazy" />
        </a>
      `,
    )
    .join("");

  return `
    <article class="paper-card">
      <a class="paper-cover" href="${paper.cover}" target="_blank" rel="noreferrer">
        <img src="${paper.cover}" alt="${paper.title} cover" loading="lazy" />
      </a>
      <div>
        <h3>${paper.title}</h3>
        <p>${paper.summary}</p>
        <div class="card-actions">
          <a class="button secondary" href="${paper.docx}" target="_blank" rel="noreferrer">Open DOCX</a>
        </div>
        <div class="paper-gallery">${gallery}</div>
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
  document.querySelector("#projects-grid").innerHTML = projects.map(projectCard).join("");
  document.querySelector("#papers-list").innerHTML = papers.map(paperCard).join("");
  document.querySelector("#year").textContent = new Date().getFullYear();
}

init();
