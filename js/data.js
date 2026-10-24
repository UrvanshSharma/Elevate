/**
 * Elevate Data Store
 * Contains seed data, default student configuration, initial users, and storage keys.
 * Compatible with both browser globals and CommonJS for testing.
 */
(function (root) {
  "use strict";

  const STORAGE_KEYS = {
    USERS: "elevate_users",
    CURRENT_USER: "elevate_current_user",
    COMPANIES: "elevate_companies"
  };

  const DEFAULT_SKILLS = [
    "JavaScript ES6+",
    "HTML5",
    "CSS3",
    "Bootstrap 5",
    "DOM & Events",
    "Async/Await",
    "REST APIs"
  ];

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
      skills: [
        "JavaScript ES6+",
        "HTML5",
        "CSS3",
        "Bootstrap 5",
        "DOM & Events",
        "Async/Await",
        "REST APIs"
      ]
    }
  ];

  const SEED_DATA = {
    overview: {
      title: "Elevate - Career Development Platform",
      description: "Unified placement readiness platform built using HTML5, Vanilla CSS, Bootstrap 5, and JavaScript.",
      problemPoints: [
        "Fragmented placement study resources across multiple websites and PDFs",
        "Lack of structured progress tracking for core technical concepts and projects",
        "Difficulty in maintaining updated resume versions and certified credentials",
        "Unorganized interview experience logs and peer placement guidance"
      ]
    },
    resumes: [
      {
        title: "Resume v3 - Full Stack JS",
        detail: "Highlighting MERN & Bootstrap skills.",
        status: "Latest"
      },
      {
        title: "Resume v2 - SDE General",
        detail: "Emphasizing Data Structures & Algorithms.",
        status: "Backup"
      }
    ],
    certificates: [
      {
        title: "JavaScript Algorithms & Data Structures",
        issuer: "freeCodeCamp",
        tag: "JS Core"
      },
      {
        title: "Full Stack Web Development",
        issuer: "Coursera",
        tag: "Web Dev"
      },
      {
        title: "Bootstrap 5 & Responsive UI Design",
        issuer: "Udemy",
        tag: "UI/UX"
      }
    ],
    projects: [
      {
        name: "Elevate Platform",
        desc: "Student placement & portfolio portal built using Vanilla JS & Bootstrap 5.",
        stack: ["HTML5", "CSS3", "Bootstrap 5", "JavaScript"],
        status: "Active"
      },
      {
        name: "JS Problem Solver",
        desc: "Interactive algorithm practice tool with local storage persistence.",
        stack: ["JavaScript", "DOM API", "LocalStorage"],
        status: "Completed"
      }
    ],
    companies: [
      {
        companyName: "Elevate Tech (Demo Sample Placement Drive)",
        name: "Elevate Tech",
        role: "Software Engineering Trainee (Demo Sample)",
        eligibility: "B.Tech/BE (2026 Batch), DSA, Web Development, Problem Solving",
        salary: "₹12 LPA (Sample Package)",
        deadline: "Dec 31, 2026",
        status: "Open Drive",
        applyUrl: "#demo-profile",
        isDemo: true
      }
    ],
    interviewExperiences: [
      {
        company: "Infosprint Tech",
        role: "Software Engineer",
        difficulty: "Medium",
        takeaway: "Focus on arrays, async JavaScript, and DOM events."
      },
      {
        company: "Blue Orbit SaaS",
        role: "Frontend Developer",
        difficulty: "Medium",
        takeaway: "Expect responsive UI questions and live API integration."
      },
      {
        company: "Nexa Digital",
        role: "Software Analyst",
        difficulty: "Hard",
        takeaway: "DBMS normalization, SQL joins, and algorithmic problem solving."
      }
    ],
    resources: [
      {
        title: "DSA & Core Algorithm Revision",
        category: "Data Structures",
        desc: "Top array, string, and dynamic programming interview problems."
      },
      {
        title: "REST API & Async JS Workbook",
        category: "Web Development",
        desc: "Practice sets on Promises, async/await, and Fetch API handling."
      },
      {
        title: "Campus Aptitude & Reasoning Pack",
        category: "Aptitude",
        desc: "Speed math, logical reasoning, and data interpretation practice."
      }
    ],
    defaultStudent: {
      name: "Aarav Sharma",
      branch: "B.Tech in Computer Science & Engineering",
      cgpa: 8.9,
      year: 2026
    }
  };

  const ElevateData = Object.freeze({
    STORAGE_KEYS: STORAGE_KEYS,
    DEFAULT_SKILLS: DEFAULT_SKILLS,
    DEFAULT_USERS: DEFAULT_USERS,
    SEED_DATA: SEED_DATA
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ElevateData;
  } else {
    root.ElevateData = ElevateData;
  }
})(typeof window !== "undefined" ? window : globalThis);
