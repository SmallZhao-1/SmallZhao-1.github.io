const fallbackProfile = {
  name: "赵钧毅",
  nameEn: "Junyi Zhao",
  headline: "个人主页",
  headlineEn: "Portfolio / Personal Homepage",
  email: "zhaojunyi20040110@gmail.com",
  phone: "18774986412",
  location: "待补充",
  locationEn: "To be added",
  school: "待补充",
  schoolEn: "To be added",
  bio: "个人介绍待补充。建议用 2-4 句话概括你的方向、能力、关注的问题和正在寻找的机会。",
  bioEn: "Profile to be added. Use two to four sentences to summarize your focus, strengths, research interests, and current opportunities.",
  cv: "assets/docs/CV.pdf",
  avatar: "",
  softwareSkills: [],
};

const translations = {
  zh: {
    htmlLang: "zh-CN",
    metaDescription: "赵钧毅的个人主页，展示作品集项目、研究论文与个人简历。",
    titleSuffix: "个人主页",
    navLabel: "主导航",
    profileLabel: "个人信息",
    navHome: "主页",
    navAbout: "关于我",
    navSkills: "软件技能",
    navAwards: "荣誉与实践经历",
    navProjects: "代表作品",
    navResearch: "研究论文",
    sectionAbout: "关于我",
    sectionSkills: "软件技能",
    sectionAwards: "荣誉与实践经历",
    sectionProjects: "代表作品",
    sectionResearch: "研究论文",
    toggleLabel: "Switch to English",
    toggleText: "EN",
    missing: "待补充",
    missingSentence: "说明待补充。",
    skillGuide: "请在 <code>data/profile.json</code> 中添加软件技能。每项可包含 <code>name</code>、<code>level</code>、<code>note</code> 和 <code>icon</code>。",
    awardGuide: "请在 <code>data/awards.json</code> 中添加奖项与实践经历。每项可包含 <code>title</code>、<code>date</code>、<code>project</code>、<code>contribution</code> 和 <code>tags</code>。",
    projectFallback: "作品",
    projectLink: "查看项目",
    projectCoverAlt: "封面",
    paperBadge: "阅读论文",
    researchTag: "研究",
    manuscriptTag: "论文",
    highlight: "本人为27FALL，目前正在寻求研究生（master or phd）学习机会，如您感兴趣，欢迎沟通交流！",
    awardProject: "项目概况",
    awardContribution: "我的贡献",
  },
  en: {
    htmlLang: "en",
    metaDescription: "Junyi Zhao's personal homepage featuring portfolio projects, research papers, and CV.",
    titleSuffix: "Homepage",
    navLabel: "Primary navigation",
    profileLabel: "Profile",
    navHome: "Homepage",
    navAbout: "About Me",
    navSkills: "Software Skills",
    navAwards: "Awards & Practical Experience",
    navProjects: "Selected Works",
    navResearch: "Research",
    sectionAbout: "About Me",
    sectionSkills: "Software Skills",
    sectionAwards: "Awards & Practical Experience",
    sectionProjects: "Selected Works",
    sectionResearch: "Research",
    toggleLabel: "切换到中文",
    toggleText: "中文",
    missing: "To be added",
    missingSentence: "Description to be added.",
    skillGuide: "Add software entries in <code>data/profile.json</code>. Each item can include <code>name</code>, <code>level</code>, <code>note</code>, and <code>icon</code>.",
    awardGuide: "Add award and practical experience entries in <code>data/awards.json</code>. Each item can include <code>title</code>, <code>date</code>, <code>project</code>, <code>contribution</code>, and <code>tags</code>.",
    projectFallback: "Work",
    projectLink: "Open project",
    projectCoverAlt: "cover",
    paperBadge: "Read paper",
    researchTag: "Research",
    manuscriptTag: "Manuscript",
    highlight: "I am applying for 2027 Fall master’s or PhD opportunities. If my profile is of interest, I would be glad to connect.",
    awardProject: "Project overview",
    awardContribution: "My contribution",
  },
};

const supportedLanguages = Object.keys(translations);
let currentLanguage = getInitialLanguage();
let pageData = null;

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

function text(value, fallback = currentText().missing) {
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
  const clean = text(value, currentText().missingSentence);
  return clean.length > 220 ? `${clean.slice(0, 220)}...` : clean;
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

function normalizeSchool(profile) {
  if (currentLanguage === "en") {
    return profile.schoolEn || profile.SchoolEn || profile.universityEn || profile.educationEn || profile.school || profile.School || profile.university || profile.education;
  }
  return profile.school || profile.School || profile.university || profile.education || profile.schoolEn;
}

function formatBio(profile) {
  const bio = text(localized(profile, "bio"), localized(fallbackProfile, "bio"));
  const highlight = currentText().highlight;
  return escapeHtml(bio).replace(escapeHtml(highlight), `<strong>${escapeHtml(highlight)}</strong>`);
}

function skillIcon(skill) {
  if (skill.icon) {
    return `<img src="${escapeHtml(skill.icon)}" alt="" loading="lazy" />`;
  }
  return `<span>${escapeHtml(text(skill.name, "Skill").slice(0, 1).toUpperCase())}</span>`;
}

function skillEntry(skill) {
  const name = escapeHtml(text(localized(skill, "name"), "Software"));
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
    container.innerHTML = `<p class="empty-note">${currentText().skillGuide}</p>`;
    return;
  }
  container.innerHTML = skillsList.map(skillEntry).join("");
}

function setProfile(profile) {
  const safeProfile = { ...fallbackProfile, ...profile };
  const displayName = text(localized(safeProfile, "name"), "Homepage");
  document.title = `${displayName} | ${currentText().titleSuffix}`;
  document.querySelector("#profile-name").textContent = displayName;
  document.querySelector("#profile-headline").textContent = text(localized(safeProfile, "headline"), localized(fallbackProfile, "headline"));
  document.querySelector("#profile-bio").innerHTML = formatBio(safeProfile);
  document.querySelector("#profile-phone").textContent = text(safeProfile.phone);
  document.querySelector("#profile-location").textContent = text(localized(safeProfile, "location"));
  document.querySelector("#profile-school").textContent = text(normalizeSchool(safeProfile));

  const email = text(safeProfile.email, fallbackProfile.email);
  const emailLink = document.querySelector("#profile-email");
  emailLink.textContent = email;
  emailLink.href = `mailto:${email}`;

  const cvLink = document.querySelector("#profile-cv");
  if (cvLink) cvLink.href = text(safeProfile.cv, fallbackProfile.cv);

  const avatar = document.querySelector("#avatar");
  if (safeProfile.avatar) {
    avatar.innerHTML = `<img src="${escapeHtml(safeProfile.avatar)}" alt="${escapeHtml(displayName)}" />`;
  } else {
    avatar.textContent = text(displayName, currentLanguage === "en" ? "J" : "赵").slice(0, 1);
  }
}

function setStaticText() {
  const copy = currentText();
  document.documentElement.lang = copy.htmlLang;
  document.querySelector('meta[name="description"]').setAttribute("content", copy.metaDescription);
  document.querySelector(".topnav").setAttribute("aria-label", copy.navLabel);
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = copy[element.dataset.i18n] || element.textContent;
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    element.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":");
      if (attr && key && copy[key]) element.setAttribute(attr, copy[key]);
    });
  });

  const toggle = document.querySelector("#language-toggle");
  if (toggle) {
    toggle.textContent = copy.toggleText;
    toggle.setAttribute("aria-label", copy.toggleLabel);
    toggle.setAttribute("title", copy.toggleLabel);
  }
}

function projectCover(project) {
  if (project.thumbnail) return project.thumbnail;
  if (project.slug) return `assets/projects/thumbs/${project.slug}-thumb.webp`;
  return project.cover;
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

function prefetchAsset(href, as = "image") {
  if (!href) return;
  const alreadyPrefetched = [...document.querySelectorAll('link[rel="prefetch"]')]
    .some((link) => link.getAttribute("href") === href);
  if (alreadyPrefetched) return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = as;
  link.href = href;
  document.head.append(link);
}

function warmProject(project) {
  if (!project || project.__warmed) return;
  project.__warmed = true;

  const pages = projectPageImages(project);
  pages
    .slice(0, 2)
    .flatMap((page, index) => (index === 0 ? [previewProjectImage(page), optimizedProjectImage(page)] : [optimizedProjectImage(page)]))
    .forEach((src) => prefetchAsset(src));
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

function detailHref(path, slugName, slug) {
  const params = new URLSearchParams({ [slugName]: slug || "" });
  params.set("lang", currentLanguage);
  return `${path}?${params.toString()}`;
}

function projectEntry(project, index) {
  const fallbackTitle = `${currentText().projectFallback} ${String(index + 1).padStart(2, "0")}`;
  const title = escapeHtml(localized(project, "title") || fallbackTitle);
  const summary = escapeHtml(text(localized(project, "summary"), currentText().missingSentence));
  const badge = escapeHtml(localized(project, "theme") || localized(project, "title") || fallbackTitle);
  const slug = project.slug || `project-${String(index + 1).padStart(2, "0")}`;
  const href = detailHref("project.html", "project", slug);
  const cover = escapeHtml(project.cover || "");
  const thumbnail = escapeHtml(projectCover(project));
  return `
    <article class="entry">
      <a class="entry-media" href="${escapeHtml(href)}" data-project-index="${index}">
        <span class="badge">${badge}</span>
        <img src="${thumbnail}" alt="${title} ${currentText().projectCoverAlt}" width="720" height="509" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" fetchpriority="${index === 0 ? "high" : "auto"}" onerror="this.onerror=null;this.src='${cover}'" />
      </a>
      <div class="entry-body">
        <h3 class="entry-title"><a href="${escapeHtml(href)}">${title}</a></h3>
        <p class="entry-summary-text">${summary}</p>
        ${keywordTags(localized(project, "keywords") || project.keywords)}
        <a class="text-link" href="${escapeHtml(href)}">${currentText().projectLink}</a>
      </div>
    </article>
  `;
}

function paperEntry(paper) {
  const title = escapeHtml(localized(paper, "title") || "Research manuscript");
  const summary = escapeHtml(sentence(localized(paper, "summary")));
  const authors = renderAuthors(paper.authors);
  const href = detailHref("paper.html", "paper", paper.slug || "");
  return `
    <article class="entry">
      <a class="entry-media" href="${escapeHtml(href)}">
        <span class="badge">${currentText().paperBadge}</span>
        <img src="${escapeHtml(paper.cover)}" alt="${title} cover" width="720" height="509" loading="lazy" decoding="async" />
      </a>
      <div class="entry-body">
        <h3 class="entry-title"><a href="${escapeHtml(href)}">${title}</a></h3>
        ${authors ? `<p class="entry-authors">${authors}</p>` : ""}
        <ul class="entry-summary">
          <li>${summary}</li>
        </ul>
        <div class="tagline">
          <span class="tag">${currentText().researchTag}</span>
          <span class="tag">${currentText().manuscriptTag}</span>
        </div>
      </div>
    </article>
  `;
}

function activateProjectWarmup(projects) {
  const links = [...document.querySelectorAll("[data-project-index]")];

  links.forEach((link) => {
    const project = projects[Number(link.dataset.projectIndex)];
    ["pointerenter", "touchstart", "focus"].forEach((eventName) => {
      link.addEventListener(eventName, () => warmProject(project), { once: true, passive: true });
    });
  });

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const project = projects[Number(entry.target.dataset.projectIndex)];
        warmProject(project);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "900px 0px" },
  );

  links.forEach((link) => observer.observe(link));
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
  const title = escapeHtml(text(localized(safeAward, "title") || localized(safeAward, "name"), currentLanguage === "en" ? "Award title" : "奖项标题"));
  const date = safeAward.date || safeAward.year || "";
  const project = localized(safeAward, "project") || localized(safeAward, "projectSummary");
  const contribution = localized(safeAward, "contribution") || localized(safeAward, "role") || localized(safeAward, "work");

  return `
    <article class="award-card">
      <div class="award-heading">
        <h3>${title}</h3>
        ${date ? `<p>${escapeHtml(date)}</p>` : ""}
      </div>
      ${project ? `
        <div class="award-detail">
          <strong>${currentText().awardProject}</strong>
          <p>${escapeHtml(project)}</p>
        </div>
      ` : ""}
      ${contribution ? `
        <div class="award-detail">
          <strong>${currentText().awardContribution}</strong>
          <p>${escapeHtml(contribution)}</p>
        </div>
      ` : ""}
      ${awardTags(localized(safeAward, "tags") || safeAward.tags)}
    </article>
  `;
}

function setAwards(awards) {
  const awardsList = Array.isArray(awards) ? awards : Array.isArray(awards?.awards) ? awards.awards : [];
  const container = document.querySelector("#awards-list");
  if (!awardsList.length) {
    container.innerHTML = `<p class="empty-note">${currentText().awardGuide}</p>`;
    return;
  }

  container.innerHTML = awardsList.map(awardEntry).join("");
}

function renderPage() {
  if (!pageData) return;
  const { profile, projects, papers, awards } = pageData;
  setStaticText();
  setProfile(profile);
  setSoftwareSkills(profile.softwareSkills);
  setAwards(awards);
  document.querySelector("#projects-list").innerHTML = projects.map(projectEntry).join("");
  document.querySelector("#papers-list").innerHTML = papers.map(paperEntry).join("");
  activateProjectWarmup(projects);
}

function setLanguage(language) {
  currentLanguage = supportedLanguages.includes(language) ? language : "zh";
  window.localStorage.setItem("homepageLanguage", currentLanguage);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", currentLanguage);
  window.history.replaceState({}, "", url);
  renderPage();
}

async function init() {
  const [profile, projects, papers, awards] = await Promise.all([
    loadJson("data/profile.json", fallbackProfile),
    loadJson("data/projects.json", []),
    loadJson("data/papers.json", []),
    loadJson("data/awards.json", []),
  ]);

  pageData = { profile, projects, papers, awards };
  document.querySelector("#language-toggle")?.addEventListener("click", () => {
    setLanguage(currentLanguage === "zh" ? "en" : "zh");
  });
  renderPage();
}

init();
