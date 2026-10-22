/* ==========================================================================
   ELEVATE PLATFORM - VANILLA HTML, CSS & JAVASCRIPT (CLIENT-SIDE ONLY)
   ========================================================================== */

// --- 1. LOCAL STORAGE KEYS & STATE ---
const USERS_STORAGE_KEY = "elevate_users";
const CURRENT_USER_KEY = "elevate_current_user";

let searchQuery = "";
let currentUser = null;

// --- 2. DEFAULT SEED DATA ---
const DEFAULT_USERS = [
  {
    id: "user_101",
    name: "Aarav Sharma",
    email: "aarav@elevate.edu",
    password: "password123",
    rollNumber: "2024CS101",
    branch: "Computer Science & Engineering",
    graduationYear: 2026,
    cgpa: 8.9,
    careerGoal: "Full-Stack Software Engineer & JavaScript Developer",
    skills: ["JavaScript", "HTML5", "CSS3", "Bootstrap 5", "DOM & Events", "Async/Await", "REST APIs"]
  }
];

const seedData = {
  overview: {
    title: "Elevate - Career & Skill Development",
    description: "A centralized platform for student placement management, portfolio building, and mastering JavaScript core concepts.",
    problemPoints: [
      "Fragmented placement study resources across multiple websites and PDFs",
      "Lack of structured progress tracking for core technical concepts and projects",
      "Difficulty in maintaining updated resume versions and certified credentials",
      "Unorganized interview experience logs and peer placement guidance"
    ]
  },
  resumes: [
    { title: "Resume v3 - Full Stack JS", detail: "Highlighting MERN & Bootstrap skills.", status: "Latest" },
    { title: "Resume v2 - SDE General", detail: "Emphasizing Data Structures & Algorithms.", status: "Backup" }
  ],
  certificates: [
    { title: "JavaScript Algorithms & Data Structures", issuer: "freeCodeCamp", tag: "JS Core" },
    { title: "Full Stack Web Development", issuer: "Coursera", tag: "Web Dev" },
    { title: "Bootstrap 5 & Responsive UI Design", issuer: "Udemy", tag: "UI/UX" }
  ],
  projects: [
    { name: "Elevate Platform", desc: "Student placement & portfolio portal built using Vanilla JS & Bootstrap 5.", stack: ["HTML5", "CSS3", "Bootstrap 5", "JavaScript"], status: "Active" },
    { name: "JS Problem Solver", desc: "Interactive algorithm practice tool with local storage persistence.", stack: ["JavaScript", "DOM API", "LocalStorage"], status: "Completed" }
  ],
  companies: [
    { name: "Infosprint Tech", role: "Software Engineer", eligibility: "CGPA 7.5+, JS, DSA", deadline: "Aug 15, 2026", status: "Open Drive" },
    { name: "Nexa Digital", role: "Frontend Developer Intern", eligibility: "CGPA 7.0+, HTML/CSS, JS", deadline: "Aug 22, 2026", status: "Shortlisting" }
  ],
  interviewExperiences: [
    { company: "Infosprint Tech", role: "Software Engineer", difficulty: "Medium", takeaway: "Focus on arrays, async JavaScript, and DOM events." },
    { company: "Blue Orbit SaaS", role: "Frontend Developer", difficulty: "Medium", takeaway: "Expect responsive UI questions and live API integration." },
    { company: "Nexa Digital", role: "Software Analyst", difficulty: "Hard", takeaway: "DBMS normalization, SQL joins, and algorithmic problem solving." }
  ],
  resources: [
    { title: "DSA & Core Algorithm Revision", category: "Data Structures", desc: "Top array, string, and dynamic programming interview problems." },
    { title: "REST API & Async JS Workbook", category: "Web Development", desc: "Practice sets on Promises, async/await, and Fetch API handling." },
    { title: "Campus Aptitude & Reasoning Pack", category: "Aptitude", desc: "Speed math, logical reasoning, and data interpretation practice." }
  ],
  defaultStudent: {
    name: "Aarav Sharma",
    branch: "B.Tech in Computer Science & Engineering",
    cgpa: 8.9,
    year: 2026
  }
};

// --- 3. HELPER FUNCTIONS ---
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCgpa(value) {
  let num = Number(value);
  if (isNaN(num)) return "0.0";
  return num.toFixed(1);
}

function isValidPassword(password) {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return passwordRegex.test(password);
}

// --- 4. LOCAL STORAGE USER MANAGEMENT ---
function getUsersFromStorage() {
  const data = localStorage.getItem(USERS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_USERS;
  }
}

function saveUsersToStorage(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUserFromStorage() {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function setCurrentUserInStorage(user) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// --- 5. DOM MANIPULATION & RENDERING ---

function renderOverviewContent() {
  const titleEl = document.getElementById("project-title");
  const descEl = document.getElementById("project-description");
  if (titleEl) titleEl.textContent = seedData.overview.title;
  if (descEl) descEl.textContent = seedData.overview.description;

  const probContainer = document.getElementById("problem-points");
  if (probContainer && seedData.overview.problemPoints) {
    let htmlContent = "";
    for (let i = 0; i < seedData.overview.problemPoints.length; i++) {
      const point = seedData.overview.problemPoints[i];
      htmlContent += `
        <div class="col-md-6">
          <div class="p-3 rounded-3 bg-light border small text-secondary">${escapeHtml(point)}</div>
        </div>
      `;
    }
    probContainer.innerHTML = htmlContent;
  }
}

function renderSkills(skillsArray) {
  const container = document.getElementById("student-skills");
  if (!container) return;

  let htmlContent = "";
  for (let i = 0; i < skillsArray.length; i++) {
    const skill = skillsArray[i];
    htmlContent += `<span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-3 py-2 rounded-pill fw-semibold me-1 mb-1" style="background:#e0e7ff; color:#3730a3;">${escapeHtml(skill)}</span>`;
  }
  container.innerHTML = htmlContent;
}

function renderCompanies() {
  const container = document.getElementById("company-list");
  if (!container) return;

  const filtered = [];
  for (let i = 0; i < seedData.companies.length; i++) {
    const comp = seedData.companies[i];
    const fullText = (comp.name + " " + comp.role + " " + comp.eligibility).toLowerCase();
    if (fullText.includes(searchQuery)) {
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
          <h5 class="fw-bold text-dark mb-1">${escapeHtml(c.name)}</h5>
          <p class="small text-secondary mb-1">${escapeHtml(c.role)} • <strong class="text-dark">${escapeHtml(c.eligibility)}</strong></p>
          <small class="text-muted">Deadline: ${escapeHtml(c.deadline)}</small>
        </div>
        <span class="badge bg-success px-3 py-2 rounded-pill">${escapeHtml(c.status)}</span>
      </div>
    `;
  }
  container.innerHTML = htmlContent;
}

function renderResumes() {
  const container = document.getElementById("resume-versions-list");
  if (!container) return;

  let htmlContent = "";
  for (let i = 0; i < seedData.resumes.length; i++) {
    const r = seedData.resumes[i];
    htmlContent += `
      <div class="p-2 rounded bg-white border mb-2 d-flex justify-content-between align-items-center">
        <div>
          <strong class="d-block small text-dark">${escapeHtml(r.title)}</strong>
          <small class="text-secondary" style="font-size:0.75rem;">${escapeHtml(r.detail)}</small>
        </div>
        <span class="badge bg-success-subtle text-success border border-success border-opacity-25">${escapeHtml(r.status)}</span>
      </div>
    `;
  }
  container.innerHTML = htmlContent;
}

function renderCertificates() {
  const container = document.getElementById("certificate-grid");
  if (!container) return;

  let htmlContent = "";
  for (let i = 0; i < seedData.certificates.length; i++) {
    const c = seedData.certificates[i];
    htmlContent += `
      <div class="p-2 rounded bg-white border d-flex justify-content-between align-items-center">
        <div>
          <strong class="d-block small text-dark">${escapeHtml(c.title)}</strong>
          <small class="text-secondary" style="font-size:0.75rem;">${escapeHtml(c.issuer)}</small>
        </div>
        <span class="badge bg-primary-subtle text-primary">${escapeHtml(c.tag)}</span>
      </div>
    `;
  }
  container.innerHTML = htmlContent;
}

function renderProjects() {
  const container = document.getElementById("project-grid");
  if (!container) return;

  let htmlContent = "";
  for (let i = 0; i < seedData.projects.length; i++) {
    const p = seedData.projects[i];

    let stackBadges = "";
    for (let j = 0; j < p.stack.length; j++) {
      stackBadges += `<span class="badge bg-white text-secondary border small me-1">${escapeHtml(p.stack[j])}</span>`;
    }

    htmlContent += `
      <div class="col-md-6">
        <div class="p-3 rounded-4 bg-light border h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="fw-bold mb-0 text-dark">${escapeHtml(p.name)}</h5>
              <span class="badge bg-info-subtle text-info-emphasis">${escapeHtml(p.status)}</span>
            </div>
            <p class="small text-secondary">${escapeHtml(p.desc)}</p>
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

function renderInterviews() {
  const container = document.getElementById("interview-list");
  if (!container) return;

  let htmlContent = "";
  for (let i = 0; i < seedData.interviewExperiences.length; i++) {
    const item = seedData.interviewExperiences[i];
    htmlContent += `
      <div class="col-md-4">
        <div class="p-3 rounded-4 bg-light border h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="fw-bold text-dark mb-0">${escapeHtml(item.company)}</h5>
              <span class="badge bg-secondary-subtle text-secondary">${escapeHtml(item.difficulty)}</span>
            </div>
            <p class="small fw-semibold text-primary mb-2">${escapeHtml(item.role)}</p>
            <p class="small text-secondary mb-0">${escapeHtml(item.takeaway)}</p>
          </div>
        </div>
      </div>
    `;
  }
  container.innerHTML = htmlContent;
}

function renderResources() {
  const container = document.getElementById("resource-list");
  if (!container) return;

  let htmlContent = "";
  for (let i = 0; i < seedData.resources.length; i++) {
    const item = seedData.resources[i];
    htmlContent += `
      <div class="col-md-4">
        <div class="p-3 rounded-4 bg-light border h-100 d-flex flex-column justify-content-between">
          <div>
            <span class="badge bg-primary-subtle text-primary mb-2">${escapeHtml(item.category)}</span>
            <h5 class="fw-bold text-dark mb-2">${escapeHtml(item.title)}</h5>
            <p class="small text-secondary mb-0">${escapeHtml(item.desc)}</p>
          </div>
        </div>
      </div>
    `;
  }
  container.innerHTML = htmlContent;
}

function renderAllData() {
  renderOverviewContent();
  renderSkills(["JavaScript ES6+", "HTML5", "CSS3", "Bootstrap 5", "DOM & Events", "Async/Await", "REST APIs"]);
  renderCompanies();
  renderResumes();
  renderCertificates();
  renderProjects();
  renderInterviews();
  renderResources();
}

// --- 6. AUTHENTICATION & UI STATE ---

function getUserInitials(name) {
  let nameParts = name.split(" ");

  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
  }

  if (nameParts.length === 1 && nameParts[0].length > 0) {
    return nameParts[0].slice(0, 2).toUpperCase();
  }

  return "ST";
}

function showLoggedInUI(user) {
  const navLoggedOut = document.getElementById("nav-user-logged-out");
  const navLoggedIn = document.getElementById("nav-user-logged-in");
  const navBtnSignIn = document.getElementById("nav-btn-open-login");
  const navAvatarBtn = document.getElementById("nav-avatar-btn");
  const navInitials = document.getElementById("nav-avatar-initials");
  const navUserInitials = document.getElementById("nav-user-avatar-initials");
  const navName = document.getElementById("nav-user-display-name");
  const navEmail = document.getElementById("nav-user-display-email");
  const navRoll = document.getElementById("nav-user-roll-badge");

  const studentName = document.getElementById("student-name");
  const studentMeta = document.getElementById("student-meta");
  const studentCgpa = document.getElementById("student-cgpa");
  const initials = getUserInitials(user.name);

  if (navBtnSignIn) navBtnSignIn.style.display = "none";
  if (navAvatarBtn) navAvatarBtn.style.display = "flex";
  if (navLoggedOut) navLoggedOut.style.display = "none";
  if (navLoggedIn) navLoggedIn.style.display = "block";

  if (navInitials) navInitials.textContent = initials;
  if (navUserInitials) navUserInitials.textContent = initials;
  if (navName) navName.textContent = user.name;
  if (navEmail) navEmail.textContent = user.email;
  if (navRoll) navRoll.textContent = user.rollNumber || "Student";

  if (studentName) studentName.textContent = user.name;
  if (studentMeta) studentMeta.textContent = (user.branch || "Computer Science") + " | Class of " + (user.graduationYear || 2026);
  if (studentCgpa) studentCgpa.textContent = formatCgpa(user.cgpa);

  if (user.skills && Array.isArray(user.skills)) {
    renderSkills(user.skills);
  }
}

function showLoggedOutUI() {
  const navLoggedOut = document.getElementById("nav-user-logged-out");
  const navLoggedIn = document.getElementById("nav-user-logged-in");
  const navBtnSignIn = document.getElementById("nav-btn-open-login");
  const navAvatarBtn = document.getElementById("nav-avatar-btn");

  const studentName = document.getElementById("student-name");
  const studentMeta = document.getElementById("student-meta");
  const studentCgpa = document.getElementById("student-cgpa");
  const def = seedData.defaultStudent;

  if (navBtnSignIn) navBtnSignIn.style.display = "inline-flex";
  if (navAvatarBtn) navAvatarBtn.style.display = "none";
  if (navLoggedOut) navLoggedOut.style.display = "block";
  if (navLoggedIn) navLoggedIn.style.display = "none";

  if (studentName) studentName.textContent = def.name;
  if (studentMeta) studentMeta.textContent = def.branch + " | Graduating " + def.year;
  if (studentCgpa) studentCgpa.textContent = formatCgpa(def.cgpa);

  renderSkills(["JavaScript ES6+", "HTML5", "CSS3", "Bootstrap 5", "DOM & Events", "Async/Await", "REST APIs"]);
}

function updateAuthUI() {
  if (currentUser) {
    showLoggedInUI(currentUser);
  } else {
    showLoggedOutUI();
  }
}

function setAuthAlert(msg, isError) {
  const alertBox = document.getElementById("auth-alert");
  if (!alertBox) return;

  if (!msg) {
    alertBox.classList.add("d-none");
    return;
  }

  alertBox.classList.remove("d-none", "alert-danger", "alert-success");
  if (isError) {
    alertBox.classList.add("alert-danger");
  } else {
    alertBox.classList.add("alert-success");
  }
  alertBox.textContent = msg;
}

function showStatusMessage(text) {
  const statusMsg = document.getElementById("upload-status-msg");
  if (statusMsg) {
    statusMsg.textContent = text;
    statusMsg.classList.remove("d-none");
    setTimeout(function() {
      statusMsg.classList.add("d-none");
    }, 3000);
  }
}

function toggleNavDropdown() {
  const dropdown = document.getElementById("nav-profile-dropdown");
  if (dropdown) {
    dropdown.classList.toggle("is-open");
  }
}

function closeNavDropdown() {
  const dropdown = document.getElementById("nav-profile-dropdown");
  if (dropdown) {
    dropdown.classList.remove("is-open");
  }
}

function openAuthModal() {
  closeNavDropdown();
  const modal = document.getElementById("authModal");
  if (!modal) return;

  setActiveAuthTab("#pills-login");
  if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
    bootstrap.Modal.getOrCreateInstance(modal).show();
    return;
  }
  modal.style.display = "block";
  modal.classList.add("show");
}

function hideAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;

  if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
    const instance = bootstrap.Modal.getInstance(modal);
    if (instance) {
      instance.hide();
      return;
    }
  }
  modal.classList.remove("show");
  modal.style.display = "none";
}

function setActiveAuthTab(targetSelector) {
  const tabButtons = document.querySelectorAll("#authTabs button[data-bs-target]");
  const tabPanes = document.querySelectorAll("#authTabsContent .tab-pane");

  for (let i = 0; i < tabButtons.length; i++) {
    const btn = tabButtons[i];
    const isTarget = btn.getAttribute("data-bs-target") === targetSelector;
    if (isTarget) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }

  for (let i = 0; i < tabPanes.length; i++) {
    const pane = tabPanes[i];
    const isTarget = ("#" + pane.id) === targetSelector;
    if (isTarget) {
      pane.classList.add("show", "active");
    } else {
      pane.classList.remove("show", "active");
    }
  }
}

function setAuthenticatedUser(user) {
  currentUser = user;
  setCurrentUserInStorage(user);
  updateAuthUI();
  hideAuthModal();
}

// --- 7. AUTH HANDLERS ---

function handleLoginSubmit(event) {
  event.preventDefault();
  setAuthAlert("", false);

  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  const users = getUsersFromStorage();
  const user = users.find(function(u) { return u.email.toLowerCase() === email; });

  if (!user || user.password !== password) {
    setAuthAlert("Invalid email or password.", true);
    return;
  }

  setAuthenticatedUser(user);
}

function handleRegisterSubmit(event) {
  event.preventDefault();
  setAuthAlert("", false);

  const nameInput = document.getElementById("reg-name");
  const emailInput = document.getElementById("reg-email");
  const rollInput = document.getElementById("reg-roll");
  const cgpaInput = document.getElementById("reg-cgpa");
  const branchInput = document.getElementById("reg-branch");
  const passwordInput = document.getElementById("reg-password");

  if (!nameInput || !emailInput || !rollInput || !cgpaInput || !branchInput || !passwordInput) return;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const rollNumber = rollInput.value.trim();
  const cgpa = cgpaInput.value;
  const branch = branchInput.value.trim();
  const password = passwordInput.value;

  if (!name || !email || !password) {
    setAuthAlert("Name, email, and password are required.", true);
    return;
  }

  if (!isValidPassword(password)) {
    setAuthAlert("Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.", true);
    return;
  }

  const users = getUsersFromStorage();
  const existingUser = users.find(function(u) { return u.email.toLowerCase() === email.toLowerCase(); });

  if (existingUser) {
    setAuthAlert("An account with this email already exists.", true);
    return;
  }

  const newUser = {
    id: "user_" + Date.now(),
    name: name,
    email: email,
    password: password,
    rollNumber: rollNumber || "2024CS-NEW",
    branch: branch || "Computer Science",
    graduationYear: 2026,
    cgpa: cgpa ? parseFloat(cgpa) : 8.5,
    careerGoal: "Aspiring Software Engineer",
    skills: ["JavaScript", "HTML5", "CSS3", "Bootstrap 5", "DOM & Events"]
  };

  users.push(newUser);
  saveUsersToStorage(users);

  setAuthenticatedUser(newUser);
}

// --- 8. EVENT LISTENERS ---

function bindEvents() {
  const searchInput = document.getElementById("company-search");
  if (searchInput) {
    searchInput.addEventListener("input", function(e) {
      searchQuery = e.target.value.toLowerCase().trim();
      renderCompanies();
    });
  }

  const uploadBtn = document.getElementById("btn-upload-resume");
  const fileInput = document.getElementById("resume-file-input");
  const downloadBtn = document.getElementById("btn-download-resume");

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", function() {
      fileInput.click();
    });

    fileInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        seedData.resumes.unshift({
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

  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", handleLoginSubmit);
  }

  const formRegister = document.getElementById("form-register");
  if (formRegister) {
    formRegister.addEventListener("submit", handleRegisterSubmit);
  }

  const navBtnLogout = document.getElementById("nav-btn-logout");
  if (navBtnLogout) {
    navBtnLogout.addEventListener("click", function() {
      currentUser = null;
      setCurrentUserInStorage(null);
      closeNavDropdown();
      updateAuthUI();
    });
  }

  const navAvatarBtn = document.getElementById("nav-avatar-btn");
  if (navAvatarBtn) {
    navAvatarBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      toggleNavDropdown();
    });
  }

  document.addEventListener("click", function(e) {
    const dropdownRoot = document.getElementById("profile-dropdown-root");
    if (dropdownRoot && !dropdownRoot.contains(e.target)) {
      closeNavDropdown();
    }
  });

  const navBtnOpenLogin = document.getElementById("nav-btn-open-login");
  const navBtnOpenInner = document.getElementById("nav-btn-open-login-inner");
  if (navBtnOpenLogin) navBtnOpenLogin.addEventListener("click", openAuthModal);
  if (navBtnOpenInner) navBtnOpenInner.addEventListener("click", openAuthModal);

  const tabButtons = document.querySelectorAll("#authTabs button[data-bs-target]");
  for (let i = 0; i < tabButtons.length; i++) {
    const btn = tabButtons[i];
    btn.addEventListener("click", function() {
      const target = btn.getAttribute("data-bs-target");
      setActiveAuthTab(target);
    });
  }

  const modalCloseBtns = document.querySelectorAll("#authModal [data-bs-dismiss='modal'], #authModal .btn-close");
  for (let i = 0; i < modalCloseBtns.length; i++) {
    const btn = modalCloseBtns[i];
    btn.addEventListener("click", hideAuthModal);
  }
}

// --- 9. INITIALIZATION ---

document.addEventListener("DOMContentLoaded", function() {
  bindEvents();
  renderAllData();
  currentUser = getCurrentUserFromStorage();
  updateAuthUI();
});
