// Main frontend application for the Elevate platform
(function (root) {
  "use strict";

  const Data = root.ElevateData || {
    DEFAULT_SKILLS: [],
    SEED_DATA: {
      overview: {}, resumes: [], certificates: [], projects: [],
      companies: [], interviewExperiences: [], resources: [], defaultStudent: {}
    }
  };

  const Utils = root.ElevateUtils || {
    byId: function (id) { return document.getElementById(id); },
    escapeHtml: function (s) { return s; },
    formatCgpa: function (v) { return Number(v || 0).toFixed(1); }
  };

  // Mutable application state initialized from seed data
  const state = {
    searchQuery: "",
    data: JSON.parse(JSON.stringify(Data.SEED_DATA)),
    skills: (Data.DEFAULT_SKILLS || []).slice(),
    activePillar: 0,
    serverHasGeminiKey: false
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

  // Render overview cards in the hero section
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
      const floatClasses = ["floating-card-1", "floating-card-2", "floating-card-3", "floating-card-4"];
      const badges = ["POINT 01 // STUDY", "POINT 02 // TRACKING", "POINT 03 // CREDENTIALS", "POINT 04 // GUIDANCE"];

      for (let i = 0; i < state.data.overview.problemPoints.length; i++) {
        const point = state.data.overview.problemPoints[i];
        const animClass = floatClasses[i % floatClasses.length];
        const badgeText = badges[i] || `POINT 0${i + 1}`;
        htmlContent += `
          <div class="floating-problem-card ${animClass}">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <span class="badge" style="background:var(--accent-lime-subtle); color:var(--accent-lime); border:1px solid var(--border-lime); font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.08em; padding:2px 7px;">${badgeText}</span>
              <span class="text-secondary" style="font-family:var(--font-mono); font-size:0.68rem; opacity:0.6;">0${i + 1}</span>
            </div>
            <p class="mb-0" style="font-size:0.81rem; line-height:1.4; font-weight:500; color:var(--text-main);">${Utils.escapeHtml(point)}</p>
          </div>
        `;
      }
      probContainer.innerHTML = htmlContent;
    }
  }

  // Render student skill tags
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

  // Check if current session belongs to a registered student rather than demo
  function isRealStudent(userObj) {
    const user = (typeof userObj !== "undefined" && userObj !== null) ? userObj : getCurrentUser();
    return Boolean(user && user.email && user.email.toLowerCase() !== "aarav@elevate.edu");
  }

  // Get active user from auth module
  function getCurrentUser() {
    const Auth = root.ElevateAuth;
    return (Auth && typeof Auth.getCurrentUser === "function") ? Auth.getCurrentUser() : null;
  }

  // Deduplicate and clean student project list
  function cleanUserProjects(projects) {
    if (!Array.isArray(projects)) return [];

    const canonicalMap = new Map();

    projects.forEach(function (p) {
      if (!p) return;
      const name = (p.name || p.title || "").trim();
      const upper = name.toUpperCase();
      const desc = (p.desc || p.description || p.detail || "").trim();

      // Discard invalid placeholder or fragment items
      if (upper === "FEATURED RESUME PROJECT" || desc === "PROJECTS") return;
      if (upper === "SPEECH") return; // old wrapped fragment
      if (/^(js problem solver|elevate platform)$/i.test(name)) return;
      if (name.length < 5) return;

      // Group by canonical project key
      let key = name.toLowerCase();
      if (key.includes("layer learn")) key = "layer_learn";
      else if (key.includes("webease")) key = "webease";
      else if (key.includes("lookcraft")) key = "lookcraft";
      else if (key.includes("elevate")) key = "elevate";
      else key = name.split(/[—–-]/)[0].trim().toLowerCase();

      const item = {
        name: name,
        desc: desc || "Technical software project extracted from resume",
        stack: (Array.isArray(p.stack) && p.stack.length > 0) ? p.stack : (Array.isArray(p.techStack) && p.techStack.length > 0 ? p.techStack : ["General Tech"]),
        status: p.status || "Completed"
      };

      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, item);
      } else {
        const existing = canonicalMap.get(key);
        // Prefer clean title without "(In Progress)" or item with longer descriptive content
        const isPreferred = (!name.includes("(In Progress)") && (existing.name || "").includes("(In Progress)")) ||
                            (desc.length > (existing.desc || "").length);
        if (isPreferred) {
          canonicalMap.set(key, item);
        }
      }
    });

    return Array.from(canonicalMap.values());
  }

  // Deduplicate and clean student certificate list
  function cleanUserCertificates(certs) {
    if (!Array.isArray(certs)) return [];
    const certMap = new Map();

    certs.forEach(function (c) {
      if (!c) return;
      const title = (c.title || c.name || "").trim();
      if (!title || /^(certifications?|courses?|licenses?)$/i.test(title)) return;

      // Ensure static test/seed certificates are excluded from real student profiles
      if (/aws/i.test(title) || /practitioner/i.test(title)) {
        return;
      }
      if (/^(javascript algorithms & data structures|full stack web development|bootstrap 5 & responsive ui design)$/i.test(title)) {
        return;
      }

      let key = title.toLowerCase()
        .replace(/^(microsoft\s*certified:\s*|google\s*cloud\s*certified:\s*|aws\s*certified:\s*)/i, "")
        .replace(/\s+/g, " ")
        .trim();

      if (key.includes("azure ai")) key = "azure_ai";
      else if (key.includes("azure data")) key = "azure_data";
      else if (key.includes("neural networks")) key = "neural_networks";
      else if (key.includes("deloitte") || key.includes("forage")) key = "deloitte_analytics";

      const item = {
        title: title,
        issuer: c.issuer || c.organization || "Verified Platform",
        tag: c.tag || "Core Credential"
      };

      if (!certMap.has(key)) {
        certMap.set(key, item);
      } else {
        const existing = certMap.get(key);
        // Prefer official prefix (e.g. "Microsoft Certified: ...")
        if (title.length > (existing.title || "").length) {
          certMap.set(key, item);
        }
      }
    });

    return Array.from(certMap.values());
  }

  // Sync user profile data to dashboard state
  function applySessionData(user) {
    const activeUser = (typeof user !== "undefined") ? user : getCurrentUser();
    const isReal = isRealStudent(activeUser);

    if (isReal && activeUser) {
      // Real student account: strictly isolate real user data
      state.skills = Array.isArray(activeUser.skills) ? activeUser.skills.slice() : [];

      if (Array.isArray(activeUser.resumes) && activeUser.resumes.length > 0) {
        state.data.resumes = activeUser.resumes.slice();
      } else if (activeUser.resumeName) {
        state.data.resumes = [{
          title: "Resume - " + activeUser.resumeName,
          detail: "AI Extracted (Skills & Projects)",
          status: "Active"
        }];
      } else {
        state.data.resumes = [];
      }

      // Filter and deduplicate projects and certificates
      const cleanProjects = cleanUserProjects(activeUser.projects);
      const cleanCertificates = cleanUserCertificates(activeUser.certificates);

      state.data.projects = cleanProjects;
      state.data.certificates = cleanCertificates;

      // Permanently sync cleaned datasets to user storage
      if (activeUser && root.ElevateAuth && typeof root.ElevateAuth.updateUser === "function") {
        activeUser.projects = cleanProjects;
        activeUser.certificates = cleanCertificates;
        root.ElevateAuth.updateUser(activeUser);
      }

      // Check if user has an active resume but is missing all extracted projects or certifications
      const hasResume = (activeUser.resumes && activeUser.resumes.length > 0) || activeUser.resumeName;
      const needsAiSync = hasResume && hasGeminiApiKey() && (cleanProjects.length === 0 || state.data.certificates.length <= 1);
      if (needsAiSync) {
        setTimeout(function () {
          reanalyzeResumeWithAI(false);
        }, 500);
      }
    } else {
      // Demo Account or Logged Out: Load complete rich seed demo data
      state.skills = (Data.DEFAULT_SKILLS || []).slice();
      state.data.resumes = (Data.SEED_DATA && Data.SEED_DATA.resumes) ? JSON.parse(JSON.stringify(Data.SEED_DATA.resumes)) : [];
      state.data.projects = (Data.SEED_DATA && Data.SEED_DATA.projects) ? JSON.parse(JSON.stringify(Data.SEED_DATA.projects)) : [];
      state.data.certificates = (Data.SEED_DATA && Data.SEED_DATA.certificates) ? JSON.parse(JSON.stringify(Data.SEED_DATA.certificates)) : [];
    }

    renderSkills(state.skills);
    renderResumes();
    renderCertificates();
    renderProjects();
  }

  // Render placement drive cards with search filter
  function renderCompanies(query) {
    const container = Utils.byId("company-list");
    if (!container) return;

    if (typeof query === "string") {
      state.searchQuery = query.toLowerCase().trim();
    }

    const isReal = isRealStudent();
    const companies = state.data.companies || [];

    // If real student has no drives loaded yet and query is empty
    if (isReal && companies.length === 0 && !state.searchQuery) {
      container.innerHTML = `
        <div class="nested-subcard p-4 text-center my-3 w-100">
          <div class="text-warning mb-2" style="font-size:1.8rem;">⚡</div>
          <h6 class="fw-bold text-white mb-1">Live Campus Drives Search</h6>
          <p class="text-secondary small mb-3">Live search via Gemini AI did not return active drives right now (quota/rate limit or waiting for search). Static mock data is disabled for real student accounts.</p>
          <div class="d-flex justify-content-center gap-2 flex-wrap">
            <button type="button" class="btn btn-sm btn-primary rounded-pill fw-bold" onclick="ElevateApp.fetchLiveOpportunities(true)">Search Again ↻</button>
          </div>
        </div>
      `;
      return;
    }

    const filtered = [];
    for (let i = 0; i < companies.length; i++) {
      const comp = companies[i];
      const compName = comp.companyName || comp.name || "";
      const fullText = (compName + " " + (comp.role || "") + " " + (comp.eligibility || "")).toLowerCase();
      if (fullText.includes(state.searchQuery)) {
        filtered.push(comp);
      }
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="nested-subcard text-secondary small w-100 p-3 text-center">No matching company drives found for "${Utils.escapeHtml(state.searchQuery)}".</div>`;
      return;
    }

    let htmlContent = "";

    for (let i = 0; i < filtered.length; i++) {
      const c = filtered[i];
      const companyName = c.companyName || c.name || "Company";
      const initials = (c.logoText || (typeof Utils.getUserInitials === "function" ? Utils.getUserInitials(companyName) : "CO") || "CO").slice(0, 2).toUpperCase();
      const salaryText = c.salary || "";

      let applyButtonHtml = "";
      if (c.applyUrl === "#sample-demo" || c.isSampleMock) {
        applyButtonHtml = `<button type="button" class="btn btn-outline-warning btn-sm fw-bold rounded-pill text-warning border-warning" onclick="ElevateApp.openGeminiModal();" title="Configure Gemini API key to unlock live placement drives">Offline Demo Mode 🔒</button>`;
      } else if (c.applyUrl && c.applyUrl !== "#demo-profile") {
        applyButtonHtml = `<a href="${Utils.escapeHtml(c.applyUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm fw-bold rounded-pill text-white border-secondary d-inline-flex align-items-center gap-1" title="Open direct application link">Apply Directly ↗</a>`;
      } else {
        applyButtonHtml = `<button type="button" class="btn btn-outline-secondary btn-sm fw-bold rounded-pill text-white border-secondary" onclick="document.getElementById('open-auth').click();">Apply via Elevate →</button>`;
      }

      htmlContent += `
        <div class="placement-brick nested-subcard" role="article" aria-label="${Utils.escapeHtml(companyName)} drive details">
          <!-- Top Bar: Logo & Status Badge -->
          <div class="brick-top-bar mb-3">
            <div class="company-logo-box" aria-label="${Utils.escapeHtml(companyName)} logo">
              <span class="company-logo-initials">${Utils.escapeHtml(initials)}</span>
            </div>
            <span class="badge-status-lime">${Utils.escapeHtml(c.status || "Open Drive")}</span>
          </div>

          <!-- Primary Brick Info (Always Visible) -->
          <div class="brick-primary-info">
            <h5 class="brick-company-name mb-1">${Utils.escapeHtml(companyName)}</h5>
            <p class="brick-role-title mb-2">${Utils.escapeHtml(c.role || "Software Role")}</p>
            ${salaryText ? `
            <div class="brick-salary-tag mb-2 d-inline-flex align-items-center gap-1" title="Package / Stipend">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>${Utils.escapeHtml(salaryText)}</span>
            </div>
            ` : ''}
            <div class="brick-idle-hint d-flex align-items-center gap-2">
              <span class="brick-hint-dot"></span>
              <span>Hover for eligibility &amp; apply &darr;</span>
            </div>
          </div>

          <!-- Full Details (Revealed on Hover / Tap) -->
          <div class="brick-expanded-details">
            <div class="brick-divider my-2"></div>
            ${salaryText ? `
            <div class="brick-detail-group mb-2">
              <span class="brick-detail-label">PACKAGE / STIPEND</span>
              <p class="brick-detail-value brick-salary-highlight mb-0">${Utils.escapeHtml(salaryText)}</p>
            </div>
            ` : ''}
            <div class="brick-detail-group mb-2">
              <span class="brick-detail-label">ELIGIBILITY &amp; TECH STACK</span>
              <p class="brick-detail-value mb-0">${Utils.escapeHtml(c.eligibility || "Eligible for 2026 Batch")}</p>
            </div>
            <div class="brick-detail-group mb-3">
              <span class="brick-detail-label">APPLICATION DEADLINE</span>
              <div class="brick-deadline-tag d-flex align-items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>${Utils.escapeHtml(c.deadline || "Open Drive")}</span>
              </div>
            </div>
            <div class="brick-action-btn">
              ${applyButtonHtml}
            </div>
          </div>
        </div>
      `;
    }
    container.innerHTML = htmlContent;

    // Support touch devices or click to toggle details with automatic closing
    const bricks = container.querySelectorAll(".placement-brick");
    bricks.forEach(function (brick) {
      brick.addEventListener("click", function (e) {
        if (e.target.closest("a, button")) return;
        const wasExpanded = brick.classList.contains("is-expanded");
        bricks.forEach(function (b) { b.classList.remove("is-expanded"); });
        if (!wasExpanded) {
          brick.classList.add("is-expanded");
        }
      });

      // Automatically close when mouse leaves the card
      brick.addEventListener("mouseleave", function () {
        brick.classList.remove("is-expanded");
      });
      brick.addEventListener("pointerleave", function () {
        brick.classList.remove("is-expanded");
      });
    });

    // Clicking anywhere outside also automatically closes any open cards
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".placement-brick")) {
        const openBricks = container.querySelectorAll(".placement-brick.is-expanded");
        openBricks.forEach(function (b) {
          b.classList.remove("is-expanded");
        });
      }
    });
  }

  // Sample drives used when Gemini API is offline
  const OFFLINE_SAMPLE_COMPANIES = (Data.STATIC_OFFLINE_DRIVES || []).slice();

  // Get Gemini API key from session or storage
  function getGeminiApiKey() {
    const user = getCurrentUser();
    if (user && user.geminiApiKey && !user.geminiApiKey.includes("YOUR_GEMINI_API_KEY")) {
      return user.geminiApiKey.trim();
    }
    if (user && user.email) {
      try {
        const userSpecific = localStorage.getItem("elevate_gemini_api_key_" + user.email.toLowerCase());
        if (userSpecific && userSpecific.trim() && !userSpecific.includes("YOUR_GEMINI_API_KEY")) {
          return userSpecific.trim();
        }
      } catch (e) {}
    }
    try {
      const stored = localStorage.getItem("elevate_gemini_api_key");
      if (stored && stored.trim() && !stored.includes("YOUR_GEMINI_API_KEY")) return stored.trim();
    } catch (e) {}
    return "";
  }

  // Check if Gemini key is available (either personal key or configured on server .env)
  function hasGeminiApiKey() {
    return Boolean(getGeminiApiKey()) || Boolean(state.serverHasGeminiKey);
  }

  // Check if backend server has Gemini API key configured in .env
  async function checkServerGeminiStatus() {
    try {
      const resp = await fetch("/api/health");
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.hasGeminiKey) {
          state.serverHasGeminiKey = true;
          updateGeminiBadge();
          if (root.ElevateAuth && typeof root.ElevateAuth.updateGeminiStatus === "function") {
            root.ElevateAuth.updateGeminiStatus(true);
          }
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  // Update Gemini badge status on UI
  function updateGeminiBadge(sourceName) {
    const badge = Utils.byId("live-feed-badge");
    if (!badge) return;

    if (hasGeminiApiKey()) {
      badge.className = "badge-live-gemini cursor-pointer";
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const label = sourceName || (getGeminiApiKey() ? "Gemini AI" : "Gemini AI • Active");
      badge.innerHTML = `<span class="live-dot-green"></span> LIVE (${label} • ${timeStr})`;
    } else {
      badge.className = "badge-live-gemini badge-offline cursor-pointer";
      badge.innerHTML = `<span class="live-dot-offline"></span> GEMINI API OFFLINE`;
    }
  }

  // Open Gemini API key modal
  function openGeminiModal() {
    const input = Utils.byId("gemini-key-input");
    const statusMsg = Utils.byId("gemini-key-status-msg");
    const key = getGeminiApiKey();
    if (input) {
      input.value = key;
    }
    if (statusMsg) {
      if (key) {
        statusMsg.style.color = "#00f3a4";
        statusMsg.textContent = "● Personal Gemini API Key is configured and active.";
      } else if (state.serverHasGeminiKey) {
        statusMsg.style.color = "#00f3a4";
        statusMsg.textContent = "● Gemini API Key is loaded from server .env file and active.";
      } else {
        statusMsg.style.color = "#ff5c5c";
        statusMsg.textContent = "● Gemini AI is currently OFFLINE (No API Key in profile or .env).";
      }
    }
    const modalEl = Utils.byId("gemini-key-modal");
    if (!modalEl) return;

    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
      return;
    }

    modalEl.style.display = "block";
    modalEl.classList.add("show");
    modalEl.removeAttribute("aria-hidden");
    modalEl.setAttribute("aria-modal", "true");
  }

  // Close Gemini API key modal
  function hideGeminiModal() {
    const modalEl = Utils.byId("gemini-key-modal");
    if (!modalEl) return;

    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      return;
    }

    modalEl.style.display = "none";
    modalEl.classList.remove("show");
    modalEl.setAttribute("aria-hidden", "true");
    modalEl.removeAttribute("aria-modal");
  }

  // Save or clear user's Gemini key
  async function saveGeminiKey(key) {
    const trimmed = (key || "").trim();
    const user = getCurrentUser();

    Utils.syncStoredGeminiKey(user ? user.email : null, trimmed);

    if (user) {
      user.geminiApiKey = trimmed;
      if (root.ElevateAuth && typeof root.ElevateAuth.updateUser === "function") {
        root.ElevateAuth.updateUser(user);
      }
    }

    // Persist to backend MongoDB if user is authenticated
    const token = (root.ElevateAuth && typeof root.ElevateAuth.getToken === "function") ? root.ElevateAuth.getToken() : null;
    if (token) {
      try {
        await fetch("/api/user/gemini-key", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify({ geminiApiKey: trimmed })
        });
      } catch (err) {
        console.warn("Backend save gemini key warning:", err);
      }
    }

    if (root.ElevateAuth && typeof root.ElevateAuth.updateAuthUI === "function") {
      root.ElevateAuth.updateAuthUI();
    }

    updateGeminiBadge();
    hideGeminiModal();

    if (trimmed) {
      showStatusMessage("Gemini API key saved! Fetching live 2026 drives...");
      fetchLiveOpportunities(true);
    } else {
      showStatusMessage("Gemini API key removed. Gemini AI is now offline.");
      state.data.companies = OFFLINE_SAMPLE_COMPANIES.slice();
      renderCompanies();
    }
  }

  // Clear Gemini API key
  async function clearGeminiKey() {
    await saveGeminiKey("");
  }

  // Fetch live placement drives from server
  async function fetchLiveOpportunities(forceRefresh) {
    const hasKey = hasGeminiApiKey();
    const badge = Utils.byId("live-feed-badge");
    const syncBtn = Utils.byId("btn-sync-drives");

    // If no API key configured: stays offline, renders only 2-3 static mock companies
    if (!hasKey) {
      state.data.companies = OFFLINE_SAMPLE_COMPANIES.slice();
      renderCompanies();
      updateGeminiBadge();
      if (forceRefresh) {
        showStatusMessage("Gemini API is offline: Please add your Gemini API Key in your profile to fetch live placement drives.");
      }
      return state.data.companies;
    }

    if (badge) {
      badge.className = "badge-live-gemini cursor-pointer";
      badge.innerHTML = `<span class="spinner-grow spinner-grow-sm me-1" role="status" style="width:7px; height:7px;" aria-hidden="true"></span> SEARCHING LIVE GEMINI 2026 DRIVES...`;
    }
    if (syncBtn) {
      const svg = syncBtn.querySelector("svg");
      if (svg) svg.style.animation = "spin 0.6s linear infinite";
    }

    try {
      const apiKey = getGeminiApiKey();
      const headers = {};
      if (apiKey) {
        headers["x-gemini-key"] = apiKey;
      }
      const resp = await fetch("/api/drives/live", { headers });

      if (resp.ok) {
        const payload = await resp.json();
        if (payload.status === "ok" && Array.isArray(payload.drives) && payload.drives.length > 0) {
          if (payload.source === "gemini") {
            state.data.companies = payload.drives;
            renderCompanies();
            updateGeminiBadge("Gemini AI");
            return payload.drives;
          }
        }
      }

      // If backend returned offline or quota exceeded
      state.data.companies = OFFLINE_SAMPLE_COMPANIES.slice();
      renderCompanies();
      if (badge) {
        badge.className = "badge-live-gemini badge-offline cursor-pointer";
        badge.innerHTML = `<span class="live-dot-offline"></span> GEMINI API OFFLINE`;
      }
      return state.data.companies;
    } catch (err) {
      console.warn("Failed to fetch live drives via Gemini:", err);
      state.data.companies = OFFLINE_SAMPLE_COMPANIES.slice();
      renderCompanies();
      if (badge) {
        badge.className = "badge-live-gemini badge-offline cursor-pointer";
        badge.innerHTML = `<span class="live-dot-offline"></span> GEMINI API OFFLINE`;
      }
    } finally {
      if (syncBtn) {
        const svg = syncBtn.querySelector("svg");
        if (svg) svg.style.animation = "";
      }
    }
  }

  // Format an asset item row (resumes and certificates)
  function renderAssetRow(title, subtitle, badge) {
    return `
      <div class="asset-item-row">
        <div>
          <strong class="d-block small text-white">${Utils.escapeHtml(title || "")}</strong>
          <small style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">${Utils.escapeHtml(subtitle || "")}</small>
        </div>
        <span class="badge-status-lime">${Utils.escapeHtml(badge || "Verified")}</span>
      </div>
    `;
  }

  function renderResumeRow(r) {
    return r ? renderAssetRow(r.title || "Resume", r.detail || "", r.status || "Active") : "";
  }

  function renderCertRow(c) {
    return c ? renderAssetRow(c.title || "Certification", c.issuer || c.detail || "Verified Credential", c.tag || c.status || "Verified") : "";
  }

  // Handle disclosure drawer for stacked items
  function attachStackDrawerListeners(container) {
    if (!container) return;
    const stack = container.querySelector(".asset-stack-brick");
    if (stack) {
      stack.addEventListener("click", function (e) {
        if (e.target.closest("a, button, input")) return;
        stack.classList.toggle("is-expanded");
      });
      stack.addEventListener("mouseleave", function () {
        stack.classList.remove("is-expanded");
      });
      stack.addEventListener("mouseout", function (e) {
        if (!stack.contains(e.relatedTarget)) {
          stack.classList.remove("is-expanded");
        }
      });
      stack.addEventListener("pointerleave", function () {
        stack.classList.remove("is-expanded");
      });
    }
  }

  // Generic drawer stack renderer for asset bricks (resumes & certificates)
  function renderAssetStack(containerId, items, rowRenderer, emptyMsg, itemLabel) {
    const container = Utils.byId(containerId);
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="p-3 text-center nested-subcard my-2" style="background:var(--bg-canvas); border:1px dashed var(--border-subtle); border-radius:12px;">
          <small class="text-secondary" style="font-family:var(--font-mono); font-size:0.75rem;">${emptyMsg}</small>
        </div>
      `;
      return;
    }

    if (items.length === 1) {
      container.innerHTML = rowRenderer(items[0]);
      return;
    }

    const topItem = items[0];
    const remainingItems = items.slice(1);
    const drawerItemsHtml = remainingItems.map(rowRenderer).join("");

    container.innerHTML = `
      <div class="asset-stack-brick" role="region" aria-label="${Utils.escapeHtml(itemLabel)} stack">
        ${rowRenderer(topItem)}
        <div class="asset-idle-hint" title="Hover to view all ${Utils.escapeHtml(itemLabel)}">
          <div class="d-flex align-items-center gap-2">
            <span class="brick-hint-dot"></span>
            <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-secondary); font-weight:600;">+${remainingItems.length}, Hover to reveal</span>
          </div>
          <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-coral);">&darr;</span>
        </div>
        <div class="asset-expanded-drawer d-flex flex-column gap-2 mt-2">
          ${drawerItemsHtml}
          <div class="asset-drawer-footer mt-1">
            <small>Showing all ${items.length} ${Utils.escapeHtml(itemLabel)} &uarr;</small>
          </div>
        </div>
      </div>
    `;

    attachStackDrawerListeners(container);
  }

  // Render active and backup resume versions
  function renderResumes() {
    renderAssetStack(
      "resume-list",
      state.data.resumes || [],
      renderResumeRow,
      'No resume uploaded yet. Click "Upload New Version" above to analyze your resume with AI.',
      "versions"
    );
  }

  // Render verified credentials and course certifications
  function renderCertificates() {
    const rawCertificates = state.data.certificates || [];
    const certificates = isRealStudent() ? cleanUserCertificates(rawCertificates) : rawCertificates;
    state.data.certificates = certificates;

    renderAssetStack(
      "certificate-grid",
      certificates,
      renderCertRow,
      'No certifications yet. Upload a resume or click "+ Add Certification" above to add your credentials.',
      "certifications"
    );
  }

  // Render featured student projects
  function renderProjects() {
    const container = Utils.byId("project-grid");
    if (!container) return;

    const rawProjects = state.data.projects || [];
    const projects = isRealStudent() ? cleanUserProjects(rawProjects) : rawProjects;
    state.data.projects = projects;

    if (projects.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="nested-subcard p-4 text-center my-2" style="background:var(--bg-canvas); border:1px dashed var(--border-subtle); border-radius:14px;">
            <p class="text-white fw-bold mb-1" style="font-family:var(--font-display); font-size:1.15rem; text-transform:uppercase;">No Projects on File</p>
            <small class="text-secondary" style="font-family:var(--font-mono); font-size:0.78rem;">Upload your resume under Asset Management to automatically extract and showcase your software projects.</small>
          </div>
        </div>
      `;
      return;
    }

    let htmlContent = "";
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const projName = p.name || p.title || "Project";
      const projDesc = p.desc || p.description || p.detail || "Software project details";
      const projStack = Array.isArray(p.stack) && p.stack.length > 0 ? p.stack : (Array.isArray(p.techStack) ? p.techStack : []);
      const projStatus = p.status || "Completed";

      let stackBadges = "";
      for (let j = 0; j < projStack.length; j++) {
        stackBadges += `<span class="skill-tag-editorial" style="font-size:0.7rem; padding:4px 10px; margin-right:4px;">${Utils.escapeHtml(projStack[j])}</span>`;
      }

      htmlContent += `
        <div class="col-md-6">
          <div class="nested-subcard">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="fw-bold mb-0 text-white" style="font-family:var(--font-display); font-size:1.35rem; text-transform:uppercase;">${Utils.escapeHtml(projName)}</h5>
                <span class="badge-status-cyan">${Utils.escapeHtml(projStatus)}</span>
              </div>
              <p class="small text-secondary mb-3">${Utils.escapeHtml(projDesc)}</p>
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

  // Render peer interview experiences
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

  // Render preparation study packs
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

  // Render all dashboard sections
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

  // Show temporary toast message
  function showStatusMessage(text) {
    const statusMsg = Utils.byId("upload-status");
    if (!statusMsg) return;

    statusMsg.textContent = text;
    statusMsg.classList.remove("d-none");
    setTimeout(function () {
      statusMsg.classList.add("d-none");
    }, 3000);
  }

  // Update active feature pillar preview
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
    items.forEach(function (el, i) {
      if (i === index) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });

    // Update HUD dots
    const dots = document.querySelectorAll(".hud-dot");
    dots.forEach(function (dot, i) {
      if (i === (index % 3)) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });
  }

  // Setup scroll parallax, clock, and section highlighting
  function initStorytelling() {
    // 1. Pillar Click Listeners
    const pillarItems = document.querySelectorAll(".pillar-item");
    pillarItems.forEach(function (item, idx) {
      item.addEventListener("click", function () {
        setPillar(idx);
      });
      item.addEventListener("keydown", function (e) {
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
        window.requestAnimationFrame(function () {
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
      shards.forEach(function (shard, idx) {
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
        navLinks.forEach(function (link) {
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

  // Switch view to dashboard
  function showDashboard() {
    const landingView = Utils.byId("landing-view");
    const dashboardView = Utils.byId("dashboard-view");

    if (landingView) landingView.style.display = "none";
    if (dashboardView) {
      dashboardView.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    renderAll();
  }

  // Switch view to landing page
  function showLanding() {
    const landingView = Utils.byId("landing-view");
    const dashboardView = Utils.byId("dashboard-view");

    if (dashboardView) dashboardView.style.display = "none";
    if (landingView) {
      landingView.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    renderOverview();
  }

  // Apply parsed resume data (skills, projects, certifications)
  function applyResumeParseResult(parseResult, filename, showNotice) {
    if (!parseResult) return;

    let updatedSkillsCount = 0;
    let updatedProjectsCount = 0;
    let updatedCertsCount = 0;

    // 1. Extract & Merge Skills
    if (Array.isArray(parseResult.skills) && parseResult.skills.length > 0) {
      const skillSet = new Set(state.skills);
      parseResult.skills.forEach(function (s) { skillSet.add(s); });
      state.skills = Array.from(skillSet);
      renderSkills(state.skills);
      updatedSkillsCount = parseResult.skills.length;
    }

    // 2. Set extracted projects cleanly from resume
    if (Array.isArray(parseResult.projects) && parseResult.projects.length > 0) {
      state.data.projects = cleanUserProjects(parseResult.projects.map(function (p) {
        return {
          name: p.name || p.title || "Resume Project",
          desc: p.desc || p.description || p.detail || "Extracted from resume",
          stack: (Array.isArray(p.stack) && p.stack.length > 0) ? p.stack : (Array.isArray(p.techStack) && p.techStack.length > 0 ? p.techStack : ["General Tech"]),
          status: p.status || "Completed"
        };
      }));
      renderProjects();
      updatedProjectsCount = state.data.projects.length;
    }

    // 3. Set certifications directly from resume analysis
    if (Array.isArray(parseResult.certifications) && parseResult.certifications.length > 0) {
      state.data.certificates = cleanUserCertificates(parseResult.certifications);
      renderCertificates();
      updatedCertsCount = state.data.certificates.length;
    }

    // 4. Update Resume in state
    if (filename) {
      const resumeEntry = {
        title: "Resume - " + filename,
        detail: "AI Extracted (Skills & Projects)",
        status: "Active"
      };
      const resumeExists = state.data.resumes.some(function (er) { return er.title === resumeEntry.title; });
      if (!resumeExists) {
        state.data.resumes.unshift(resumeEntry);
      }
      renderResumes();
    }

    // 5. Save to authenticated user account if logged in
    const user = getCurrentUser();
    if (user && isRealStudent(user) && root.ElevateAuth && typeof root.ElevateAuth.updateUser === "function") {
      user.skills = state.skills;
      user.projects = state.data.projects;
      user.certificates = state.data.certificates;
      user.resumes = state.data.resumes;
      if (filename) user.resumeName = filename;
      root.ElevateAuth.updateUser(user);
    }

    if (showNotice !== false) {
      showStatusMessage("Extracted " + updatedSkillsCount + " skills, " + updatedProjectsCount + " projects & " + updatedCertsCount + " certs from " + filename + "!");
    }
  }

  // Re-analyze active resume with Gemini AI
  async function reanalyzeResumeWithAI(showNotice) {
    const user = getCurrentUser();
    if (!user || !isRealStudent(user)) return;

    if (!hasGeminiApiKey()) {
      if (showNotice !== false) {
        showStatusMessage("Gemini API is offline: Please configure your Gemini API Key in your profile to use AI resume analysis.");
      }
      return;
    }

    if (showNotice !== false) {
      showStatusMessage("Analyzing resume with Gemini AI (extracting skills, projects & certs)...");
    }

    try {
      const apiKey = getGeminiApiKey();
      const filename = user.resumeName || "Urvansh.pdf";
      const token = (root.ElevateAuth && typeof root.ElevateAuth.getToken === "function")
        ? root.ElevateAuth.getToken()
        : null;

      const res = await fetch("/api/resume/reparse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-gemini-key": apiKey } : {}),
          ...(token ? { "Authorization": "Bearer " + token } : {})
        },
        body: JSON.stringify({ filename: filename })
      });

      if (!res.ok) {
        if (showNotice !== false) {
          showStatusMessage("Could not re-analyze resume: server returned " + res.status);
        }
        return;
      }

      const parseResult = await res.json();
      applyResumeParseResult(parseResult, filename, showNotice);
    } catch (err) {
      console.warn("Re-analyze error:", err);
      if (showNotice !== false) {
        showStatusMessage("Re-analysis failed. Please try again.");
      }
    }
  }

  // Bind UI event listeners
  function bindEvents() {
    const searchInput = Utils.byId("company-search");
    if (searchInput) {
      searchInput.addEventListener("input", function (e) {
        renderCompanies(e.target.value);
      });
    }

    const uploadBtn = Utils.byId("upload-resume");
    const fileInput = Utils.byId("resume-file");
    const downloadBtn = Utils.byId("download-resume");
    const reanalyzeBtn = Utils.byId("btn-reanalyze-resume");

    if (reanalyzeBtn) {
      reanalyzeBtn.addEventListener("click", function () {
        reanalyzeResumeWithAI(true);
      });
    }

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener("click", function () {
        fileInput.click();
      });

      fileInput.addEventListener("change", async function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!hasGeminiApiKey()) {
          state.data.resumes.unshift({
            title: "Resume - " + file.name,
            detail: "File size: " + (file.size / 1024).toFixed(1) + " KB",
            status: "Active"
          });
          renderResumes();
          showStatusMessage("Uploaded " + file.name + " successfully. (AI analysis skipped — Gemini API offline).");

          try {
            const formData = new FormData();
            formData.append("resume", file);
            const token = (root.ElevateAuth && typeof root.ElevateAuth.getToken === "function")
              ? root.ElevateAuth.getToken()
              : null;
            await fetch("/api/resume/parse", {
              method: "POST",
              headers: {
                ...(token ? { "Authorization": "Bearer " + token } : {})
              },
              body: formData
            });
          } catch (_) {}
          return;
        }

        state.data.resumes.unshift({
          title: "Resume - " + file.name,
          detail: "File size: " + (file.size / 1024).toFixed(1) + " KB",
          status: "Analyzing with AI..."
        });
        renderResumes();
        showStatusMessage("Analyzing " + file.name + " with Gemini AI...");

        try {
          const formData = new FormData();
          formData.append("resume", file);
          const apiKey = getGeminiApiKey();
          const token = (root.ElevateAuth && typeof root.ElevateAuth.getToken === "function")
            ? root.ElevateAuth.getToken()
            : null;

          const res = await fetch("/api/resume/parse", {
            method: "POST",
            headers: {
              ...(apiKey ? { "x-gemini-key": apiKey } : {}),
              ...(token ? { "Authorization": "Bearer " + token } : {})
            },
            body: formData
          });

          function handleUploadFallback() {
            if (state.data.resumes.length > 0) {
              state.data.resumes[0].status = "Active";
              renderResumes();
            }
            showStatusMessage("Uploaded " + file.name + " successfully!");
          }

          if (res.ok) {
            const parseResult = await res.json();
            applyResumeParseResult(parseResult, file.name, true);
          } else {
            handleUploadFallback();
          }
        } catch (err) {
          console.warn("Resume parsing error:", err);
          handleUploadFallback();
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", function () {
        const user = getCurrentUser();
        const fname = (user && user.resumeName) ? user.resumeName : "Urvansh.pdf";
        const token = (root.ElevateAuth && typeof root.ElevateAuth.getToken === "function")
          ? root.ElevateAuth.getToken()
          : null;
        showStatusMessage("Downloading " + fname + "...");
        const downloadUrl = "/api/resume/download?filename=" + encodeURIComponent(fname) + (token ? "&token=" + encodeURIComponent(token) : "");
        window.location.href = downloadUrl;
      });
    }

    // Add Certification Manual Form Controls
    const btnToggleAddCert = Utils.byId("btn-toggle-add-cert");
    const addCertForm = Utils.byId("add-cert-form");
    const btnCancelCert = Utils.byId("btn-cancel-cert");

    if (btnToggleAddCert && addCertForm) {
      btnToggleAddCert.addEventListener("click", function () {
        addCertForm.classList.toggle("d-none");
        if (!addCertForm.classList.contains("d-none")) {
          const titleInput = Utils.byId("cert-input-title");
          if (titleInput) titleInput.focus();
        }
      });
    }

    if (btnCancelCert && addCertForm) {
      btnCancelCert.addEventListener("click", function () {
        addCertForm.classList.add("d-none");
        addCertForm.reset();
      });
    }

    if (addCertForm) {
      addCertForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const titleInput = Utils.byId("cert-input-title");
        const issuerInput = Utils.byId("cert-input-issuer");
        const tagInput = Utils.byId("cert-input-tag");

        const title = titleInput ? titleInput.value.trim() : "";
        const issuer = issuerInput ? issuerInput.value.trim() : "";
        const tag = tagInput ? tagInput.value.trim() : "Credential";

        if (!title || !issuer) return;

        const newCert = {
          title: title,
          issuer: issuer,
          tag: tag || "Credential"
        };

        state.data.certificates.unshift(newCert);
        renderCertificates();

        const user = getCurrentUser();
        if (user && isRealStudent(user) && root.ElevateAuth && typeof root.ElevateAuth.updateUser === "function") {
          user.certificates = state.data.certificates;
          root.ElevateAuth.updateUser(user);
        }

        addCertForm.reset();
        addCertForm.classList.add("d-none");
        showStatusMessage("Added certification: " + title);
      });
    }

    // Gemini AI Sync Live Drives
    const btnSyncDrives = Utils.byId("btn-sync-drives");
    if (btnSyncDrives) {
      btnSyncDrives.addEventListener("click", function () {
        fetchLiveOpportunities(true);
      });
    }

    // Landing to Dashboard Navigation
    const heroBtnLaunch = Utils.byId("hero-btn-launch");
    if (heroBtnLaunch) {
      heroBtnLaunch.addEventListener("click", function () {
        const Auth = root.ElevateAuth;
        if (Auth && typeof Auth.getCurrentUser === "function" && Auth.getCurrentUser()) {
          showDashboard();
        } else {
          const openAuth = Utils.byId("open-auth");
          if (openAuth) openAuth.click();
        }
      });
    }

    const heroBtnDemo = Utils.byId("hero-btn-demo");
    if (heroBtnDemo) {
      heroBtnDemo.addEventListener("click", function () {
        showDashboard();
      });
    }

    const brandLink = Utils.byId("topbar-brand-link");
    if (brandLink) {
      brandLink.addEventListener("click", function () {
        const Auth = root.ElevateAuth;
        if (Auth && Auth.getCurrentUser && Auth.getCurrentUser()) {
          showDashboard();
        } else {
          showLanding();
        }
      });
    }

    // Gemini API Key Modal Controls
    const liveFeedBadge = Utils.byId("live-feed-badge");
    if (liveFeedBadge) {
      liveFeedBadge.addEventListener("click", openGeminiModal);
    }

    const geminiModalEl = Utils.byId("gemini-key-modal");
    if (geminiModalEl) {
      geminiModalEl.addEventListener("show.bs.modal", function () {
        const input = Utils.byId("gemini-key-input");
        const statusMsg = Utils.byId("gemini-key-status-msg");
        const key = getGeminiApiKey();
        if (input) input.value = key;
        if (statusMsg) {
          if (key) {
            statusMsg.style.color = "#00f3a4";
            statusMsg.textContent = "● Gemini API Key is configured and active.";
          } else {
            statusMsg.style.color = "#ff5c5c";
            statusMsg.textContent = "● Gemini AI is currently OFFLINE (No API Key).";
          }
        }
      });
    }

    const btnSaveGeminiKey = Utils.byId("btn-save-gemini-key");
    if (btnSaveGeminiKey) {
      btnSaveGeminiKey.addEventListener("click", function () {
        const input = Utils.byId("gemini-key-input");
        const val = input ? input.value : "";
        saveGeminiKey(val);
      });
    }

    const btnClearGeminiKey = Utils.byId("btn-clear-gemini-key");
    if (btnClearGeminiKey) {
      btnClearGeminiKey.addEventListener("click", function () {
        clearGeminiKey();
      });
    }

    // Close any expanded asset / certification stacks when clicking outside
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".asset-stack-brick")) {
        const openStacks = document.querySelectorAll(".asset-stack-brick.is-expanded");
        openStacks.forEach(function (s) {
          s.classList.remove("is-expanded");
        });
      }
    });
  }

  // Initialize application on page load
  function init() {
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
        renderSkills: renderSkills,
        onUserRegistered: function (newUser) {
          applySessionData(newUser);
        },
        onSessionChanged: function (sessionUser) {
          applySessionData(sessionUser);
          if (sessionUser) {
            showDashboard();
          }
          if (isRealStudent(sessionUser)) {
            fetchLiveOpportunities();
          } else {
            state.data.companies = (Data && Data.SEED_DATA && Data.SEED_DATA.companies) ? Data.SEED_DATA.companies.slice() : [];
            renderCompanies();
          }
        }
      });
    }

    const activeUser = Auth && typeof Auth.getCurrentUser === "function" ? Auth.getCurrentUser() : null;
    const isReal = isRealStudent(activeUser);

    applySessionData(activeUser);

    if (isReal) {
      if (!hasGeminiApiKey()) {
        state.data.companies = OFFLINE_SAMPLE_COMPANIES.slice();
      } else {
        // Real student account with key: load their personal cached live Gemini results
        let userDrives = null;
        try {
          if (activeUser && activeUser.email) {
            const stored = localStorage.getItem("elevate_companies_" + activeUser.email.toLowerCase());
            if (stored) userDrives = JSON.parse(stored);
          }
          if (!userDrives) {
            const globalStored = localStorage.getItem("elevate_companies_gemini_2026");
            if (globalStored) userDrives = JSON.parse(globalStored);
          }
        } catch (e) {}

        if (userDrives && userDrives.length > 0) {
          state.data.companies = userDrives;
        } else {
          state.data.companies = OFFLINE_SAMPLE_COMPANIES.slice();
        }
      }
    } else {
      // Demo profile: genuine demo data only
      state.data.companies = (Data && Data.SEED_DATA && Data.SEED_DATA.companies) ? Data.SEED_DATA.companies.slice() : [];
    }

    renderAll();
    bindEvents();
    initStorytelling();
    updateGeminiBadge();

    // Automatically check if server has Gemini API key in .env and fetch opportunities
    if (typeof fetch === "function") {
      checkServerGeminiStatus().then((hasServerKey) => {
        updateGeminiBadge();
        if (isReal && hasGeminiApiKey()) {
          fetchLiveOpportunities();
        }
      });
    }

    // If an active session exists, take user straight to the workspace
    if (activeUser) {
      showDashboard();
    } else {
      showLanding();
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
    showDashboard: showDashboard,
    showLanding: showLanding,
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
    fetchLiveOpportunities: fetchLiveOpportunities,
    fetchFromGeminiApi: fetchLiveOpportunities,
    openGeminiModal: openGeminiModal,
    hideGeminiModal: hideGeminiModal,
    saveGeminiKey: saveGeminiKey,
    clearGeminiKey: clearGeminiKey,
    hasGeminiApiKey: hasGeminiApiKey,
    checkServerGeminiStatus: checkServerGeminiStatus,
    setPillar: setPillar,
    getState: function () { return state; }
  };

  root.ElevateApp = ElevateApp;
  root.ElevateDashboard = ElevateApp; // Backward compatibility alias
  if (typeof module !== "undefined" && module.exports) {
    module.exports = ElevateApp;
  }
})(typeof window !== "undefined" ? window : globalThis);
