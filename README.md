# Elevate — Student Career & Placement Portal

> A unified student placement-readiness platform with portfolio management, resume versioning, verified credentials, peer interview logs, study resource packs, and campus drive tracking built with pure **HTML5, CSS3, and Vanilla JavaScript**.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture & Directory Structure](#architecture--directory-structure)
- [Prerequisites](#prerequisites)
- [Getting Started & Running Locally](#getting-started--running-locally)
- [Troubleshooting & Common Issues](#troubleshooting--common-issues)
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

## Prerequisites

Before running the project locally, ensure you have:
- A modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari).
- *(Recommended)* **[Node.js](https://nodejs.org/)** (v18.0.0 or higher) and **npm** for running the local server and test suite.
- *(Optional)* **Git** for cloning the repository.

---

## Getting Started & Running Locally

### Option 1: Development Server via npm (Recommended)

This method serves the application over HTTP on `http://localhost:3000` using a lightweight static server.

#### Step 1: Open Terminal & Navigate to Project Directory
Ensure your terminal's current working directory is inside the `Elevate` folder containing `package.json`:

```bash
# Clone the repository (if not already done)
git clone https://github.com/UrvanshSharma/Elevate.git

# Navigate into the project folder (CRITICAL)
cd Elevate
```

> [!IMPORTANT]
> Make sure your terminal is inside the `Elevate` directory. If you are in the parent workspace folder, running `npm start` will fail with an `ENOENT` error. Run `cd Elevate` first.

#### Step 2: Install Dependencies (Optional)
```bash
npm install
```

#### Step 3: Launch the Development Server
```bash
npm run dev
# or
npm start
```

This starts a local static server at `http://localhost:3000`.

#### Step 4: Open in Your Browser
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

### Option 2: Direct File Launch (Zero Setup)

Because Elevate is built with pure Vanilla HTML, CSS, and JavaScript, it can be launched directly without running any Node.js processes or build tools:

1. Open your file explorer and navigate to the `Elevate/` folder.
2. Double-click **`index.html`** (or right-click `index.html` > **Open with** > your preferred browser).

---

### Option 3: Visual Studio Code "Live Server"

If you work in VS Code:
1. Open the `Elevate` directory in VS Code (`File` > `Open Folder...`).
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click **`index.html`** in the file explorer and select **Open with Live Server**.
4. The page will open automatically at `http://127.0.0.1:5500/index.html`.

---

### Option 4: Python Built-In HTTP Server

If you have Python 3 installed and prefer not to use npm:

```bash
cd Elevate
python -m http.server 3000
# or on macOS/Linux:
python3 -m http.server 3000
```
Then navigate to [http://localhost:3000](http://localhost:3000).

---

## Troubleshooting & Common Issues

### Issue 1: `npm error enoent Could not read package.json`
**Symptom:**
```text
npm error code ENOENT
npm error syscall open
npm error path ...\package.json
npm error errno -4058
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '...\package.json'
```
- **Cause:** You ran `npm run dev` or `npm start` from a parent folder (e.g., `E:\Projects\Elevate`) rather than inside the project directory where `package.json` lives.
- **Solution:** Change directory into the `Elevate` folder before running npm commands:
  ```bash
  cd Elevate
  npm run dev
  ```
  *(You can check your current folder using `pwd` on Linux/macOS or `Get-Location` on Windows PowerShell).*

### Issue 2: Port 3000 Already in Use (`EADDRINUSE`)
- **Cause:** Another process is already utilizing port 3000.
- **Solution:** Specify an alternative port:
  ```bash
  npx serve . -l 3001
  ```
  Or kill the existing process occupying port 3000.

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
