// Student authentication, login modals, and session handling
(function(root) {
  "use strict";

  const Data = root.ElevateData || {
    STORAGE_KEYS: { USERS: "elevate_users", CURRENT_USER: "elevate_current_user" },
    DEFAULT_USERS: []
  };

  const Utils = root.ElevateUtils || {
    byId: function(id) { return document.getElementById(id); },
    escapeHtml: function(s) { return s; },
    formatCgpa: function(v) { return Number(v || 0).toFixed(1); },
    isValidEmail: function(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); },
    isValidPassword: function(p) { return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(p); },
    getUserInitials: function(n) { return (n || "ST").slice(0, 2).toUpperCase(); },
    syncStoredGeminiKey: function() {}
  };

  const USERS_STORAGE_KEY = Data.STORAGE_KEYS.USERS;
  const CURRENT_USER_KEY = Data.STORAGE_KEYS.CURRENT_USER;
  const TOKEN_KEY = "elevate_token";
  let serverHasGeminiKey = false;

  function updateGeminiStatusDisplay() {
    const menuGemini = Utils.byId("menu-gemini-status");
    if (!menuGemini) return;
    const user = currentUser;
    const hasKey = Boolean(user && user.geminiApiKey && !user.geminiApiKey.includes("YOUR_GEMINI_API_KEY")) || Boolean(serverHasGeminiKey);
    if (hasKey) {
      menuGemini.textContent = "CONNECTED";
      menuGemini.style.background = "rgba(16,185,129,0.15)";
      menuGemini.style.color = "#10b981";
      menuGemini.style.borderColor = "rgba(16,185,129,0.3)";
    } else {
      menuGemini.textContent = "OFFLINE";
      menuGemini.style.background = "rgba(255,92,92,0.15)";
      menuGemini.style.color = "#ff5c5c";
      menuGemini.style.borderColor = "rgba(255,92,92,0.3)";
    }
  }

  function getToken() {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (typeof localStorage === "undefined") return;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  const ids = {
    alert: "auth-alert",
    modal: "auth-modal",
    tabs: "auth-tabs",
    panels: "auth-panels",
    loginForm: "login-form",
    signupForm: "signup-form",
    openAuth: "open-auth",
    openAuthAlt: "open-auth-alt",
    logoutBtn: "logout-btn",
    profileMenu: "profile-menu",
    profileDropdown: "profile-dropdown",
    authIn: "auth-in",
    authOut: "auth-out",
    avatarBtn: "avatar-btn",
    avatarText: "avatar-text",
    menuAvatar: "menu-avatar",
    menuName: "menu-name",
    menuEmail: "menu-email",
    menuRoll: "menu-roll",
    studentName: "student-name",
    studentMeta: "student-meta",
    studentCgpa: "student-cgpa",
    studentGoal: "student-goal",
    loginEmail: "login-email",
    loginEmailStatus: "login-email-status",
    loginPassword: "login-password",
    signupName: "signup-name",
    signupEmail: "signup-email",
    signupEmailStatus: "signup-email-status",
    signupRoll: "signup-roll",
    signupCgpa: "signup-cgpa",
    signupBranch: "signup-branch",
    signupYear: "signup-year",
    signupGoal: "signup-goal",
    signupPassword: "signup-password",
    signupResume: "signup-resume",
    signupSubmitBtn: "signup-submit-btn"
  };

  let config = {
    defaultStudent: { name: "Aarav Sharma", branch: "B.Tech in Computer Science & Engineering", cgpa: 8.9, year: 2026 },
    defaultSkills: ["JavaScript ES6+", "HTML5", "CSS3", "Bootstrap 5", "DOM & Events", "Async/Await", "REST APIs"],
    formatCgpa: Utils.formatCgpa,
    renderSkills: function() {}
  };
  let currentUser = null;

  function getUsersFromStorage() {
    if (typeof localStorage === "undefined") return (Data.DEFAULT_USERS || []).slice();

    const data = localStorage.getItem(USERS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(Data.DEFAULT_USERS));
      return (Data.DEFAULT_USERS || []).slice();
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(Data.DEFAULT_USERS));
      return (Data.DEFAULT_USERS || []).slice();
    }
  }

  function saveUsersToStorage(users) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  }

  function getCurrentUserFromStorage() {
    if (typeof localStorage === "undefined") return null;

    const data = localStorage.getItem(CURRENT_USER_KEY);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  function setCurrentUserInStorage(user) {
    if (typeof localStorage === "undefined") return;

    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  function setAuthAlert(message, isError) {
    const alertBox = Utils.byId(ids.alert);
    if (!alertBox) return;

    if (!message) {
      alertBox.classList.add("d-none");
      alertBox.textContent = "";
      return;
    }

    alertBox.classList.remove("d-none", "alert-danger", "alert-success");
    alertBox.classList.add(isError ? "alert-danger" : "alert-success");
    alertBox.textContent = message;
  }

  function setEmailStatus(statusId, message, isError) {
    const statusBox = Utils.byId(statusId);
    if (!statusBox) return;

    if (!message) {
      statusBox.classList.add("d-none");
      statusBox.classList.remove("text-danger", "text-success");
      statusBox.textContent = "";
      return;
    }

    statusBox.classList.remove("d-none", "text-danger", "text-success");
    statusBox.classList.add(isError ? "text-danger" : "text-success");
    statusBox.textContent = message;
  }

  function validateEmailField(inputId, statusId) {
    const input = Utils.byId(inputId);
    if (!input) return false;

    const email = input.value.trim().toLowerCase();
    if (!email) {
      setEmailStatus(statusId, "", false);
      return false;
    }

    if (!Utils.isValidEmail(email)) {
      setEmailStatus(statusId, "Enter a valid email address.", true);
      return false;
    }

    setEmailStatus(statusId, "Email address looks valid.", false);
    return true;
  }

  function showLoggedInUI(user) {
    const initials = Utils.getUserInitials(user.name);
    const authIn = Utils.byId(ids.authIn);
    const authOut = Utils.byId(ids.authOut);
    const openAuth = Utils.byId(ids.openAuth);
    const avatarBtn = Utils.byId(ids.avatarBtn);
    const avatarText = Utils.byId(ids.avatarText);
    const menuAvatar = Utils.byId(ids.menuAvatar);
    const menuName = Utils.byId(ids.menuName);
    const menuEmail = Utils.byId(ids.menuEmail);
    const menuRoll = Utils.byId(ids.menuRoll);
    const studentName = Utils.byId(ids.studentName);
    const studentMeta = Utils.byId(ids.studentMeta);
    const studentCgpa = Utils.byId(ids.studentCgpa);

    if (openAuth) openAuth.style.display = "none";
    if (avatarBtn) avatarBtn.style.display = "flex";
    if (authOut) authOut.style.display = "none";
    if (authIn) authIn.style.display = "block";

    if (avatarText) avatarText.textContent = initials;
    if (menuAvatar) menuAvatar.textContent = initials;
    if (menuName) menuName.textContent = user.name;
    if (menuEmail) menuEmail.textContent = user.email;
    if (menuRoll) menuRoll.textContent = user.rollNumber || "Student";

    if (studentName) studentName.textContent = user.name;
    if (studentMeta) {
      const branchText = user.branch || "Computer Science & Engineering";
      const yearText = user.graduationYear || user.year || 2026;
      studentMeta.textContent = branchText + " | Graduating " + yearText;
    }
    if (studentCgpa) studentCgpa.textContent = (config.formatCgpa || Utils.formatCgpa)(user.cgpa);

    const studentGoal = Utils.byId(ids.studentGoal || "student-goal");
    if (studentGoal) {
      const goalText = user.careerGoal || user.goal || "Build a strong placement-ready profile with organized documents, visible projects, and structured interview preparation.";
      studentGoal.textContent = "Goal: " + goalText;
    }

    updateGeminiStatusDisplay();

    if (Array.isArray(user.skills) && typeof config.renderSkills === "function") {
      config.renderSkills(user.skills);
    }
  }

  function showLoggedOutUI() {
    const authIn = Utils.byId(ids.authIn);
    const authOut = Utils.byId(ids.authOut);
    const openAuth = Utils.byId(ids.openAuth);
    const avatarBtn = Utils.byId(ids.avatarBtn);
    const studentName = Utils.byId(ids.studentName);
    const studentMeta = Utils.byId(ids.studentMeta);
    const studentCgpa = Utils.byId(ids.studentCgpa);
    const studentGoal = Utils.byId(ids.studentGoal || "student-goal");
    const defaultStudent = config.defaultStudent || Data.SEED_DATA.defaultStudent;

    if (openAuth) openAuth.style.display = "inline-flex";
    if (avatarBtn) avatarBtn.style.display = "none";
    if (authOut) authOut.style.display = "block";
    if (authIn) authIn.style.display = "none";

    updateGeminiStatusDisplay();

    if (studentName) studentName.textContent = defaultStudent.name;
    if (studentMeta) studentMeta.textContent = defaultStudent.branch + " | Graduating " + defaultStudent.year;
    if (studentCgpa) studentCgpa.textContent = (config.formatCgpa || Utils.formatCgpa)(defaultStudent.cgpa);
    if (studentGoal) {
      studentGoal.textContent = "Goal: " + (defaultStudent.goal || defaultStudent.careerGoal || "Build a strong placement-ready profile with organized documents, visible projects, and structured interview preparation.");
    }

    if (typeof config.renderSkills === "function") {
      config.renderSkills(config.defaultSkills || Data.DEFAULT_SKILLS);
    }
  }

  function updateAuthUI() {
    if (currentUser) {
      showLoggedInUI(currentUser);
    } else {
      showLoggedOutUI();
    }
  }

  function closeProfileDropdown() {
    const dropdown = Utils.byId(ids.profileDropdown);
    if (dropdown) {
      dropdown.classList.remove("is-open");
    }
  }

  function toggleProfileDropdown() {
    const dropdown = Utils.byId(ids.profileDropdown);
    if (dropdown) {
      dropdown.classList.toggle("is-open");
    }
  }

  function setActiveAuthTab(targetSelector) {
    const trigger = document.querySelector("#" + ids.tabs + ' button[data-bs-target="' + targetSelector + '"]');
    if (!trigger) return;

    if (typeof bootstrap !== "undefined" && bootstrap.Tab) {
      bootstrap.Tab.getOrCreateInstance(trigger).show();
      return;
    }

    const tabButtons = document.querySelectorAll("#" + ids.tabs + " button[data-bs-target]");
    const tabPanes = document.querySelectorAll("#" + ids.panels + " .tab-pane");

    for (let i = 0; i < tabButtons.length; i++) {
      const button = tabButtons[i];
      const isTarget = button.getAttribute("data-bs-target") === targetSelector;
      button.classList.toggle("active", isTarget);
      button.setAttribute("aria-selected", isTarget ? "true" : "false");
    }

    for (let i = 0; i < tabPanes.length; i++) {
      const pane = tabPanes[i];
      const isTarget = "#" + pane.id === targetSelector;
      pane.classList.toggle("show", isTarget);
      pane.classList.toggle("active", isTarget);
      pane.setAttribute("aria-hidden", isTarget ? "false" : "true");
    }
  }

  function openAuthModal(targetSelector) {
    const modal = Utils.byId(ids.modal);
    if (!modal) return;

    closeProfileDropdown();
    setAuthAlert("", false);
    setActiveAuthTab(targetSelector || "#login-panel");

    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(modal).show();
      return;
    }

    modal.style.display = "block";
    modal.classList.add("show");
  }

  function hideAuthModal() {
    const modal = Utils.byId(ids.modal);
    if (!modal) return;

    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(modal).hide();
      return;
    }

    modal.classList.remove("show");
    modal.style.display = "none";
  }

  function setAuthenticatedUser(user) {
    currentUser = user;
    setCurrentUserInStorage(user);
    updateAuthUI();
    setAuthAlert("", false);
    hideAuthModal();
    closeProfileDropdown();

    if (typeof config.onSessionChanged === "function") {
      try {
        config.onSessionChanged(user);
      } catch (err) {
        console.error("Error in onSessionChanged callback:", err);
      }
    }

    // Automatically navigate to the main page / dashboard
    const app = root.ElevateApp || (typeof window !== "undefined" ? window.ElevateApp : null);
    if (app && typeof app.showDashboard === "function") {
      app.showDashboard();
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setAuthAlert("", false);

    const emailInput = Utils.byId(ids.loginEmail);
    const passwordInput = Utils.byId(ids.loginPassword);
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!validateEmailField(ids.loginEmail, ids.loginEmailStatus)) {
      setAuthAlert("Please enter a valid email address.", true);
      return;
    }

    if (!password) {
      setAuthAlert("Password is required.", true);
      return;
    }

    // Attempt MongoDB authentication endpoint first
    if (typeof fetch === "function") {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, password: password })
        });
        const data = await res.json();

        if (res.ok && data.status === "ok") {
          if (data.token) setToken(data.token);
          Utils.syncStoredGeminiKey(email, data.user ? data.user.geminiApiKey : null);
          setAuthenticatedUser(data.user);
          return;
        } else {
          setAuthAlert(data.error || "Incorrect email or password. Please try again.", true);
          return;
        }
      } catch (err) {
        console.warn("Backend auth failed, falling back to local storage:", err);
        setAuthAlert("Unable to reach the server. Please check your network connection.", true);
        return;
      }
    }

    // Local storage fallback if offline
    const users = getUsersFromStorage();
    const user = users.find(function(item) {
      return item.email.toLowerCase() === email;
    });

    if (!user || user.password !== password) {
      setAuthAlert("Incorrect email or password.", true);
      return;
    }

    setAuthenticatedUser(user);
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    setAuthAlert("", false);

    const nameInput = Utils.byId(ids.signupName);
    const emailInput = Utils.byId(ids.signupEmail);
    const rollInput = Utils.byId(ids.signupRoll);
    const cgpaInput = Utils.byId(ids.signupCgpa);
    const branchInput = Utils.byId(ids.signupBranch);
    const yearInput = Utils.byId(ids.signupYear);
    const goalInput = Utils.byId(ids.signupGoal);
    const passwordInput = Utils.byId(ids.signupPassword);
    const resumeInput = Utils.byId(ids.signupResume);
    const submitBtn = Utils.byId(ids.signupSubmitBtn);
    const geminiKeyInput = Utils.byId("signup-gemini-key");

    if (!nameInput || !emailInput || !passwordInput) {
      return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const rollNumber = rollInput ? rollInput.value.trim() : "";
    const cgpa = cgpaInput ? cgpaInput.value : "";
    const branch = branchInput ? branchInput.value.trim() : "";
    const password = passwordInput.value;
    const geminiKey = geminiKeyInput && geminiKeyInput.value ? geminiKeyInput.value.trim() : "";

    let graduationYear = 2026;
    if (yearInput && yearInput.value.trim()) {
      const py = parseInt(yearInput.value.trim(), 10);
      if (!isNaN(py) && py > 1900 && py < 2100) graduationYear = py;
    }

    const careerGoal = (goalInput && goalInput.value.trim())
      ? goalInput.value.trim()
      : "Build a strong placement-ready profile with organized documents, visible projects, and structured interview preparation.";

    if (!name || !email || !password) {
      setAuthAlert("Name, email, and password are required.", true);
      return;
    }

    if (!validateEmailField(ids.signupEmail, ids.signupEmailStatus)) {
      setAuthAlert("Please enter a valid email address.", true);
      return;
    }

    if (!Utils.isValidPassword(password)) {
      setAuthAlert("Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.", true);
      return;
    }

    const resumeFile = resumeInput && resumeInput.files && resumeInput.files[0];

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = (resumeFile && geminiKey)
        ? "Uploading & Parsing Resume with AI..."
        : (resumeFile ? "Uploading Resume & Creating Account..." : "Creating Student Account...");
    }

    if (resumeFile) {
      if (geminiKey) {
        setAuthAlert("Uploading resume & analyzing skills with Gemini AI...", false);
      } else {
        setAuthAlert("Creating student account & saving profile...", false);
      }
    }

    // Submit to MongoDB backend endpoint
    if (typeof fetch === "function") {
      try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("rollNumber", rollNumber || "2024CS-NEW");
        formData.append("branch", branch || "Computer Science & Engineering");
        formData.append("graduationYear", graduationYear);
        formData.append("cgpa", cgpa || "8.5");
        formData.append("careerGoal", careerGoal);
        if (geminiKey) {
          formData.append("geminiApiKey", geminiKey);
        }
        if (resumeFile) {
          formData.append("resume", resumeFile);
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          body: formData
        });
        const data = await res.json();

        if (res.ok && data.status === "ok") {
          if (data.token) setToken(data.token);
          Utils.syncStoredGeminiKey(email, geminiKey);
          setAuthenticatedUser(data.user);
          return;
        } else {
          setAuthAlert(data.error || "Failed to create account.", true);
          return;
        }
      } catch (err) {
        console.warn("Backend registration failed, falling back to local storage:", err);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Student Account";
        }
      }
    }

    // Local storage fallback if offline
    const users = getUsersFromStorage();
    const existingUser = users.find(function(item) {
      return item.email.toLowerCase() === email;
    });

    if (existingUser) {
      setAuthAlert("An account with this email already exists.", true);
      return;
    }

    let extractedSkills = [];
    let extractedProjects = [];
    let extractedCertifications = [];
    let userResumes = [];

    if (resumeFile) {
      userResumes = [{
        title: "Resume - " + resumeFile.name,
        detail: "Uploaded Document",
        status: "Active"
      }];
    }

    const parsedCgpa = parseFloat(cgpa);
    const newUser = {
      id: "user_" + Date.now(),
      name: name,
      email: email,
      password: password,
      rollNumber: rollNumber || "2024CS-NEW",
      branch: branch || "Computer Science & Engineering",
      graduationYear: graduationYear,
      year: graduationYear,
      cgpa: !isNaN(parsedCgpa) ? parsedCgpa : 8.5,
      careerGoal: careerGoal,
      goal: careerGoal,
      skills: extractedSkills,
      projects: extractedProjects,
      certificates: extractedCertifications,
      resumes: userResumes,
      resumeName: resumeFile ? resumeFile.name : null
    };

    users.push(newUser);
    saveUsersToStorage(users);
    setAuthenticatedUser(newUser);

    if (typeof config.onUserRegistered === "function") {
      config.onUserRegistered(newUser);
    }
  }

  function handleLogout() {
    currentUser = null;
    setToken(null);
    setCurrentUserInStorage(null);
    Utils.syncStoredGeminiKey(currentUser ? currentUser.email : null, "");
    closeProfileDropdown();
    updateAuthUI();

    if (typeof config.onSessionChanged === "function") {
      config.onSessionChanged(null);
    }

    // Automatically return to the landing page
    if (root.ElevateApp && typeof root.ElevateApp.showLanding === "function") {
      root.ElevateApp.showLanding();
    }
  }

  function bindEvents() {
    const authTabs = document.querySelectorAll("#" + ids.tabs + " button[data-bs-target]");
    const loginForm = Utils.byId(ids.loginForm);
    const signupForm = Utils.byId(ids.signupForm);
    const logoutBtn = Utils.byId(ids.logoutBtn);
    const avatarBtn = Utils.byId(ids.avatarBtn);
    const openAuth = Utils.byId(ids.openAuth);
    const openAuthAlt = Utils.byId(ids.openAuthAlt);
    const loginEmail = Utils.byId(ids.loginEmail);
    const signupEmail = Utils.byId(ids.signupEmail);
    const modal = Utils.byId(ids.modal);
    const closeButtons = document.querySelectorAll("#" + ids.modal + ' [data-bs-dismiss="modal"]');

    if (loginForm) {
      loginForm.addEventListener("submit", handleLoginSubmit);
    }

    if (signupForm) {
      signupForm.addEventListener("submit", handleSignupSubmit);
    }

    for (let i = 0; i < authTabs.length; i++) {
      authTabs[i].addEventListener("click", function(event) {
        event.preventDefault();
        setActiveAuthTab(authTabs[i].getAttribute("data-bs-target"));
      });
    }

    for (let i = 0; i < closeButtons.length; i++) {
      closeButtons[i].addEventListener("click", function(event) {
        event.preventDefault();
        hideAuthModal();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
    }

    if (avatarBtn) {
      avatarBtn.addEventListener("click", function(event) {
        event.stopPropagation();
        toggleProfileDropdown();
      });
    }

    if (openAuth) {
      openAuth.addEventListener("click", function() {
        openAuthModal("#login-panel");
      });
    }

    if (openAuthAlt) {
      openAuthAlt.addEventListener("click", function() {
        openAuthModal("#login-panel");
      });
    }

    if (loginEmail) {
      loginEmail.addEventListener("input", function() {
        validateEmailField(ids.loginEmail, ids.loginEmailStatus);
      });
    }

    if (signupEmail) {
      signupEmail.addEventListener("input", function() {
        validateEmailField(ids.signupEmail, ids.signupEmailStatus);
      });
    }

    document.addEventListener("click", function(event) {
      const profileMenu = Utils.byId(ids.profileMenu);
      if (profileMenu && !profileMenu.contains(event.target)) {
        closeProfileDropdown();
      }
    });

    if (modal) {
      modal.addEventListener("hidden.bs.modal", function() {
        setAuthAlert("", false);
        setEmailStatus(ids.loginEmailStatus, "", false);
        setEmailStatus(ids.signupEmailStatus, "", false);
      });
    }
  }

  async function init(options) {
    if (options) {
      config = Object.assign({}, config, options);
    }
    bindEvents();
    currentUser = getCurrentUserFromStorage();
    updateAuthUI();

    // Verify and refresh session from MongoDB using stored JWT token
    const token = getToken();
    if (token && typeof fetch === "function") {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            currentUser = data.user;
            setCurrentUserInStorage(data.user);
            updateAuthUI();
            if (typeof config.onSessionChanged === "function") {
              config.onSessionChanged(data.user);
            }
          }
        } else if (res.status === 401) {
          // Token is invalid/expired; clear session
          setToken(null);
          currentUser = null;
          setCurrentUserInStorage(null);
          updateAuthUI();
        }
      } catch (_) {
        // Offline / network failure; continue with local cached session
      }
    }

    // Check server Gemini configuration status
    if (typeof fetch === "function") {
      try {
        fetch("/api/health").then(r => r.json()).then(data => {
          if (data && data.hasGeminiKey) {
            serverHasGeminiKey = true;
            updateGeminiStatusDisplay();
          }
        }).catch(() => {});
      } catch (_) {}
    }
  }

  async function updateUser(updatedUser) {
    if (!updatedUser) return;
    currentUser = updatedUser;
    setCurrentUserInStorage(updatedUser);

    // Sync profile updates to MongoDB
    const token = getToken();
    if (token && typeof fetch === "function") {
      try {
        await fetch("/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify(updatedUser)
        });
      } catch (_) {}
    }

    const users = getUsersFromStorage();
    const idx = users.findIndex(function(u) {
      return u.email.toLowerCase() === updatedUser.email.toLowerCase();
    });
    if (idx !== -1) {
      users[idx] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    saveUsersToStorage(users);
    updateAuthUI();
  }

  const ElevateAuth = {
    init: init,
    getCurrentUser: function() { return currentUser; },
    getToken: getToken,
    getUsers: getUsersFromStorage,
    updateUser: updateUser,
    updateAuthUI: updateAuthUI,
    openAuthModal: openAuthModal,
    hideAuthModal: hideAuthModal,
    logout: handleLogout,
    updateGeminiStatus: function(connected) {
      serverHasGeminiKey = Boolean(connected);
      updateGeminiStatusDisplay();
    },
    isGeminiConnected: function() {
      const user = currentUser;
      return Boolean(user && user.geminiApiKey && !user.geminiApiKey.includes("YOUR_GEMINI_API_KEY")) || Boolean(serverHasGeminiKey);
    }
  };

  root.ElevateAuth = ElevateAuth;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = ElevateAuth;
  }
})(typeof window !== "undefined" ? window : globalThis);
