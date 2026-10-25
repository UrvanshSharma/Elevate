/**
 * Elevate Main Application Module
 * Handles DOM rendering for all platform sections:
 * Overview, Student Profile, Resumes & Certificates, Project Portfolio,
 * Peer Interview Hub, Learning Resources, and Placement Drive filtering,
 * as well as scroll storytelling, capability pillar HUD, and authentication bootstrap.
 */
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
   * Check if current session belongs to a genuine registered student or the demo account.
   * @param {Object} [userObj] - Optional user object to check.
   * @returns {boolean}
   */
  function isRealStudent(userObj) {
    const user = (typeof userObj !== "undefined" && userObj !== null) ? userObj : getCurrentUser();
    return Boolean(user && user.email && user.email.toLowerCase() !== "aarav@elevate.edu");
  }

  /**
   * Retrieve current user object.
   * @returns {Object|null}
   */
  function getCurrentUser() {
    const Auth = root.ElevateAuth;
    return (Auth && typeof Auth.getCurrentUser === "function") ? Auth.getCurrentUser() : null;
  }

  /**
   * Cleans and deduplicates student projects list to guarantee exactly genuine resume projects.
   * Purges fragments, old dummy cards ("SPEECH", "FEATURED RESUME PROJECT"), and duplicate variants.
   * @param {Array} projects - Raw project list.
   * @returns {Array} Clean canonical projects list.
   */
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

  /**
   * Cleans and deduplicates student certificates to remove duplicate variants (e.g. Azure AI).
   * @param {Array} certs - Raw certificate list.
   * @returns {Array} Clean canonical certificates list.
   */
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

  /**
   * Apply user session data to application state.
   * Real student accounts load ONLY their personal data (no dummy resumes, projects, or certifications).
   * Demo profiles load the complete seed demo dataset.
   * @param {Object} [user] - Active user session.
   */
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
      const needsAiSync = hasResume && (cleanProjects.length === 0 || state.data.certificates.length <= 1);
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

  /**
   * Render placement drive list filtered by search query.
   * Uses interactive brick layout with hover reveal for complete details.
   * - Demo Profile: Renders genuine demo sample placement drive.
   * - Real Student: Renders live opportunities fetched directly from Google Gemini API.
   * @param {string} [query] - Optional query string to filter companies.
   */
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
      if (c.applyUrl && c.applyUrl !== "#demo-profile") {
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

  /**
   * Helper to retrieve optional custom Gemini API Key from localStorage.
   * @returns {string}
   */
  function getGeminiApiKey() {
    try {
      const stored = localStorage.getItem("elevate_gemini_api_key");
      if (stored && stored.trim() && !stored.includes("YOUR_GEMINI_API_KEY")) return stored.trim();
    } catch (e) {}
    return "";
  }

  /**
   * Get the verified 2026 India campus hiring search prompt.
   * @returns {string}
   */
  function getGeminiSearchPrompt() {
    return `Find up to 15 genuine, currently active software engineering jobs, fresher hiring drives, graduate recruitment programs, and software internships in India for candidates graduating in 2026. Aim for 10–15 verified results whenever enough qualifying opportunities exist.

Use the actual current date at the time of research. Search broadly across established mid-sized technology companies, Indian IT services firms, SaaS companies, engineering and consulting firms, established startups, multinational corporations, and product companies. Do not focus mainly on famous companies such as Google, Microsoft, Amazon, or Adobe. Include reputable employers that students can realistically apply to.

Search official career portals, employer-hosted application forms, Workday, Greenhouse, Lever, and other authorized recruitment platforms. Use multiple distinct search queries and investigate opportunities beyond the first page of search results where possible.

Search for software developer fresher jobs, graduate engineer trainees, associate software engineers, junior developers, campus drives, off-campus drives, and internships for the 2026 batch. Include Java, Python, backend, frontend, full-stack, QA automation, software testing, data engineering, AI/ML, DevOps, cloud engineering, and related technical positions.

First discover a broad pool of approximately 25–40 potential opportunities, where search availability permits. Then investigate the strongest candidates individually. Do not output preliminary search results.

For each opportunity, verify all of the following:

1. The exact role is currently accepting applications, or reliable, current evidence explicitly confirms ongoing shortlisting, assessments, interviews, or candidate processing for the same hiring cycle.
2. Official evidence establishes that candidates graduating in 2026 are eligible.
3. The opportunity is available to eligible candidates in India.
4. The deadline is verified, or applications are explicitly confirmed open without a disclosed deadline.
5. The direct application URL has been opened and verified for the exact advertised role.
6. The application process remains available and has not been closed, expired, filled, withdrawn, cancelled, or removed.
7. Compensation is supported by a reliable source associated with the same role, if disclosed.

Check degree, branch, graduation year, CGPA or percentage, backlogs, experience, technical skills, internship duration, and location restrictions wherever available. Do not assume that a role accepts 2026 graduates merely because it is described as entry-level or suitable for freshers.

Search for additional employers when results are sparse. Prioritize established mid-sized companies and IT services providers instead of repeatedly searching only well-known technology companies. Avoid suspicious recruiters, training institutes advertising jobs, pay-to-apply schemes, unverified employers, and unrelated positions.

Use only these status values:

"Open Drive" means current evidence confirms that applications are accepting submissions and the application process remains available.

"Shortlisting" means applications may have closed, but current, explicit evidence confirms ongoing assessments, interviews, shortlisting, or candidate processing for the same hiring cycle.

Do not rely solely on search snippets, old announcements, archived job listings, an accessible job description, or the absence of a closure notice. A job page remaining online does not prove that applications are open.

A future deadline does not override an explicit closed application status. If sources conflict and the conflict cannot be resolved, exclude the opportunity.

Every application URL must pass the following mandatory validation process before the opportunity can be included.

1. Locate the individual vacancy through the employer's official career portal or an authorized recruitment platform.
2. Open the exact job listing.
3. Locate the actual Apply, Apply Now, or equivalent application action.
4. Follow the application link and redirects where possible.
5. Open the resulting destination and inspect the page content.
6. Verify that the destination corresponds to the correct employer, role, requisition, and hiring cycle.
7. Confirm that the application process is accessible and has not been explicitly closed, removed, or expired.
8. Preserve the complete working URL, including required requisition identifiers and query parameters.
9. Recheck the destination immediately before including it in the final JSON.

A successful search result, official domain, HTTP response, redirect, login screen, visible job description, or visible Apply button alone does not prove that the application is active.

Reject any URL that displays messages such as "Page not found", "Sorry, the page you're looking for is not available anymore", "Job no longer available", "Position filled", "Applications closed", or equivalent errors.

Also reject redirects to unrelated vacancies, generic company homepages, generic careers pages, search results, expired third-party listings, and inaccessible application destinations.

Never fabricate URLs, reconstruct application paths from job IDs, guess query parameters, or assume that a URL works because it appears in search results.

Amazon-specific validation rule:

Do not use https://amazon.jobs/en/teams/internships-india as an individual job application URL. If this page or any other Amazon URL displays a page-unavailable message, mark that URL as failed and exclude it.

You may search Amazon's official careers portal for replacement opportunities. However, a replacement qualifies only after you locate an individual vacancy, establish eligibility for 2026 graduates in India, open the actual application destination, and confirm that the application process remains available.

A general Amazon internships page, university hiring page, graduate-program overview, or generic careers page is not an acceptable substitute for the direct application URL of an individual vacancy.

Apply the same rule to every employer.

If a URL fails, search for another vacancy at the same company or move to another employer. Never retain a failed result merely to reach the target number of opportunities.

If the browser cannot follow a redirect or inspect the destination, try another official route to the same vacancy. If the application process still cannot be verified, exclude the opportunity. Do not claim that a URL was tested if the available browsing tools could not open it.

For eligibility, use official evidence from the job description, employer-hosted recruitment form, official hiring announcement, or applicable official graduate hiring policy. Multiple official sources may be used if they clearly refer to the same role or hiring program. Do not transfer eligibility requirements from unrelated positions at the same company.

For deadlines, use the format "MMM DD, YYYY". If no deadline is published, use "Not Disclosed" only when applications are explicitly confirmed open. If a deadline has passed but ongoing shortlisting is verified, report the actual deadline and use the status "Shortlisting". Never invent or estimate deadlines.

For compensation, use the verified annual package or monthly internship stipend, preserving the correct currency and payment period. If compensation is not reliably disclosed, use "Not Disclosed". Do not estimate salaries using industry averages, unrelated vacancies, salary websites, or rumours.

Missing compensation or other optional details must not disqualify an otherwise verifiable opportunity. However, unverified active status, graduation-batch eligibility, India eligibility, or direct application destination is grounds for exclusion.

Prioritize official company career portals, employer-hosted application forms, authorized applicant-tracking systems, and employer-controlled recruitment announcements. Current third-party listings and authorized recruiter announcements may help discover opportunities, but they must not substitute for verification of the exact application destination.

Exclude duplicate listings for the same role and hiring cycle. Do not pad the list with expired opportunities, generic career pages, or repeated listings from multiple websites.

Before including each opportunity, confirm that the employer is genuine, the role is technical, 2026-batch eligibility is established, India eligibility is established, recruitment is active or verified as shortlisting, the deadline and compensation are accurate or correctly marked "Not Disclosed", and the direct application URL has been opened and verified.

Discover approximately 25–40 potential opportunities before final selection where search availability permits. If fewer than 10 pass every mandatory check, expand the search to additional employers, job titles, and authorized recruitment platforms. Make a genuine effort to find at least 10 opportunities without lowering verification standards. If fewer than 10 qualify after a reasonable broad search, return only those that qualify.

Sort opportunities by the nearest verified future deadline first, followed by verified Shortlisting opportunities.

Return only one valid JSON array. Do not include introductory text, explanations, citations outside the JSON, Markdown fences, comments, or any text before or after the array.

Each object must contain exactly these seven keys in this order:

[
  {
    "companyName": "Company Name",
    "role": "Exact Official Role Title",
    "eligibility": "Verified eligibility requirements for 2026 graduates in India",
    "salary": "Verified annual package or monthly stipend, or Not Disclosed",
    "deadline": "MMM DD, YYYY or Not Disclosed",
    "status": "Open Drive",
    "applyUrl": "Verified direct application URL"
  }
]

All keys and values must be double-quoted strings. Do not add extra fields or use null, numbers, booleans, comments, or trailing commas. Escape special characters according to standard JSON syntax.

Before submitting, validate that the complete output parses as standard JSON, every object contains exactly the seven required keys in the specified order, and every included application URL has passed the mandatory application validation process.

If no opportunities qualify after a reasonable broad search, return exactly [].

Accuracy, genuine active recruitment, verified 2026-batch eligibility, and working direct application links are mandatory. Never invent opportunities or URLs to increase the result count.`;
  }

  /**
   * Fetch live opportunities from Google Gemini API using the 2026 search prompt.
   * Priority 1: gemini-flash-latest with tools: [{ googleSearch: {} }] (Search Grounding)
   * Priority 2 Fallback: gemini-3.5-flash-lite / gemini-flash-lite-latest with JSON generation
   * @param {string} [apiKey]
   * @returns {Promise<Array>}
   */
  async function fetchFromGeminiApi(apiKey) {
    const key = apiKey || getGeminiApiKey();
    if (!key || key.includes("YOUR_GEMINI_API_KEY")) {
      throw new Error("No valid Gemini API key configured.");
    }

    const prompt = getGeminiSearchPrompt();

    // 1. Try with Google Search Grounding first
    try {
      const searchUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + encodeURIComponent(key);
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(function () { controller.abort(); }, 6000) : null;

      const resp = await fetch(searchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }]
        })
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const candidate = data.candidates && data.candidates[0];
        const textPart = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];
        let rawText = (textPart && textPart.text) || "";
        rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(function (item, idx) {
              const cName = item.companyName || item.name || ("Drive " + (idx + 1));
              return {
                companyName: cName,
                name: cName,
                role: item.role || "Software Engineer Intern",
                eligibility: item.eligibility || "B.Tech/BE (2026 Batch), DSA, Problem Solving",
                salary: item.salary || "Not Disclosed",
                deadline: item.deadline || "Open Drive",
                status: item.status || "Open Drive",
                applyUrl: item.applyUrl || "https://unstop.com",
                source: "Gemini AI (Search Grounded)"
              };
            });
          }
        }
      } else {
        console.warn("Search grounding HTTP " + resp.status + ", falling back to direct JSON models.");
      }
    } catch (searchErr) {
      console.warn("Search grounding query ended (" + searchErr.message + "), using fallback models.");
    }

    // 2. Fallback: Query active models with JSON generation if search tool is rate-limited
    const fallbackModels = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3-flash-preview"];
    const fallbackPrompt = `Find currently active campus hiring drives, software internships, and fresher placement opportunities in India for 2026 graduates.
Provide 10 verified campus recruitment opportunities and engineering internships for the 2026 batch at top technology companies in India (such as Google, Microsoft, Amazon, Tata Consultancy Services, Qualcomm, Goldman Sachs, Cisco, Infosys).

Return ONLY a valid JSON array of objects using this exact structure:
[
  {
    "companyName": "Company Name",
    "role": "Role Title",
    "eligibility": "Eligibility requirements including 2026 batch eligibility, degrees, CGPA, and core technical skills",
    "salary": "Package or stipend details",
    "deadline": "Application deadline or Open Drive",
    "status": "Open Drive or Shortlisting",
    "applyUrl": "Official direct student careers URL"
  }
]`;
    let lastError = null;

    for (let i = 0; i < fallbackModels.length; i++) {
      const model = fallbackModels[i];
      try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(key);
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(function () { controller.abort(); }, 25000) : null;

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller ? controller.signal : undefined,
          body: JSON.stringify({
            contents: [{ parts: [{ text: fallbackPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error("HTTP " + resp.status);
        }

        const data = await resp.json();
        const candidate = data.candidates && data.candidates[0];
        const textPart = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];
        let rawText = (textPart && textPart.text) || "";

        rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(function (item, idx) {
            const cName = item.companyName || item.name || ("Drive " + (idx + 1));
            return {
              companyName: cName,
              name: cName,
              role: item.role || "Software Engineer Intern",
              eligibility: item.eligibility || "B.Tech/BE (2026 Batch), DSA, Problem Solving",
              salary: item.salary || "Not Disclosed",
              deadline: item.deadline || "Open Drive",
              status: item.status || "Open Drive",
              applyUrl: item.applyUrl || "https://unstop.com",
              source: "Gemini AI (" + model + ")"
            };
          });
        }
      } catch (err) {
        lastError = err;
        console.warn("Model " + model + " error:", err.message);
      }
    }

    throw lastError || new Error("Unable to fetch live drives from Gemini API.");
  }

  /**
   * Fetch live opportunities strictly through the Gemini API and command prompt.
   * As soon as it finishes fetching, automatically updates the jobs in the jobs section.
   * Completely purges Remotive or third-party web scraping feeds.
   * @param {boolean} [forceRefresh=false]
   */
  async function fetchLiveOpportunities(forceRefresh) {
    const isReal = isRealStudent();
    const user = getCurrentUser();
    const badge = Utils.byId("live-feed-badge");
    const syncBtn = Utils.byId("btn-sync-drives");
    const container = Utils.byId("company-list");

    if (badge) {
      badge.innerHTML = `<span class="spinner-grow spinner-grow-sm me-1" role="status" style="width:7px; height:7px;" aria-hidden="true"></span> SEARCHING LIVE GEMINI 2026 DRIVES...`;
    }
    if (syncBtn) {
      const svg = syncBtn.querySelector("svg");
      if (svg) svg.style.animation = "spin 0.6s linear infinite";
    }

    // Show scanning UI if no active drives loaded yet
    if (!state.data.companies || state.data.companies.length === 0 || (state.data.companies.length === 1 && state.data.companies[0].isDemo)) {
      if (container && (isReal || forceRefresh)) {
        container.innerHTML = `
          <div class="nested-subcard p-4 text-center my-3 w-100">
            <div class="spinner-border text-success mb-3" role="status" style="width:2.2rem; height:2.2rem;"></div>
            <h6 class="fw-bold text-white mb-1">Searching Google Gemini for Active 2026 Drives in India...</h6>
            <p class="text-secondary small mb-0">Verifying live deadlines, packages, and direct apply links in real-time.</p>
          </div>
        `;
      }
    }

    try {
      let liveDrives = null;
      let sourceName = "Gemini AI";

      // 1. Primary: Query backend /api/drives/live (securely uses server .env)
      try {
        const resp = await fetch("/api/drives/live");
        if (resp.ok) {
          const payload = await resp.json();
          if (Array.isArray(payload.drives) && payload.drives.length > 0) {
            liveDrives = payload.drives;
            sourceName = payload.source === "gemini" ? "Gemini AI" : "Verified 2026 Batch";
          }
        }
      } catch (backendErr) {
        console.warn("Backend /api/drives/live not reachable, checking client key:", backendErr.message);
      }

      // 2. Client-side fallback if user provided a custom key in localStorage
      if (!liveDrives || liveDrives.length === 0) {
        const customKey = getGeminiApiKey();
        if (customKey) {
          try {
            liveDrives = await fetchFromGeminiApi(customKey);
            if (liveDrives && liveDrives.length > 0) {
              sourceName = "Gemini AI";
            }
          } catch (apiErr) {
            console.warn("Live Gemini search attempt failed:", apiErr.message);
          }
        }
      }

      // AS SOON AS IT FINISHES FETCHING: AUTOMATICALLY UPDATE JOBS IN THE JOBS SECTION!
      if (liveDrives && liveDrives.length > 0) {
        state.data.companies = liveDrives;
        if (user && user.email && isReal) {
          try {
            localStorage.setItem("elevate_companies_" + user.email.toLowerCase(), JSON.stringify(liveDrives));
          } catch (e) {}
        }
        try {
          localStorage.setItem("elevate_companies_gemini_2026", JSON.stringify(liveDrives));
        } catch (e) {}

        renderCompanies();

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (badge) {
          badge.innerHTML = `<span class="live-dot-green"></span> LIVE (${sourceName} • ${timeStr})`;
        }
        return liveDrives;
      }

      // If live call returned no results right now:
      if (isReal) {
        // Try to load student's previously cached Gemini results
        let cachedDrives = null;
        if (user && user.email) {
          try {
            const cached = localStorage.getItem("elevate_companies_" + user.email.toLowerCase());
            if (cached) cachedDrives = JSON.parse(cached);
          } catch (e) {}
        }
        if (!cachedDrives) {
          try {
            const globalCached = localStorage.getItem("elevate_companies_gemini_2026");
            if (globalCached) cachedDrives = JSON.parse(globalCached);
          } catch (e) {}
        }

        if (cachedDrives && cachedDrives.length > 0) {
          state.data.companies = cachedDrives;
          renderCompanies();
          if (badge) {
            badge.innerHTML = `<span class="live-dot-green"></span> LIVE (Cached • Gemini AI)`;
          }
          return cachedDrives;
        }

        // Keep companies empty and show status
        state.data.companies = [];
        renderCompanies();
        if (badge) {
          badge.innerHTML = `<span class="live-dot-orange"></span> SEARCH IDLE / RETRY`;
        }
        return [];
      } else {
        // Demo profile: if test live sync was clicked without drives returned, keep demo data
        if (!state.data.companies || state.data.companies.length === 0) {
          state.data.companies = (Data && Data.SEED_DATA && Data.SEED_DATA.companies) ? Data.SEED_DATA.companies.slice() : [];
        }
        renderCompanies();
        if (badge) {
          badge.innerHTML = `<span class="badge-status-lime" style="font-size:0.65rem;">DEMO PROFILE DATA</span>`;
        }
        return state.data.companies;
      }
    } catch (err) {
      console.warn("Failed to fetch live drives via Gemini:", err);
      if (badge) {
        badge.innerHTML = `<span class="live-dot-green"></span> 2026 BATCH`;
      }
    } finally {
      if (syncBtn) {
        const svg = syncBtn.querySelector("svg");
        if (svg) svg.style.animation = "";
      }
    }
  }

  /**
   * Render active and backup resume versions.
   * When multiple versions exist, displays top version on front and reveals others on hover/tap.
   */
  function renderResumes() {
    const container = Utils.byId("resume-list");
    if (!container) return;

    const resumes = state.data.resumes || [];
    if (resumes.length === 0) {
      container.innerHTML = `
        <div class="p-3 text-center nested-subcard my-2" style="background:var(--bg-canvas); border:1px dashed var(--border-subtle); border-radius:12px;">
          <small class="text-secondary" style="font-family:var(--font-mono); font-size:0.75rem;">No resume uploaded yet. Click "Upload New Version" above to analyze your resume with AI.</small>
        </div>
      `;
      return;
    }

    if (resumes.length === 1) {
      const r = resumes[0];
      container.innerHTML = `
        <div class="asset-item-row">
          <div>
            <strong class="d-block small text-white">${Utils.escapeHtml(r.title)}</strong>
            <small style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">${Utils.escapeHtml(r.detail)}</small>
          </div>
          <span class="badge-status-lime">${Utils.escapeHtml(r.status)}</span>
        </div>
      `;
      return;
    }

    const topResume = resumes[0];
    const remainingResumes = resumes.slice(1);

    let drawerItemsHtml = "";
    for (let i = 0; i < remainingResumes.length; i++) {
      const r = remainingResumes[i];
      drawerItemsHtml += `
        <div class="asset-item-row">
          <div>
            <strong class="d-block small text-white">${Utils.escapeHtml(r.title)}</strong>
            <small style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">${Utils.escapeHtml(r.detail)}</small>
          </div>
          <span class="badge-status-lime">${Utils.escapeHtml(r.status)}</span>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="asset-stack-brick" role="region" aria-label="Resume versions stack">
        <!-- Top-most Resume Version (Always visible on front) -->
        <div class="asset-item-row">
          <div>
            <strong class="d-block small text-white">${Utils.escapeHtml(topResume.title)}</strong>
            <small style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">${Utils.escapeHtml(topResume.detail)}</small>
          </div>
          <span class="badge-status-lime">${Utils.escapeHtml(topResume.status)}</span>
        </div>

        <!-- Idle Hint: indicates additional resume versions exist -->
        <div class="asset-idle-hint" title="Hover to view previous resume versions">
          <div class="d-flex align-items-center gap-2">
            <span class="brick-hint-dot"></span>
            <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-secondary); font-weight:600;">+${remainingResumes.length}, Hover to reveal</span>
          </div>
          <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-coral);">&darr;</span>
        </div>

        <!-- Full Drawer: Reveals smoothly downwards on hover or tap -->
        <div class="asset-expanded-drawer d-flex flex-column gap-2 mt-2">
          ${drawerItemsHtml}
          <div class="asset-drawer-footer mt-1">
            <small>Showing all ${resumes.length} versions &uarr;</small>
          </div>
        </div>
      </div>
    `;

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

  /**
   * Render verified credentials and course certifications.
   * Displays the top-most item on front; smoothly reveals all others on hover/tap.
   */
  function renderCertificates() {
    const container = Utils.byId("certificate-grid");
    if (!container) return;

    const rawCertificates = state.data.certificates || [];
    const certificates = isRealStudent() ? cleanUserCertificates(rawCertificates) : rawCertificates;
    state.data.certificates = certificates;

    if (certificates.length === 0) {
      container.innerHTML = `
        <div class="p-3 text-center nested-subcard my-2" style="background:var(--bg-canvas); border:1px dashed var(--border-subtle); border-radius:12px;">
          <small class="text-secondary" style="font-family:var(--font-mono); font-size:0.75rem;">No certifications yet. Upload a resume or click "+ Add Certification" above to add your credentials.</small>
        </div>
      `;
      return;
    }

    if (certificates.length === 1) {
      const c = certificates[0];
      container.innerHTML = `
        <div class="asset-item-row">
          <div>
            <strong class="d-block small text-white">${Utils.escapeHtml(c.title)}</strong>
            <small style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">${Utils.escapeHtml(c.issuer)}</small>
          </div>
          <span class="badge-status-cyan">${Utils.escapeHtml(c.tag || "Credential")}</span>
        </div>
      `;
      return;
    }

    const topCert = certificates[0];
    const remainingCerts = certificates.slice(1);

    let drawerItemsHtml = "";
    for (let i = 0; i < remainingCerts.length; i++) {
      const c = remainingCerts[i];
      drawerItemsHtml += `
        <div class="asset-item-row">
          <div>
            <strong class="d-block small text-white">${Utils.escapeHtml(c.title)}</strong>
            <small style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">${Utils.escapeHtml(c.issuer)}</small>
          </div>
          <span class="badge-status-cyan">${Utils.escapeHtml(c.tag || "Credential")}</span>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="asset-stack-brick" role="region" aria-label="Verified certifications stack">
        <!-- Top-most Certification (Always visible on front) -->
        <div class="asset-item-row">
          <div>
            <strong class="d-block small text-white">${Utils.escapeHtml(topCert.title)}</strong>
            <small style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">${Utils.escapeHtml(topCert.issuer)}</small>
          </div>
          <span class="badge-status-cyan">${Utils.escapeHtml(topCert.tag || "Credential")}</span>
        </div>

        <!-- Subtle Idle Hint: tells user how many more certifications exist -->
        <div class="asset-idle-hint" title="Hover to view all certifications">
          <div class="d-flex align-items-center gap-2">
            <span class="brick-hint-dot"></span>
            <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-secondary); font-weight:600;">+${remainingCerts.length}, Hover to reveal</span>
          </div>
          <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-coral);">&darr;</span>
        </div>

        <!-- Full Drawer: Reveals smoothly downwards on hover or tap -->
        <div class="asset-expanded-drawer d-flex flex-column gap-2 mt-2">
          ${drawerItemsHtml}
          <div class="asset-drawer-footer mt-1">
            <small>Showing all ${certificates.length} certifications &uarr;</small>
          </div>
        </div>
      </div>
    `;

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

  /**
   * Render featured student projects.
   */
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
    setTimeout(function () {
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

  /**
   * Bind interactive storytelling: scroll parallax for Scene 2 & 3,
   * live footer clock, section spy, and pillar click listeners.
   */
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

  /**
   * Switch view to the main student workspace dashboard.
   */
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

  /**
   * Switch view to the landing page.
   */
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

  /**
   * Integrates resume parse results (skills, projects, certifications) into state and active user.
   * Eliminates clone code between initial upload and re-analysis.
   * @param {Object} parseResult - Parsed resume result from server.
   * @param {string} filename - Associated resume filename.
   * @param {boolean} [showNotice=true] - Whether to show feedback toast.
   */
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

  /**
   * Re-analyze active resume with Gemini AI to extract complete projects, certifications & skills.
   * Cleans up any placeholder projects and saves the verified dataset to user storage.
   * @param {boolean} [showNotice=true] - Whether to show status notifications.
   */
  async function reanalyzeResumeWithAI(showNotice) {
    const user = getCurrentUser();
    if (!user || !isRealStudent(user)) return;

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

  /**
   * Bind event listeners for company search, resume upload, and resume download.
   */
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

          if (res.ok) {
            const parseResult = await res.json();
            applyResumeParseResult(parseResult, file.name, true);
          } else {
            if (state.data.resumes.length > 0) {
              state.data.resumes[0].status = "Active";
              renderResumes();
            }
            showStatusMessage("Uploaded " + file.name + " successfully!");
          }
        } catch (err) {
          console.warn("Resume parsing error:", err);
          if (state.data.resumes.length > 0) {
            state.data.resumes[0].status = "Active";
            renderResumes();
          }
          showStatusMessage("Uploaded " + file.name + " successfully!");
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
        const openAuth = Utils.byId("open-auth");
        if (openAuth) openAuth.click();
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

  /**
   * Bootstrap the entire application.
   */
  function init() {
    // Purge outdated legacy static company caches and any previous Remotive results
    try {
      ["elevate_companies", "elevate_companies_v4"].forEach(function (k) {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored);
          const hasLegacy = Array.isArray(parsed) && parsed.some(function (item) {
            const name = (item.companyName || item.name || "").toLowerCase();
            return name.includes("askable") || name.includes("mitre") || name.includes("lemon.io") || name.includes("coalition") || name.includes("iapwe");
          });
          if (hasLegacy) {
            localStorage.removeItem(k);
          }
        }
      });
    } catch (e) {}

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
      // Real student account: load their personal cached live Gemini results
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
        state.data.companies = [];
      }
    } else {
      // Demo profile: genuine demo data only
      state.data.companies = (Data && Data.SEED_DATA && Data.SEED_DATA.companies) ? Data.SEED_DATA.companies.slice() : [];
    }

    renderAll();
    bindEvents();
    initStorytelling();

    // Automatically fetch fresh opportunities newly every time the website is started!
    // As soon as it finishes fetching, it automatically updates the jobs in the jobs section.
    if (typeof fetch === "function") {
      if (isReal) {
        fetchLiveOpportunities();
      }
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
    fetchFromGeminiApi: fetchFromGeminiApi,
    setPillar: setPillar,
    getState: function () { return state; }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ElevateApp;
  } else {
    root.ElevateApp = ElevateApp;
    root.ElevateDashboard = ElevateApp; // Backward compatibility alias
  }
})(typeof window !== "undefined" ? window : globalThis);
