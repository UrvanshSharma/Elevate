/**
 * Automated Test Suite for Elevate
 * Runs natively with Node.js built-in test runner (node --test).
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Utils = require("../js/utils.js");
const Data = require("../js/data.js");

describe("ElevateUtils Unit Tests", () => {
  describe("escapeHtml()", () => {
    it("should escape special HTML characters to prevent XSS", () => {
      const input = '<script>alert("XSS & \'hack\'")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS &amp; &#39;hack&#39;&quot;)&lt;/script&gt;';
      assert.equal(Utils.escapeHtml(input), expected);
    });

    it("should return empty string for non-string inputs", () => {
      assert.equal(Utils.escapeHtml(null), "");
      assert.equal(Utils.escapeHtml(undefined), "");
      assert.equal(Utils.escapeHtml(123), "");
      assert.equal(Utils.escapeHtml({}), "");
    });

    it("should preserve strings with no special characters", () => {
      assert.equal(Utils.escapeHtml("Hello World 123"), "Hello World 123");
    });
  });

  describe("formatCgpa()", () => {
    it("should format numbers to 1 decimal place", () => {
      assert.equal(Utils.formatCgpa(8.9), "8.9");
      assert.equal(Utils.formatCgpa(9), "9.0");
      assert.equal(Utils.formatCgpa(8.945), "8.9");
    });

    it("should format string numbers correctly", () => {
      assert.equal(Utils.formatCgpa("8.5"), "8.5");
      assert.equal(Utils.formatCgpa("10"), "10.0");
    });

    it("should return '0.0' for invalid numbers", () => {
      assert.equal(Utils.formatCgpa("invalid"), "0.0");
      assert.equal(Utils.formatCgpa(null), "0.0");
      assert.equal(Utils.formatCgpa(undefined), "0.0");
    });
  });

  describe("isValidEmail()", () => {
    it("should validate standard email addresses", () => {
      assert.equal(Utils.isValidEmail("aarav@elevate.edu"), true);
      assert.equal(Utils.isValidEmail("student.123@college.ac.in"), true);
      assert.equal(Utils.isValidEmail("user+test@example.com"), true);
    });

    it("should reject invalid email patterns", () => {
      assert.equal(Utils.isValidEmail("plainaddress"), false);
      assert.equal(Utils.isValidEmail("@missingusername.com"), false);
      assert.equal(Utils.isValidEmail("missingdomain@"), false);
      assert.equal(Utils.isValidEmail("spaces in@email.com"), false);
      assert.equal(Utils.isValidEmail(""), false);
      assert.equal(Utils.isValidEmail(null), false);
    });
  });

  describe("isValidPassword()", () => {
    it("should accept passwords satisfying all complexity criteria (>=8 chars, 1 uppercase, 1 digit, 1 special char)", () => {
      assert.equal(Utils.isValidPassword("Password123!"), true);
      assert.equal(Utils.isValidPassword("Elevate#2026"), true);
      assert.equal(Utils.isValidPassword("Secure@99"), true);
    });

    it("should reject passwords that fail complexity rules", () => {
      assert.equal(Utils.isValidPassword("short1!"), false); // Under 8 chars
      assert.equal(Utils.isValidPassword("alllowercase123!"), false); // No uppercase
      assert.equal(Utils.isValidPassword("ALLUPPERCASE123!"), true); // Has uppercase, digit, special, >=8
      assert.equal(Utils.isValidPassword("NoDigitsHere!"), false); // No digit
      assert.equal(Utils.isValidPassword("NoSpecialChars123"), false); // No special character
      assert.equal(Utils.isValidPassword(""), false);
      assert.equal(Utils.isValidPassword(null), false);
    });
  });

  describe("getUserInitials()", () => {
    it("should extract two initials from two or more words", () => {
      assert.equal(Utils.getUserInitials("Aarav Sharma"), "AS");
      assert.equal(Utils.getUserInitials("Priya Ramesh Patel"), "PR");
    });

    it("should extract first two letters from a single word name", () => {
      assert.equal(Utils.getUserInitials("Elevate"), "EL");
      assert.equal(Utils.getUserInitials("John"), "JO");
    });

    it("should fallback to 'ST' for empty or whitespace-only names", () => {
      assert.equal(Utils.getUserInitials(""), "ST");
      assert.equal(Utils.getUserInitials("   "), "ST");
      assert.equal(Utils.getUserInitials(null), "ST");
    });
  });
});

describe("ElevateData Schema & Seed Integrity", () => {
  it("should define required storage keys", () => {
    assert.ok(Data.STORAGE_KEYS.USERS);
    assert.ok(Data.STORAGE_KEYS.CURRENT_USER);
  });

  it("should contain default demo student user with valid credentials", () => {
    assert.ok(Array.isArray(Data.DEFAULT_USERS));
    assert.ok(Data.DEFAULT_USERS.length > 0);

    const demoUser = Data.DEFAULT_USERS[0];
    assert.equal(demoUser.email, "aarav@elevate.edu");
    assert.ok(demoUser.password);
    assert.ok(demoUser.name);
    assert.ok(demoUser.rollNumber);
    assert.ok(typeof demoUser.cgpa === "number");
    assert.ok(Array.isArray(demoUser.skills));
  });

  it("should provide full SEED_DATA with required sections", () => {
    const seed = Data.SEED_DATA;
    assert.ok(seed.overview && seed.overview.title);
    assert.ok(Array.isArray(seed.overview.problemPoints));
    assert.ok(Array.isArray(seed.resumes));
    assert.ok(Array.isArray(seed.certificates));
    assert.ok(Array.isArray(seed.projects));
    assert.ok(Array.isArray(seed.companies));
    assert.ok(Array.isArray(seed.interviewExperiences));
    assert.ok(Array.isArray(seed.resources));
    assert.ok(seed.defaultStudent && seed.defaultStudent.name);
  });
});

describe("HTML Contract & DOM Element IDs", () => {
  const htmlPath = path.resolve(__dirname, "../index.html");
  const htmlContent = fs.readFileSync(htmlPath, "utf-8");

  const requiredElementIds = [
    "topbar",
    "profile-menu",
    "open-auth",
    "avatar-btn",
    "avatar-text",
    "profile-dropdown",
    "auth-in",
    "auth-out",
    "menu-avatar",
    "menu-name",
    "menu-email",
    "menu-roll",
    "logout-btn",
    "open-auth-alt",
    "main-content",
    "overview",
    "project-title",
    "project-description",
    "problem-points",
    "profile",
    "student-name",
    "student-meta",
    "student-cgpa",
    "student-goal",
    "student-skills",
    "assets",
    "resume-file",
    "upload-resume",
    "download-resume",
    "upload-status",
    "resume-list",
    "certificate-grid",
    "portfolio",
    "project-grid",
    "interviews",
    "interview-list",
    "resources",
    "resource-list",
    "placements",
    "company-search",
    "company-list",
    "auth-modal",
    "auth-title",
    "auth-tabs",
    "login-tab",
    "signup-tab",
    "auth-alert",
    "auth-panels",
    "login-panel",
    "login-form",
    "login-email",
    "login-email-status",
    "login-password",
    "signup-panel",
    "signup-form",
    "signup-name",
    "signup-email",
    "signup-email-status",
    "signup-roll",
    "signup-cgpa",
    "signup-branch",
    "signup-password"
  ];

  it("should contain all required element IDs referenced by JavaScript modules", () => {
    for (const id of requiredElementIds) {
      const hasId = htmlContent.includes(`id="${id}"`);
      assert.ok(hasId, `Expected index.html to contain element with id="${id}"`);
    }
  });

  it("should link to modular scripts and css/styles.css", () => {
    assert.ok(htmlContent.includes('href="css/styles.css"'), "Expected reference to css/styles.css");
    assert.ok(htmlContent.includes('src="js/data.js"'), "Expected script js/data.js");
    assert.ok(htmlContent.includes('src="js/utils.js"'), "Expected script js/utils.js");
    assert.ok(htmlContent.includes('src="js/auth.js"'), "Expected script js/auth.js");
    assert.ok(htmlContent.includes('src="js/app.js"'), "Expected script js/app.js");
  });

  it("should verify CSS file exists at css/styles.css", () => {
    const cssPath = path.resolve(__dirname, "../css/styles.css");
    assert.ok(fs.existsSync(cssPath), "css/styles.css must exist");
  });
});
