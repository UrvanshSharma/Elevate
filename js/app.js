/**
 * Elevate Main Application Module
 * Handles DOM rendering for all platform sections:
 * Overview, Student Profile, Resumes & Certificates, Project Portfolio,
 * Peer Interview Hub, Learning Resources, and Placement Drive filtering,
 * as well as scroll storytelling, capability pillar HUD, and authentication bootstrap.
 */
(function(root) {
  "use strict";

  const Data = root.ElevateData || {
    DEFAULT_SKILLS: [],
    SEED_DATA: {
      overview: {}, resumes: [], certificates: [], projects: [],
      companies: [], interviewExperiences: [], resources: [], defaultStudent: {}
    }
  };

  const Utils = root.ElevateUtils || {
    byId: function(id) { return document.getElementById(id); },
    escapeHtml: function(s) { return s; },
    formatCgpa: function(v) { return Number(v || 0).toFixed(1); }
  };

  // Mutable application state initialized from seed data
  const state = {
    searchQuery: "",
    data: JSON.parse(JSON.stringify(Data.SEED_DATA)),
    skills: (Data.DEFAULT_SKILLS || []).slice(),
    activePillar: 0
  };

  // Pillar metadata for Scene 3: The Transformation
  const PILLARS = [
    {
      id: 0,
      module: "MODULE_01 // IDENTITY_ENGINE",
      badge: "Verified Identity",
      title: "Student Profile & Resumes",
      desc: "Elevate consolidates your verified GPA, technical skill tags, and role-specific resume variants (SDE, Frontend, Full Stack) into a single centralized repository.",
      target: "#profile"
    },
    {
      id: 1,
      module: "MODULE_02 // PORTFOLIO_INDEX",
      badge: "Verified Credentials",
      title: "Projects & Course Certifications",
      desc: "Showcase practical software projects with tech stack badges alongside verified credentials from freeCodeCamp, Coursera, and Udemy, ready for recruiter inspection.",
      target: "#portfolio"
    },
    {
      id: 2,
      module: "MODULE_03 // MATCHING_ENGINE",
      badge: "Opportunity Intelligence",
      title: "Placement Drives & Eligibility",
      desc: "Automated eligibility cross-referencing checks your CGPA and tech stack against upcoming on-campus drives from Infosprint Tech and Nexa Digital in real-time.",
      target: "#placements"
    },
    {
      id: 3,
      module: "MODULE_04 // PREPARATION_HUB",
      badge: "Peer Knowledge",
      title: "Interview Hub & Study Packs",
      desc: "Crowdsourced technical interview logs, difficulty ratings, key takeaways, and curated revision packs for Data Structures, Async JavaScript, and Campus Aptitude.",
      target: "#interviews"
    }
  ];

  /**
   * Render platform overview title, description, and key problem points.
   */
  function renderOverview() {
    const titleEl = Utils.byId("project-title");
    const descEl = Utils.byId("project-description");
    if (titleEl && state.data.overview.title) {
      titleEl.textContent = state.data.overview.title;
    }
    if (descEl && state.data.overview.description) {
      descEl.textContent = state.data.overview.description;
    }

    const probContainer = Utils.byId("problem-points");
    if (probContainer && Array.isArray(state.data.overview.problemPoints)) {
      let htmlContent = "";
      for (let i = 0; i < state.data.overview.problemPoints.length; i++) {
        const point = state.data.overview.problemPoints[i];
        htmlContent += `
          <div class="col-md-6">
            <div class="nested-subcard">
              <span class="badge-status-lime mb-2" style="width:fit-content;">POINT 0${i + 1}</span>
              <div class="text-white small fw-medium" style="line-height:1.5;">${Utils.escapeHtml(point)}</div>
            </div>
          </div>
        `;
      }
      probContainer.innerHTML = htmlContent;
    }
  }

  /**
   * Render student technical skills tags.
   * @param {string[]} skillsArray - Array of skill names.
   */
  function renderSkills(skillsArray) {
    const container = Utils.byId("student-skills");
    if (!container) return;

    const list = Array.isArray(skillsArray) ? skillsArray : state.skills;
    let htmlContent = "";
    for (let i = 0; i < list.length; i++) {
      const skill = list[i];
      htmlContent += `<span class="skill-tag-editorial">${Utils.escapeHtml(skill)}</span>`;
    }
    container.innerHTML = htmlContent;
  }

  /**
   * Render placement drive list filtered by search query.
   * @param {string} [query] - Optional query string to filter companies.
   */
  function renderCompanies(query) {
    const container = Utils.byId("company-list");
    if (!container) return;

    if (typeof query === "string") {
      state.searchQuery = query.toLowerCase().trim();
    }

    const companies = state.data.companies || [];
    const filtered = [];

    for (let i = 0; i < companies.length; i++) {
      const comp = companies[i];
      const fullText = (comp.name + " " + comp.role + " " + comp.eligibility).toLowerCase();
      if (fullText.includes(state.searchQuery)) {
        filtered.push(comp);
      }
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="nested-subcard text-secondary small">No matching company drives found for "${Utils.escapeHtml(state.searchQuery)}".</div>`;
      return;
    }

    let htmlContent = "";
    for (let i = 0; i < filtered.length; i++) {
      const c = filtered[i];
      htmlContent += `
        <div class="nested-subcard d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <h5 class="fw-bold text-white mb-0" style="font-family:var(--font-display); font-size:1.35rem; text-transform:uppercase;">${Utils.escapeHtml(c.name)}</h5>
              <span class="badge-status-lime">${Utils.escapeHtml(c.status)}</span>
            </div>
            <p class="small text-secondary mb-1">${Utils.escapeHtml(c.role)} • <strong class="text-white">${Utils.escapeHtml(c.eligibility)}</strong></p>
            <small style="color:var(--text-muted); font-family:var(--font-mono); font-size:0.75rem;">Registration Deadline: ${Utils.escapeHtml(c.deadline)}</small>
          </div>
          <button type="button" class="btn btn-outline-secondary btn-sm fw-bold rounded-pill text-white border-secondary" onclick="document.getElementById('open-auth').click();">Apply via Elevate →</button>
        </div>
      `;
    }
    container.innerHTML = htmlContent;
  }

  /**
   * Render active and backup resume versions.
   */
  function renderResumes() {
    const container = Utils.byId("resume-list");
    if (!container) return;

    const resumes = state.data.resumes || [];
    let htmlContent = "";
    for (let i = 0; i < resumes.length; i++) {
      const r = resumes[i];
      htmlContent += `
        <div class="asset-item-row">
          <div>
            <strong class="d-block small text-white">${Utils.escapeHtml(r.title)}</strong>
            <small style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">${Utils.escapeHtml(r.detail)}</small>
          </div>
          <span class="badge-status-lime">${Utils.escapeHtml(r.status)}</span>
        </div>
      `;
    }
    container.innerHTML = htmlContent;
  }

  /**
   * Render verified credentials and course certifications.
   */
  function renderCertificates() {
    const container = Utils.byId("certificate-grid");
    if (!container) return;

    const certificates = state.data.certificates || [];
    let htmlContent = "";
    for (let i = 0; i < certificates.length; i++) {
      const c = certificates[i];
      htmlContent += `
        <div class="asset-item-row">
          <div>
            <strong class="d-block small text-white">${Utils.escapeHtml(c.title)}</strong>
            <small style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">${Utils.escapeHtml(c.issuer)}</small>
          </div>
          <span class="badge-status-cyan">${Utils.escapeHtml(c.tag)}</span>
        </div>
      `;
    }
    container.innerHTML = htmlContent;
  }

  /**
   * Render featured student projects.
   */
  function renderProjects() {
    const container = Utils.byId("project-grid");
    if (!container) return;

    const projects = state.data.projects || [];
    let htmlContent = "";
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];

      let stackBadges = "";
      if (Array.isArray(p.stack)) {
        for (let j = 0; j < p.stack.length; j++) {
          stackBadges += `<span class="skill-tag-editorial" style="font-size:0.7rem; padding:4px 10px; margin-right:4px;">${Utils.escapeHtml(p.stack[j])}</span>`;
        }
      }

      htmlContent += `
        <div class="col-md-6">
          <div class="nested-subcard">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="fw-bold mb-0 text-white" style="font-family:var(--font-display); font-size:1.35rem; text-transform:uppercase;">${Utils.escapeHtml(p.name)}</h5>
                <span class="badge-status-cyan">${Utils.escapeHtml(p.status)}</span>
              </div>
              <p class="small text-secondary mb-3">${Utils.escapeHtml(p.desc)}</p>
            </div>
            <div class="d-flex flex-wrap gap-1 mt-auto">
              ${stackBadges}
            </div>
          </div>
        </div>
      `;
    }
    container.innerHTML = htmlContent;
  }

  /**
   * Render peer interview experiences cards.
   */
  function renderInterviews() {
    const container = Utils.byId("interview-list");
    if (!container) return;

    const experiences = state.data.interviewExperiences || [];
    let htmlContent = "";
    for (let i = 0; i < experiences.length; i++) {
      const item = experiences[i];
      htmlContent += `
        <div class="col-md-4">
          <div class="nested-subcard">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="fw-bold text-white mb-0" style="font-family:var(--font-display); font-size:1.3rem; text-transform:uppercase;">${Utils.escapeHtml(item.company)}</h5>
                <span class="badge-status-subtle">${Utils.escapeHtml(item.difficulty)}</span>
              </div>
              <p class="small fw-bold mb-2" style="color:var(--accent-lime); font-family:var(--font-mono); font-size:0.75rem;">${Utils.escapeHtml(item.role)}</p>
              <p class="small text-secondary mb-0" style="line-height:1.5;">${Utils.escapeHtml(item.takeaway)}</p>
            </div>
          </div>
        </div>
      `;
    }
    container.innerHTML = htmlContent;
  }

  /**
   * Render preparation study packs.
   */
  function renderResources() {
    const container = Utils.byId("resource-list");
    if (!container) return;

    const resources = state.data.resources || [];
    let htmlContent = "";
    for (let i = 0; i < resources.length; i++) {
      const item = resources[i];
      htmlContent += `
        <div class="col-md-4">
          <div class="nested-subcard">
            <div>
              <span class="badge-status-cyan mb-2" style="display:inline-block;">${Utils.escapeHtml(item.category)}</span>
              <h5 class="fw-bold text-white mb-2" style="font-family:var(--font-display); font-size:1.3rem; text-transform:uppercase;">${Utils.escapeHtml(item.title)}</h5>
              <p class="small text-secondary mb-0" style="line-height:1.5;">${Utils.escapeHtml(item.desc)}</p>
            </div>
          </div>
        </div>
      `;
    }
    container.innerHTML = htmlContent;
  }

  /**
   * Render all application sections.
   */
  function renderAll() {
    renderOverview();
    renderSkills(state.skills);
    renderCompanies();
    renderResumes();
    renderCertificates();
    renderProjects();
    renderInterviews();
    renderResources();
  }

  /**
   * Display temporary toast or status message on UI.
   * @param {string} text - Message text.
   */
  function showStatusMessage(text) {
    const statusMsg = Utils.byId("upload-status");
    if (!statusMsg) return;

    statusMsg.textContent = text;
    statusMsg.classList.remove("d-none");
    setTimeout(function() {
      statusMsg.classList.add("d-none");
    }, 3000);
  }

  /**
   * Update the HUD Preview Screen in Scene 3: The Transformation.
   * @param {number} index - Index of selected capability pillar (0-3).
   */
  function setPillar(index) {
    state.activePillar = index;
    const p = PILLARS[index];
    if (!p) return;

    const moduleLabel = Utils.byId("hud-module-label");
    const badge = Utils.byId("hud-badge");
    const title = Utils.byId("hud-title");
    const desc = Utils.byId("hud-desc");
    const cta = Utils.byId("hud-cta");

    if (moduleLabel) moduleLabel.textContent = p.module;
    if (badge) badge.textContent = p.badge;
    if (title) title.textContent = p.title;
    if (desc) desc.textContent = p.desc;
    if (cta) cta.setAttribute("href", p.target);

    // Update active state on pillar list items
    const items = document.querySelectorAll(".pillar-item");
    items.forEach(function(el, i) {
      if (i === index) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });

    // Update HUD dots
    const dots = document.querySelectorAll(".hud-dot");
    dots.forEach(function(dot, i) {
      if (i === (index % 3)) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });
  }

  /**
   * Bind interactive storytelling: scroll parallax for Scene 2 & 3,
   * live footer clock, section spy, and pillar click listeners.
   */
  function initStorytelling() {
    // 1. Pillar Click Listeners
    const pillarItems = document.querySelectorAll(".pillar-item");
    pillarItems.forEach(function(item, idx) {
      item.addEventListener("click", function() {
        setPillar(idx);
      });
      item.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setPillar(idx);
        }
      });
    });

    // 2. Live Footer Clock
    function updateClock() {
      const clockEl = Utils.byId("footer-clock");
      if (clockEl) {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, "0");
        const mins = String(now.getMinutes()).padStart(2, "0");
        const secs = String(now.getSeconds()).padStart(2, "0");
        clockEl.textContent = "2026 // TIME: " + hrs + ":" + mins + ":" + secs + " LOCAL // ELEVATE CORE ACTIVE";
      }
    }
    updateClock();
    setInterval(updateClock, 1000);

    // 3. Scroll Choreography (Scene 2 Parallax Shards)
    const problemScene = Utils.byId("scene-problem");
    const shards = document.querySelectorAll(".shard");

    let isTicking = false;

    function onScroll() {
      if (!isTicking) {
        window.requestAnimationFrame(function() {
          handleScrollProgress();
          handleSectionSpy();
          isTicking = false;
        });
        isTicking = true;
      }
    }

    function handleScrollProgress() {
      if (!problemScene || shards.length === 0) return;

      // Check if user prefers reduced motion
      const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced || window.innerWidth < 768) return;

      const rect = problemScene.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Progress through Scene 2: from entering (rect.top <= viewportHeight) to exiting (rect.bottom <= 0)
      const totalScrollable = rect.height + viewportHeight;
      const currentScroll = viewportHeight - rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));

      // Choreograph each shard with distinct offset and rotation
      shards.forEach(function(shard, idx) {
        const speed = parseFloat(shard.getAttribute("data-speed")) || 1.0;
        let xOffset = 0;
        let yOffset = 0;
        let rotate = 0;

        switch (idx) {
          case 0: // Resume: drifts left to center
            xOffset = (progress - 0.4) * 80 * speed;
            yOffset = (progress - 0.4) * -60 * speed;
            rotate = -4 + progress * 6;
            break;
          case 1: // Cert: drifts right to center
            xOffset = (progress - 0.4) * -70 * speed;
            yOffset = (progress - 0.4) * -40 * speed;
            rotate = 3 - progress * 5;
            break;
          case 2: // Project: rises from lower left
            xOffset = (progress - 0.4) * -50 * speed;
            yOffset = (progress - 0.4) * 70 * speed;
            rotate = 2 + progress * 4;
            break;
          case 3: // Drive: rises from lower right
            xOffset = (progress - 0.4) * 70 * speed;
            yOffset = (progress - 0.4) * -70 * speed;
            rotate = -3 - progress * 5;
            break;
          case 4: // Interview: rises from bottom
            xOffset = (progress - 0.4) * -40 * speed;
            yOffset = (progress - 0.4) * 50 * speed;
            rotate = 5 - progress * 7;
            break;
        }

        // Convergence scale at high scroll progress
        const scale = progress > 0.7 ? Math.max(0.85, 1 - (progress - 0.7) * 0.4) : 1;
        shard.style.transform = "translate3d(" + xOffset.toFixed(1) + "px, " + yOffset.toFixed(1) + "px, 0) rotate(" + rotate.toFixed(1) + "deg) scale(" + scale.toFixed(2) + ")";
      });

      // Automatically advance pillar as user scrolls through Scene 3
      const transScene = Utils.byId("scene-transformation");
      if (transScene) {
        const transRect = transScene.getBoundingClientRect();
        if (transRect.top < viewportHeight * 0.6 && transRect.bottom > 0) {
          const transProgress = Math.max(0, Math.min(1, (viewportHeight * 0.6 - transRect.top) / transRect.height));
          const targetPillar = Math.min(3, Math.floor(transProgress * 4));
          if (targetPillar !== state.activePillar) {
            setPillar(targetPillar);
          }
        }
      }
    }

    // 4. Section Spy for Sidebar Navigation Highlighting
    const sections = ["overview", "profile", "assets", "portfolio", "interviews", "resources", "placements"];
    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link-custom");

    function handleSectionSpy() {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      let currentSectionId = "";

      for (let i = 0; i < sections.length; i++) {
        const sec = Utils.byId(sections[i]);
        if (sec) {
          const top = sec.offsetTop - 120;
          const height = sec.offsetHeight;
          if (scrollY >= top && scrollY < top + height) {
            currentSectionId = sections[i];
            break;
          }
        }
      }

      if (currentSectionId) {
        navLinks.forEach(function(link) {
          if (link.getAttribute("href") === "#" + currentSectionId) {
            link.classList.add("active");
          } else {
            link.classList.remove("active");
          }
        });
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  /**
   * Bind event listeners for company search, resume upload, and resume download.
   */
  function bindEvents() {
    const searchInput = Utils.byId("company-search");
    if (searchInput) {
      searchInput.addEventListener("input", function(e) {
        renderCompanies(e.target.value);
      });
    }

    const uploadBtn = Utils.byId("upload-resume");
    const fileInput = Utils.byId("resume-file");
    const downloadBtn = Utils.byId("download-resume");

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener("click", function() {
        fileInput.click();
      });

      fileInput.addEventListener("change", function(e) {
        const file = e.target.files && e.target.files[0];
        if (file) {
          state.data.resumes.unshift({
            title: "Resume - " + file.name,
            detail: "File size: " + (file.size / 1024).toFixed(1) + " KB",
            status: "Latest"
          });
          renderResumes();
          showStatusMessage("Uploaded " + file.name + " successfully!");
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", function() {
        showStatusMessage("Downloading active resume PDF...");
      });
    }
  }

  /**
   * Bootstrap the entire application.
   */
  function init() {
    renderAll();
    bindEvents();
    initStorytelling();

    const Auth = root.ElevateAuth;
    if (Auth && typeof Auth.init === "function") {
      Auth.init({
        defaultStudent: (Data.SEED_DATA && Data.SEED_DATA.defaultStudent) || {
          name: "Aarav Sharma",
          branch: "B.Tech in Computer Science & Engineering",
          cgpa: 8.9,
          year: 2026
        },
        defaultSkills: Data.DEFAULT_SKILLS || [],
        formatCgpa: Utils.formatCgpa,
        renderSkills: renderSkills
      });
    }
  }

  // Automatically initialize when DOM is ready
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  const ElevateApp = {
    init: init,
    renderAll: renderAll,
    renderOverview: renderOverview,
    renderSkills: renderSkills,
    renderCompanies: renderCompanies,
    renderResumes: renderResumes,
    renderCertificates: renderCertificates,
    renderProjects: renderProjects,
    renderInterviews: renderInterviews,
    renderResources: renderResources,
    showStatusMessage: showStatusMessage,
    setPillar: setPillar,
    getState: function() { return state; }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ElevateApp;
  } else {
    root.ElevateApp = ElevateApp;
    root.ElevateDashboard = ElevateApp; // Backward compatibility alias
  }
})(typeof window !== "undefined" ? window : globalThis);
