const fallbackProfile = {
  name: "赵钧毅",
  headline: "Portfolio / Personal Homepage",
  email: "zhaojunyi20040110@gmail.com",
  phone: "18774986412",
  location: "待补充",
  school: "待补充",
  bio: "个人介绍待补充。建议用 2-4 句话概括你的方向、能力、关注的问题和正在寻找的机会。",
  cv: "assets/docs/CV.pdf",
  avatar: "",
  softwareSkills: [],
};

const awardFieldGuide = `Add award entries in <code>data/awards.json</code>. Each item can include <code>title</code>, <code>date</code>, <code>project</code>, <code>contribution</code>, and <code>tags</code>.`;

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

function normalizeSchool(profile) {
  return profile.school || profile.School || profile.university || profile.education;
}

function skillIcon(skill) {
  if (skill.icon) {
    return `<img src="${escapeHtml(skill.icon)}" alt="" loading="lazy" />`;
  }
  return `<span>${escapeHtml(text(skill.name, "Skill").slice(0, 1).toUpperCase())}</span>`;
}

function skillEntry(skill) {
  const name = escapeHtml(text(skill.name, "Software"));
  return `
    <article class="skill-card">
      <div class="skill-icon">${skillIcon(skill)}</div>
      <h3>${name}</h3>
    </article>
  `;
}

function setSoftwareSkills(skills) {
  const skillsList = Array.isArray(skills) ? skills : [];
  const container = document.querySelector("#software-skills");
  if (!skillsList.length) {
    container.innerHTML = `
      <p class="empty-note">
        Add software entries in <code>data/profile.json</code>. Each item can include <code>name</code>, <code>level</code>, <code>note</code>, and <code>icon</code>.
      </p>
    `;
    return;
  }
  container.innerHTML = skillsList.map(skillEntry).join("");
}

function setProfile(profile) {
  const safeProfile = { ...fallbackProfile, ...profile };
  document.title = `${text(safeProfile.name, "Homepage")} | Homepage`;
  document.querySelector("#profile-name").textContent = text(safeProfile.name, "Homepage");
  document.querySelector("#profile-headline").textContent = text(safeProfile.headline, fallbackProfile.headline);
  document.querySelector("#profile-bio").textContent = text(safeProfile.bio, fallbackProfile.bio);
  document.querySelector("#profile-phone").textContent = text(safeProfile.phone);
  document.querySelector("#profile-location").textContent = text(safeProfile.location);
  document.querySelector("#profile-school").textContent = text(normalizeSchool(safeProfile));

  const email = text(safeProfile.email, fallbackProfile.email);
  const emailLink = document.querySelector("#profile-email");
  emailLink.textContent = email;
  emailLink.href = `mailto:${email}`;

  const cvLink = document.querySelector("#profile-cv");
  if (cvLink) cvLink.href = text(safeProfile.cv, fallbackProfile.cv);

  const avatar = document.querySelector("#avatar");
  if (safeProfile.avatar) {
    avatar.innerHTML = `<img src="${escapeHtml(safeProfile.avatar)}" alt="${escapeHtml(safeProfile.name)}" />`;
  } else {
    avatar.textContent = text(safeProfile.name, "赵").slice(0, 1);
  }
}

function projectCover(project) {
  if (project.thumbnail) return project.thumbnail;
  if (project.slug) return `assets/projects/thumbs/${project.slug}-thumb.webp`;
  return project.cover;
}

function keywordTags(keywords) {
  const safeKeywords = Array.isArray(keywords)
    ? keywords.filter(Boolean)
    : String(keywords || "")
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean);
  if (!safeKeywords.length) return "";

  return `
    <div class="tagline">
      ${safeKeywords.map((keyword) => `<span class="tag">${escapeHtml(keyword)}</span>`).join("")}
    </div>
  `;
}

function projectEntry(project, index) {
  const title = escapeHtml(project.title || `作品 ${String(index + 1).padStart(2, "0")}`);
  const summary = escapeHtml(text(project.summary, "说明待补充。"));
  const badge = escapeHtml(project.theme || project.title || `作品 ${String(index + 1).padStart(2, "0")}`);
  const href = `project.html?project=${encodeURIComponent(project.slug || `project-${String(index + 1).padStart(2, "0")}`)}`;
  const cover = escapeHtml(project.cover || "");
  const thumbnail = escapeHtml(projectCover(project));
  return `
    <article class="entry">
      <a class="entry-media" href="${escapeHtml(href)}">
        <span class="badge">${badge}</span>
        <img src="${thumbnail}" alt="${title} cover" width="720" height="509" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${cover}'" />
      </a>
      <div class="entry-body">
        <h3 class="entry-title"><a href="${escapeHtml(href)}">${title}</a></h3>
        <p class="entry-summary-text">${summary}</p>
        ${keywordTags(project.keywords)}
        <a class="text-link" href="${escapeHtml(href)}">Open project</a>
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

function awardTags(tags) {
  const safeTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (!safeTags.length) return "";

  return `
    <div class="tagline">
      ${safeTags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function awardEntry(award) {
  const safeAward = award || {};
  const title = escapeHtml(text(safeAward.title || safeAward.name, "Award title"));
  const date = safeAward.date || safeAward.year || "";
  const project = safeAward.project || safeAward.projectSummary;
  const contribution = safeAward.contribution || safeAward.role || safeAward.work;

  return `
    <article class="award-card">
      <div class="award-heading">
        <h3>${title}</h3>
        ${date ? `<p>${escapeHtml(date)}</p>` : ""}
      </div>
      ${project ? `
        <div class="award-detail">
          <strong>Project overview</strong>
          <p>${escapeHtml(project)}</p>
        </div>
      ` : ""}
      ${contribution ? `
        <div class="award-detail">
          <strong>My contribution</strong>
          <p>${escapeHtml(contribution)}</p>
        </div>
      ` : ""}
      ${awardTags(safeAward.tags)}
    </article>
  `;
}

function setAwards(awards) {
  const awardsList = Array.isArray(awards) ? awards : Array.isArray(awards?.awards) ? awards.awards : [];
  const container = document.querySelector("#awards-list");
  if (!awardsList.length) {
    container.innerHTML = `<p class="empty-note">${awardFieldGuide}</p>`;
    return;
  }

  container.innerHTML = awardsList.map(awardEntry).join("");
}

async function init() {
  const [profile, projects, papers, awards] = await Promise.all([
    loadJson("data/profile.json", fallbackProfile),
    loadJson("data/projects.json", []),
    loadJson("data/papers.json", []),
    loadJson("data/awards.json", []),
  ]);

  setProfile(profile);
  setSoftwareSkills(profile.softwareSkills);
  setAwards(awards);
  document.querySelector("#projects-list").innerHTML = projects.map(projectEntry).join("");
  document.querySelector("#papers-list").innerHTML = papers.map(paperEntry).join("");
}

init();
