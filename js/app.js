/**
 * Elevate Main Application Module
 * Handles DOM rendering for all platform sections:
 * Overview, Student Profile, Resumes & Certificates, Project Portfolio,
 * Peer Interview Hub, Learning Resources, and Placement Drive filtering,
 * as well as bootstrapping authentication and event listeners.
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
    skills: (Data.DEFAULT_SKILLS || []).slice()
  };

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
            <div class="p-3 rounded-3 bg-light border small text-secondary">${Utils.escapeHtml(point)}</div>
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
      htmlContent += `<span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-3 py-2 rounded-pill fw-semibold me-1 mb-1" style="background:#e0e7ff; color:#3730a3;">${Utils.escapeHtml(skill)}</span>`;
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
      container.innerHTML = `<div class="p-3 rounded-4 bg-light border text-secondary small">No matching company drives found.</div>`;
      return;
    }

    let htmlContent = "";
    for (let i = 0; i < filtered.length; i++) {
      const c = filtered[i];
      htmlContent += `
        <div class="p-3 rounded-4 bg-light border d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 class="fw-bold text-dark mb-1">${Utils.escapeHtml(c.name)}</h5>
            <p class="small text-secondary mb-1">${Utils.escapeHtml(c.role)} • <strong class="text-dark">${Utils.escapeHtml(c.eligibility)}</strong></p>
            <small class="text-muted">Deadline: ${Utils.escapeHtml(c.deadline)}</small>
          </div>
          <span class="badge bg-success px-3 py-2 rounded-pill">${Utils.escapeHtml(c.status)}</span>
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
        <div class="p-2 rounded bg-white border mb-2 d-flex justify-content-between align-items-center">
          <div>
            <strong class="d-block small text-dark">${Utils.escapeHtml(r.title)}</strong>
            <small class="text-secondary" style="font-size:0.75rem;">${Utils.escapeHtml(r.detail)}</small>
          </div>
          <span class="badge bg-success-subtle text-success border border-success border-opacity-25">${Utils.escapeHtml(r.status)}</span>
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
        <div class="p-2 rounded bg-white border d-flex justify-content-between align-items-center">
          <div>
            <strong class="d-block small text-dark">${Utils.escapeHtml(c.title)}</strong>
            <small class="text-secondary" style="font-size:0.75rem;">${Utils.escapeHtml(c.issuer)}</small>
          </div>
          <span class="badge bg-primary-subtle text-primary">${Utils.escapeHtml(c.tag)}</span>
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
          stackBadges += `<span class="badge bg-white text-secondary border small me-1">${Utils.escapeHtml(p.stack[j])}</span>`;
        }
      }

      htmlContent += `
        <div class="col-md-6">
          <div class="p-3 rounded-4 bg-light border h-100 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="fw-bold mb-0 text-dark">${Utils.escapeHtml(p.name)}</h5>
                <span class="badge bg-info-subtle text-info-emphasis">${Utils.escapeHtml(p.status)}</span>
              </div>
              <p class="small text-secondary">${Utils.escapeHtml(p.desc)}</p>
            </div>
            <div class="d-flex flex-wrap gap-1 mt-3">
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
          <div class="p-3 rounded-4 bg-light border h-100 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="fw-bold text-dark mb-0">${Utils.escapeHtml(item.company)}</h5>
                <span class="badge bg-secondary-subtle text-secondary">${Utils.escapeHtml(item.difficulty)}</span>
              </div>
              <p class="small fw-semibold text-primary mb-2">${Utils.escapeHtml(item.role)}</p>
              <p class="small text-secondary mb-0">${Utils.escapeHtml(item.takeaway)}</p>
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
          <div class="p-3 rounded-4 bg-light border h-100 d-flex flex-column justify-content-between">
            <div>
              <span class="badge bg-primary-subtle text-primary mb-2">${Utils.escapeHtml(item.category)}</span>
              <h5 class="fw-bold text-dark mb-2">${Utils.escapeHtml(item.title)}</h5>
              <p class="small text-secondary mb-0">${Utils.escapeHtml(item.desc)}</p>
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
    getState: function() { return state; }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ElevateApp;
  } else {
    root.ElevateApp = ElevateApp;
    root.ElevateDashboard = ElevateApp; // Backward compatibility alias
  }
})(typeof window !== "undefined" ? window : globalThis);
