# Elevate — Student Career & Placement Portal

> A unified student placement-readiness platform with portfolio management, resume versioning, verified credentials, peer interview logs, study resource packs, and campus drive tracking built with pure **HTML5, CSS3, and Vanilla JavaScript**.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture & Directory Structure](#architecture--directory-structure)
- [Getting Started & Running Locally](#getting-started--running-locally)
- [Automated Testing](#automated-testing)
- [Default Demo Credentials](#default-demo-credentials)
- [Environment Variables & Security](#environment-variables--security)
- [License](#license)

---

## Overview

**Elevate** is a centralized client-side web application designed to help university students organize and accelerate their campus placement journey from a single, responsive dashboard. It addresses the common fragmentation of placement preparation by bringing together:

1. **Student Placement Profile**: Displays CGPA, graduation year, academic department, career goals, and technical skill cloud.
2. **Resume & Asset Management**: Versioning and tracking of role-specific resumes (SDE, Full-Stack, Frontend) alongside verified course certifications.
3. **Featured Project Portfolio**: Showcase of practical software projects with tech stack badges and status indicators.
4. **Peer Interview Hub**: Crowd-sourced logs of real technical interview rounds, difficulty ratings, and key takeaways.
5. **Curated Learning Resources**: Fast-track revision packs covering Data Structures & Algorithms, REST APIs, and Campus Aptitude.
6. **Campus Drive Tracker**: Live filtering and search of upcoming company drives, eligibility thresholds (CGPA, tech stacks), and application deadlines.
7. **Client-Side Authentication**: Persistent user registration, secure session state, and user profile management using the browser's `localStorage` API.

---

## Key Features

- **Zero-Dependency Core**: Runs out-of-the-box in any modern web browser without requiring Node.js, compilation, or backend servers.
- **Modular Architecture**: Clean separation of data store (`data.js`), pure utilities (`utils.js`), dashboard rendering (`dashboard.js`), and session authentication (`auth.js`).
- **Input Sanitization & Security**: All dynamic HTML outputs are sanitized via `escapeHtml()` to protect against Cross-Site Scripting (XSS).
- **Password & Email Validation**: Enforces strong passwords (minimum 8 characters, uppercase letter, number, and special character) and RFC-compliant email verification.
- **Glassmorphic Design System**: Custom modern UI styling with HSL/HEX CSS custom properties, backdrop filters, responsive layout, and dark-mode navigation pills.
- **Full Test Coverage**: Built-in test suite powered by Node.js native test runner (`node:test`) verifying schema integrity, validation logic, and DOM element contracts.

---

## Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Markup** | HTML5 | Semantic HTML (`<header>`, `<aside>`, `<main>`, `<section>`) with ARIA accessibility |
| **Styling** | Vanilla CSS3 & Bootstrap 5.3 CDN | Custom design tokens, glassmorphism, responsive grid |
| **Logic** | Vanilla JavaScript (ES6+) | Modular architecture with safe browser globals & CommonJS support |
| **Persistence** | Browser `localStorage` API | Persists user accounts and active sessions |
| **Testing** | Node.js Test Runner (`node:test`) | Fast, native zero-dependency automated unit and integration tests |
| **Typography** | Google Fonts | Inter (`400`, `500`, `600`, `700`, `800`) |

---

## Architecture & Directory Structure

```
Elevate/
├── .gitignore               # Ignores OS metadata, editor settings, and temporary files
├── package.json             # Development scripts (tests, syntax check, local server)
├── README.md                # Platform documentation and developer guide
├── index.html               # Main application shell with semantic sections & auth modal
├── css/
│   └── styles.css           # Design tokens, glassmorphic cards, navbar avatar, modal overrides
├── js/
│   ├── data.js              # ElevateData: Seed datasets, default profiles, storage keys
│   ├── utils.js             # ElevateUtils: Pure functions (XSS escaping, CGPA format, regex validators)
│   ├── auth.js              # ElevateAuth: LocalStorage authentication, session state, modal tabs
│   └── app.js               # ElevateApp: Main application rendering, search filtering, and bootstrap
└── tests/
    └── app.test.js          # Automated unit & DOM contract test suite
```

### Module Responsibilities

- **`js/data.js` (`ElevateData`)**: Encapsulates seed data (companies, interview logs, projects, study resources) and storage keys.
- **`js/utils.js` (`ElevateUtils`)**: Provides pure, side-effect-free helpers such as `escapeHtml`, `formatCgpa`, `isValidEmail`, `isValidPassword`, and `getUserInitials`.
- **`js/auth.js` (`ElevateAuth`)**: Encapsulates sign-in, user registration, localStorage session caching, and avatar dropdown interactions.
- **`js/app.js` (`ElevateApp`)**: Serves as the primary application module, managing DOM section rendering, company drive filtering, resume uploads, and bootstrap orchestration on `DOMContentLoaded`.

---

## Getting Started & Running Locally

### Option 1: Direct File Launch (No Setup Required)

1. Open the project folder in your file explorer.
2. Double-click **`index.html`** to launch directly in any modern browser (Chrome, Edge, Firefox, Safari).

### Option 2: Using the Development Server

If Node.js is installed on your system, you can run a local development server:

```bash
# Start a lightweight local static server at http://localhost:3000
npm start
# or
npm run dev
```

---

## Automated Testing

Elevate includes a zero-dependency test suite utilizing Node.js's built-in test runner (`node:test`) and assertion library (`node:assert/strict`):

```bash
# Run the automated test suite
npm test

# Run JavaScript syntax check across all modules
npm run check
```

The test suite validates:
- HTML sanitization against XSS attack vectors.
- Number and CGPA rounding precision.
- Email format validation.
- Password complexity requirements.
- Name initial generation algorithms.
- Data schema integrity for default users and seed datasets.
- DOM element ID contracts in `index.html`.

---

## Default Demo Credentials

A pre-configured demo account is included for immediate testing:

| Attribute | Value |
| :--- | :--- |
| **Email** | `aarav@elevate.edu` |
| **Password** | `password123` |
| **Student Name** | Aarav Sharma |
| **Roll Number** | `2024CS101` |
| **Department** | Computer Science & Engineering |
| **Graduation Year** | 2026 |
| **CGPA** | 8.9 |

> You can also register new accounts using the **Sign In / Register** modal; all new accounts persist in your browser's `localStorage`.

---

## Environment Variables & Security

- **Client-Side Platform**: As Elevate runs purely in the browser with `localStorage`, no server-side `.env` file or API secrets are required.
- **No Hardcoded Secrets**: The demo account uses mock client credentials. Never store real production passwords or private tokens in client-side code.
- **Cross-Site Scripting (XSS) Mitigation**: All user-supplied inputs and dynamically rendered text strings pass through `ElevateUtils.escapeHtml()` prior to insertion into the DOM.

---

## License

This project is licensed under the [MIT License](LICENSE).
