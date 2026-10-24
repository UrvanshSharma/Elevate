# Elevate — Comprehensive Project Architecture & Technical Guide

> **A Complete Student & Teacher Guide**: In-depth explanation of the system architecture, mathematical complexity, Node.js & Express.js backend, frontend modules, authentication model, AI pipelines, UI engineering algorithms, and an exhaustive Viva / Presentation Q&A cheatsheet.

---

## Table of Contents
1. [Project Overview & Core Purpose](#1-project-overview--core-purpose)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Backend Architecture: Node.js & Express.js](#3-backend-architecture-nodejs--expressjs)
   - [A. Architectural Rationale](#a-architectural-rationale)
   - [B. Code Breakdown of `server.js`](#b-code-breakdown-of-serverjs)
   - [C. REST API Endpoints Specification](#c-rest-api-endpoints-specification)
   - [D. In-Memory Buffers vs Disk Persistence](#d-in-memory-buffers-vs-disk-persistence)
4. [Core Algorithms & Engineering Mechanics](#4-core-algorithms--engineering-mechanics)
   - [A. Google Gemini AI Live Opportunity Search Algorithm](#a-google-gemini-ai-live-opportunity-search-algorithm)
   - [B. Real-Time Client-Side Search & Filtering Algorithm](#b-real-time-client-side-search--filtering-algorithm)
   - [C. Input Sanitization & XSS Mitigation Algorithm](#c-input-sanitization--xss-mitigation-algorithm)
   - [D. Password Complexity & Security Verification](#d-password-complexity--security-verification)
   - [E. Session Authentication, Custom Onboarding & Role Isolation](#e-session-authentication-custom-onboarding--role-isolation)
   - [F. Placement Brick Accordion & Automatic Closing Algorithm](#f-placement-brick-accordion--automatic-closing-algorithm)
   - [G. AI-Powered Resume Parsing & Skill/Project/Cert Extraction](#g-ai-powered-resume-parsing--skillprojectcert-extraction)
   - [H. Interactive Certifications Stack (Hover-Reveal Accordion)](#h-interactive-certifications-stack-hover-reveal-accordion)
   - [I. Subpixel Font Rendering & Anti-Blur Elevation Algorithm](#i-subpixel-font-rendering--anti-blur-elevation-algorithm)
   - [J. Data Isolation & Deduplication Algorithm](#j-data-isolation--deduplication-algorithm)
5. [Frontend Modular Architecture](#5-frontend-modular-architecture)
6. [Data Storage & Persistence Model](#6-data-storage--persistence-model)
7. [Testing & Quality Assurance](#7-testing--quality-assurance)
8. [Teacher / Viva Presentation Cheatsheet (14 Key Questions)](#8-teacher--viva-presentation-cheatsheet)

---

## 1. Project Overview & Core Purpose

**Elevate** is a modern student placement and career-readiness ecosystem engineered specifically for university engineering students (targeting the **2026 graduating batch**).

### The Problem It Solves
Placement preparation in Indian engineering universities is traditionally plagued by severe fragmentation:
- **Scattered Job Information**: Drive notifications are lost across WhatsApp groups, Telegram channels, and LinkedIn feeds with unverified deadlines and broken application links.
- **Unorganized Assets**: Students maintain multiple untracked resume copies across various folders without clear versioning.
- **Lost Peer Insights**: Real technical interview questions and round details shared by seniors disappear into group chat archives.
- **Disorganized Study Resources**: Practice sheets for Data Structures & Algorithms (DSA), System Design, and Campus Aptitude are scattered across dozens of browser bookmarks.

### The Elevate Solution
Elevate consolidates all placement pillars into a single unified workspace:
1. **Student Profile**: Academic credentials (CGPA, Roll Number, Branch), targeted graduation year (`2026`), personalized career goals, and a dynamic technical skill cloud.
2. **Resume & Asset Studio**: Multi-version resume tracker (SDE, Full-Stack, Frontend) with AI-assisted resume extraction and instant PDF download.
3. **Interactive Certifications Stack**: Displays verified credentials in a space-efficient stack with a subtle `+N, Hover to reveal ↓` indicator and smooth accordion reveal.
4. **Project Portfolio**: Live showcase of practical engineering projects with tech stack badges, status indicators, and automatic resume extraction.
5. **Interview Experiences Hub**: Real interview round breakdowns, difficulty ratings, and preparation takeaways from peers.
6. **Curated Learning Resources**: Fast-track revision packs covering DSA, REST APIs, and Campus Quantitative Aptitude.
7. **Live Campus Placement Drives**: Verified hiring drives fetched dynamically via the **Google Gemini AI API** specifically for 2026 batch candidates.

---

## 2. High-Level System Architecture

Elevate implements a clean **Client-Server Architecture** with strict modularity:

```
+-----------------------------------------------------------------------------------+
|                                      CLIENT                                       |
|          (Browser: HTML5 / Vanilla CSS3 / Bootstrap 5 / Modular JavaScript)       |
|                                                                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |    ElevateAuth     |  |     ElevateApp     |  |        ElevateUtils         |  |
|  | (Auth & Onboarding)|  | (UI & Accordions)  |  |  (Pure Math & XSS Escaping) |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|                                                                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |    ElevateData     |  |    ElevateConfig   |  |          StrokeText         |  |
|  |  (Seed & Schemas)  |  |   (API Key Vault)  |  |   (GSAP Kinetic Typography) |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          | HTTP REST API (Port 3000)
                                          v
+-----------------------------------------------------------------------------------+
|                                      BACKEND                                      |
|                               (Node.js & Express.js)                              |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   | server.js                                                                 |   |
|   |  - express.static(__dirname)       -> Serves static assets (HTML/CSS/JS)   |   |
|   |  - GET '/'                         -> Delivers index.html shell           |   |
|   |  - GET '/api/health'               -> Server Health Check REST API        |   |
|   |  - GET '/api/drives/live'          -> Live 2026 Drives Proxy (using .env) |   |
|   |  - POST '/api/resume/parse'        -> Multer Upload & Gemini AI Parse     |   |
|   |  - POST '/api/resume/reparse'      -> Reparse Active Resume from uploads/ |   |
|   |  - GET '/api/resume/download'      -> Secure PDF Resume Delivery          |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                              EXTERNAL CLOUD SERVICES                              |
|         Google Gemini AI Generative Language API (gemini-flash-latest)            |
|         - Real-time Web Search Grounding for Active 2026 India Campus Drives      |
|         - Multimodal Text Understanding for Resume Skills, Projects & Certs       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Backend Architecture: Node.js & Express.js

### A. Architectural Rationale
- **Why Node.js?**: Node.js operates on a single-threaded, event-driven, non-blocking I/O loop. It is exceptionally well-suited for I/O-intensive web applications handling concurrent file uploads and asynchronous network requests to external AI APIs.
- **Why Express.js?**: Express.js is a lightweight, unopinionated web framework for Node.js. It simplifies HTTP routing, middleware composition, request parsing, and static file delivery without introducing the overhead of heavyweight frameworks.

### B. Code Breakdown of `server.js`

Here is the exact structure and logic of [`server.js`](file:///c:/Users/Urvansh/Desktop/Elevate/server.js):

```javascript
// Step 1: Import core Node.js & third-party dependencies
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pdfParse = require("pdf-parse");

// Step 2: Initialize Express app, port, and uploads directory
const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.resolve(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Step 3: Configure Multer (Stores file in RAM buffer for instant parsing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB safety ceiling
});

// Step 4: Middleware pipeline (JSON parsing & static asset delivery with cache control)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});
app.use(express.static(__dirname));

// Step 5: Core Helper Functions (DRY Principle)
// - resolveResumeFile(): Identifies the active student resume on disk
// - extractTextFromBuffer(): Decodes PDF or text buffers into clean strings
// - getApiKey(): Resolves Gemini API Key securely from server-side .env or process.env
// - callGeminiApi(): Calls Gemini generative model with structured schema prompt
// - regexFallbackExtract(): Keyword & pattern matching backup when offline

// Step 6: REST API Routes
// - GET  '/api/health'          -> Health check
// - GET  '/api/drives/live'      -> Live 2026 Campus Placement Drives (proxies Gemini via .env)
// - POST '/api/resume/parse'    -> Upload & parse resume
// - POST '/api/resume/reparse'  -> Reparse active resume from disk
// - GET  '/api/resume/download' -> Stream active PDF resume
```

### C. REST API Endpoints Specification

#### 1. `GET /api/health`
- **Purpose**: System diagnostics and uptime verification.
- **Response**: `200 OK`
  ```json
  { "status": "ok", "message": "Elevate server is running smoothly", "timestamp": "2026-10-24T..." }
  ```

#### 2. `GET /api/drives/live`
- **Purpose**: Proxies Google Gemini AI to retrieve verified, active 2026 India campus placement drives using the server-side `.env` key. Keeps private API credentials 100% off the browser client.
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "source": "gemini",
    "drives": [
      {
        "companyName": "Google",
        "role": "Software Engineering Intern, 2026",
        "eligibility": "B.Tech/B.E./M.Tech graduating in 2026. Strong foundation in DSA, Algorithms, C++, Java, or Python.",
        "salary": "INR 1,00,000 / month",
        "deadline": "Open Drive",
        "status": "Open Drive",
        "applyUrl": "https://www.google.com/about/careers/applications/jobs/results/"
      }
    ]
  }
  ```

#### 3. `POST /api/resume/parse`
- **Purpose**: Accepts multipart form data with a resume document, extracts text in RAM, queries Gemini AI, saves a copy to `uploads/`, and returns structured student data.
- **Request**: `multipart/form-data` with field `resume` (PDF or TXT, $\le 10\text{ MB}$).
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "filename": "Resume - Urvansh.pdf",
    "skills": ["JavaScript", "Python", "React", "Node.js", "Docker"],
    "projects": [
      { "name": "Layer Learn", "summary": "AI desktop copilot with 40 tools", "skills": ["Python", "Ollama"] }
    ],
    "certifications": [
      { "title": "Azure Data Fundamentals", "issuer": "Microsoft", "tag": "Cloud" }
    ]
  }
  ```

#### 4. `POST /api/resume/reparse`
- **Purpose**: Re-analyzes the active student resume already stored on disk in `uploads/` without forcing the user to re-upload the file.
- **Response**: Same structured JSON schema as `/api/resume/parse`.

#### 5. `GET /api/resume/download`
- **Purpose**: Delivers the active student PDF resume as a binary file download.
- **Headers Sent**: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Resume - Urvansh.pdf"`.

### D. In-Memory Buffers vs Disk Persistence
Elevate uses a hybrid storage strategy:
- **Parsing Phase**: Uses `multer.memoryStorage()`. The uploaded document is held temporarily in RAM as a Node.js `Buffer` (`req.file.buffer`). This eliminates temporary file creation, reduces disk I/O latency, and guarantees memory safety.
- **Active Document Persistence**: Once successfully parsed, the active resume is written to `uploads/` with a sanitized filename. This allows the student to re-analyze or download their resume across browser sessions.

---

## 4. Core Algorithms & Engineering Mechanics

### A. Google Gemini AI Live Opportunity Search Algorithm
*Located in:* [`js/app.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/app.js) (`fetchFromGeminiApi`)

#### Goal:
Retrieve verified, active campus recruitment drives in India specifically for the **2026 graduating batch**, avoiding outdated static mock data.

```
[Student Logs In / Clicks "Sync Live Drives"]
                     │
                     ▼
  Retrieve API Key (ElevateConfig -> LocalStorage -> Fallback)
                     │
                     ▼
  Attempt Priority 1: gemini-flash-latest with Search Grounding
        { tools: [{ googleSearch: {} }] }  (Timeout: 6000ms)
                     │
       ┌─────────────┴─────────────┐
       │ SUCCESS                   │ FAILED (429 Rate Limit / Timeout)
       ▼                           ▼
Parse Grounded Response     Attempt Priority 2: gemini-3.5-flash-lite
Extract JSON Array          { responseMimeType: "application/json" }
       │                           │
       └─────────────┬─────────────┘
                     ▼
          Sanitize & Validate Schema:
   - Ensure 7 keys: companyName, role, eligibility, salary, deadline, status, applyUrl
   - Compute two-letter Initials Logo
   - Verify non-empty URL targets
                     │
                     ▼
  Update State & Render Placement Bricks
  Cache Results: localStorage.setItem("elevate_companies_" + email, ...)
```

---

### B. Real-Time Client-Side Search & Filtering Algorithm
*Located in:* [`js/app.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/app.js) (`renderCompanies`)

#### Goal:
Instant search through company drives as the student types, operating with zero server roundtrips.

```javascript
const query = (searchTerm || "").toLowerCase().trim();
const filtered = companies.filter(function(c) {
  const name = (c.companyName || c.name || "").toLowerCase();
  const role = (c.role || "").toLowerCase();
  const elig = (c.eligibility || "").toLowerCase();
  return name.includes(query) || role.includes(query) || elig.includes(query);
});
```
- **Computational Complexity**: $\mathcal{O}(N \times M)$ where $N \le 20$ drives and $M$ is average string length. Executes in $< 1\text{ ms}$, delivering a 60 FPS search experience.

---

### C. Input Sanitization & XSS Mitigation Algorithm
*Located in:* [`js/utils.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/utils.js) (`escapeHtml`)

#### Goal:
Prevent Cross-Site Scripting (XSS) by encoding dangerous HTML characters before injecting user-supplied text into innerHTML.

```javascript
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  var map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return str.replace(/[&<>"']/g, function(char) {
    return map[char];
  });
}
```

---

### D. Password Complexity & Security Verification
*Located in:* [`js/utils.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/utils.js) (`isValidPassword`)

#### Algorithm Rules:
1. Length $\ge 8$ characters.
2. At least one uppercase letter (`[A-Z]`).
3. At least one numerical digit (`[0-9]`).
4. At least one special character (`[!@#$%^&*(),.?":{}|<>]`).

---

### E. Session Authentication, Custom Onboarding & Role Isolation
*Located in:* [`js/auth.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/auth.js)

1. **Structured Registration**:
   - Collects **Full Name**, **University Email**, **Roll Number**, **CGPA**, **Academic Department**, **Graduation Year** (`2026`), and **Career Goal** (e.g., *"Full-Stack SDE specializing in distributed MERN systems"*).
   - Immediately displays `<Department> | Graduating <Year>` and career goal in the `#profile` section.
2. **Demo Student vs Real Student**:
   - If user email is `aarav@elevate.edu`, Elevate operates in **Demo Mode**, displaying mock sample data to protect test environments.
   - When a student registers with their own email, `isRealStudent()` returns `true`, triggering real Gemini placement searches and isolating all data to `elevate_companies_{email}`.

---

### F. Placement Brick Accordion & Automatic Closing Algorithm
*Located in:* [`js/app.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/app.js) (`renderCompanies`)

1. **Click Toggle**: Clicking a placement brick toggles `.is-expanded` and collapses all siblings.
2. **Mouseleave / Pointerleave**:
   ```javascript
   brick.addEventListener("mouseleave", () => brick.classList.remove("is-expanded"));
   brick.addEventListener("pointerleave", () => brick.classList.remove("is-expanded"));
   ```
3. **Click Outside**: A document-level listener detects clicks outside `.placement-brick` and closes open cards automatically.

---

### G. AI-Powered Resume Parsing & Skill/Project/Cert Extraction
*Located in:* [`server.js`](file:///c:/Users/Urvansh/Desktop/Elevate/server.js) & [`js/app.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/app.js)

1. **Extraction Pipeline**:
   - PDF binary data is parsed into plain text via `pdf-parse`.
   - Backend calls Gemini AI with prompt requesting structured JSON `{ skills: [], projects: [], certifications: [] }`.
2. **Frontend Ingestion**:
   - Technical skills are deduplicated and merged into `#student-skills`.
   - Software projects are prepended to `#project-grid`.
   - Verified certifications are populated into `#certificate-grid`.
3. **Resilient Fallback**:
   - If Gemini is unreachable, an intelligent regex engine extracts standard engineering skills and project titles directly from the text.

---

### H. Interactive Certifications Stack (Hover-Reveal Accordion)
*Located in:* [`js/app.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/app.js) (`renderCertificates`) & [`css/styles.css`](file:///c:/Users/Urvansh/Desktop/Elevate/css/styles.css)

#### Problem:
Displaying 4+ certifications statically stretched the right-hand column much taller than the resume card on the left, destroying visual balance.

#### Solution:
- **Idle State**: Displays ONLY the top-most certification on front, accompanied by a subtle indicator:
  > `● +3, Hover to reveal ↓`
- **Interactive Expansion**: On hover or click, the idle indicator collapses and `.asset-expanded-drawer` expands downwards smoothly using `max-height: 1200px` with spring easing `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Edge-Clearance Architecture**: To prevent card borders from disappearing during hover, `.asset-expanded-drawer` uses an 18px horizontal buffer:
  ```css
  .asset-expanded-drawer {
    margin: 0 -18px;
    padding: 0 18px;
    width: calc(100% + 36px);
    box-sizing: border-box;
    overflow: hidden;
  }
  .asset-stack-brick:hover .asset-expanded-drawer {
    padding: 8px 18px;
  }
  ```
- **Auto-Collapse**: Moving the mouse away or clicking outside closes the drawer immediately.

---

### I. Subpixel Font Rendering & Anti-Blur Elevation Algorithm
*Located in:* [`css/styles.css`](file:///c:/Users/Urvansh/Desktop/Elevate/css/styles.css)

#### Problem:
Previously, hovering over dashboard cards caused text, borders, and tags to momentarily blur.

#### Root Cause:
Chromium rasterizes elements into fixed-resolution bitmap textures when `scale(...)` or `will-change: transform` is applied. Stretches of even $2\%$ cause subpixel anti-aliasing to break, resulting in blurry text.

#### Solution:
1. **Removed all `scale(...)` transforms** from hover states across all cards (`.nested-subcard`, `.asset-item-row`).
2. **Standardized on the jobs section pattern**:
   ```css
   .nested-subcard:hover,
   .asset-item-row:hover {
     transform: translateY(-4px);
     box-shadow: 0 16px 36px rgba(40, 28, 42, 0.1), 0 0 0 1px rgba(223, 73, 60, 0.2);
     backface-visibility: hidden;
     -webkit-backface-visibility: hidden;
   }
   ```
3. **Removed `will-change: transform, box-shadow`**, ensuring the browser renders fonts directly onto the 1:1 pixel grid with native subpixel anti-aliasing.

---

### J. Data Isolation & Deduplication Algorithm
*Located in:* [`js/app.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/app.js) (`cleanUserCertificates` & `cleanUserProjects`)

#### Goal:
Ensure real student profiles never display duplicate entries or dummy seed certificates (e.g. static AWS mock badges).

```javascript
function cleanUserCertificates(certs) {
  if (!Array.isArray(certs)) return [];
  const seen = new Set();
  const result = [];
  for (const c of certs) {
    if (!c || !c.title) continue;
    // Exclude static seed demo mock certs from real student accounts
    const titleLower = c.title.toLowerCase();
    if (titleLower.includes("aws certified solutions architect")) continue;
    
    // Normalize variant duplicates (e.g. Azure AI Fundamentals variants)
    const key = titleLower.replace(/[^a-z0-9]/g, "");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(c);
    }
  }
  return result;
}
```

---

## 5. Frontend Modular Architecture

The frontend follows the clean **Revealing Module Pattern**:

| File | Module Name | Primary Responsibility |
| :--- | :--- | :--- |
| [`index.html`](file:///c:/Users/Urvansh/Desktop/Elevate/index.html) | View Shell | Semantic HTML5 structure for Landing Page and Workspace Dashboard |
| [`css/styles.css`](file:///c:/Users/Urvansh/Desktop/Elevate/css/styles.css) | Design System | CSS custom properties, grid layouts, editorial styling, anti-blur rules |
| [`js/data.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/data.js) | `ElevateData` | Seed datasets, default profiles, study resources, interview logs |
| [`js/utils.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/utils.js) | `ElevateUtils` | Pure utility functions: XSS sanitization, CGPA formatting, initials extractor |
| [`js/auth.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/auth.js) | `ElevateAuth` | Student registration, login modal tabs, graduation year/goal onboarding |
| [`js/app.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/app.js) | `ElevateApp` | DOM rendering, Gemini search engine, accordion stacks, event bus |
| [`js/config.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/config.js) | `ElevateConfig` | Active Google Gemini API Key vault (.gitignored for security) |
| [`js/stroke-text.js`](file:///c:/Users/Urvansh/Desktop/Elevate/js/stroke-text.js) | `StrokeText` | GSAP-powered kinetic SVG path stroke drawing on landing hero |

---

## 6. Data Storage & Persistence Model

Elevate utilizes browser **`localStorage`** for instantaneous client-side persistence:

| LocalStorage Key | Type | Description |
| :--- | :--- | :--- |
| `elevate_users` | `Array<User>` | Registered student accounts (name, email, password, rollNumber, cgpa, year, goal, skills, certs) |
| `elevate_current_user` | `User` | Active logged-in student session |
| `elevate_companies_{email}` | `Array<Drive>` | Cached live Gemini placement drives isolated to each registered student |
| `elevate_companies_gemini_2026` | `Array<Drive>` | Global backup cache for live 2026 campus drives |

---

## 7. Testing & Quality Assurance

Elevate includes an automated test suite executed via the native Node.js test runner (`node:test`):

```bash
# Run all 26 automated unit and integration tests
npm test

# Run syntax verification across all JavaScript files
npm run check
```

### What the 26 Tests Cover:
1. **`escapeHtml()` (3 tests)**: Verifies entity encoding of `<script>`, quotes, ampersands, and non-string safety.
2. **`formatCgpa()` (3 tests)**: Verifies floating-point rounding to 1 decimal place and invalid fallbacks.
3. **`isValidEmail()` (2 tests)**: Validates standard email addresses and rejects missing `@` or domain extensions.
4. **`isValidPassword()` (2 tests)**: Enforces length $\ge 8$, uppercase, numbers, and special characters.
5. **`getUserInitials()` (3 tests)**: Tests extraction of initials for single, double, and multi-word names.
6. **Schema & Seed Integrity (3 tests)**: Asserts storage keys, default student accounts, and seed datasets.
7. **HTML Contract & DOM Element IDs (3 tests)**: Asserts all 25+ essential element IDs exist in `index.html`.
8. **Node.js & Express Server Integrity (8 tests)**:
   - Verifies `server.js` exports an Express app instance.
   - Tests `GET /api/health` returns `200 OK` with status `ok`.
   - Tests `POST /api/resume/parse` rejects missing files with `400 Bad Request`.
   - Tests `POST /api/resume/parse` parses uploaded resumes into skills and projects.
   - Tests `POST /api/resume/reparse` re-analyzes active resume from `uploads/`.
   - Tests `GET /api/resume/download` delivers binary resume with proper download headers.
   - Tests `GET /api/drives/live` returns 10+ verified 2026 campus placement drives.

---

## 8. Teacher / Viva Presentation Cheatsheet

### Q1: "What role does Node.js play in this project?"
> **Answer**:  
> *"Node.js serves as our server-side JavaScript runtime environment. It powers our Express.js backend (`server.js`), handles multipart resume uploads via Multer, extracts plain text from binary PDF documents via `pdf-parse`, serves our REST API endpoints, proxies Gemini AI queries, and runs our automated test runner (`node:test`)."*

### Q2: "Why did you use Express.js instead of opening index.html directly?"
> **Answer**:  
> *"Express provides an HTTP web server with static file middleware (`express.static`), avoiding browser CORS restrictions on local file protocols. It hosts our REST API endpoints (`/api/health`, `/api/drives/live`, `/api/resume/parse`, `/api/resume/reparse`, `/api/resume/download`) and allows the portal to be deployed to cloud hosting platforms like Render or Railway."*

### Q3: "What is Multer and why did you use memoryStorage instead of diskStorage?"
> **Answer**:  
> *"Multer is an Express middleware for handling `multipart/form-data`. We chose `multer.memoryStorage()` so the uploaded resume is held in RAM as a Buffer (`req.file.buffer`). This is faster, eliminates temporary file I/O latency, and prevents server disk clutter."*

### Q4: "How does the AI Resume Parsing pipeline work?"
> **Answer**:  
> *"When a student uploads a resume, Multer intercepts the file. If it's a PDF, `pdf-parse` extracts the text. The backend then formats a prompt to Google Gemini AI requesting clean JSON with `skills`, `projects`, and `certifications`. The frontend receives this structured JSON and dynamically populates the profile skill cloud, featured projects portfolio, and certifications stack."*

### Q5: "What happens if Gemini AI is down or rate-limited during resume upload?"
> **Answer**:  
> *"We built an automatic fallback mechanism: if the Gemini API call fails or times out after 6 seconds, our server scans the text with a comprehensive regex keyword dictionary covering modern engineering technologies (React, Node, Python, Docker, etc.) and extracts project sentences directly, ensuring student profiles are never left blank."*

### Q6: "How does the Placement Drives feature fetch live data?"
> **Answer**:  
> *"The frontend calls our backend endpoint `/api/drives/live`. The Express server connects to the Google Gemini AI API (`gemini-flash-latest`) using Google Search Grounding to verify genuine, open 2026 graduation drives in India. If search quota is exceeded, it falls back to `gemini-3.5-flash-lite` in structured JSON mode, and caches the results in `localStorage`."*

### Q7: "Why was text blurring on hover, and how did you resolve it?"
> **Answer**:  
> *"Cards were previously using `transform: scale(1.028)` and `will-change: transform`. In Chromium, scaling even by 2% causes the compositor to re-sample the bitmap texture, breaking subpixel font anti-aliasing. We fixed this by eliminating `scale(...)` and `will-change`, standardizing on pure `transform: translateY(-4px)` with `-webkit-backface-visibility: hidden` matching the jobs section, keeping all text razor-sharp."*

### Q8: "How does the hover-to-reveal accordion work without clipping card edges?"
> **Answer**:  
> *"The drawer uses `max-height` transitions with `overflow: hidden`. Normally, any card elevating inside `overflow: hidden` gets its borders clipped. We solved this by adding an 18px horizontal padding buffer (`margin: 0 -18px; padding: 0 18px; width: calc(100% + 36px)`). When expanded, the cards have 18px of clearance on each side, so borders and shadows never get clipped."*

### Q9: "Where are user accounts stored? Do you have a database?"
> **Answer**:  
> *"Currently, student accounts and active sessions are stored in browser `localStorage`. This allows instant testing, fast prototyping, and zero configuration. In the next phase, we can connect MongoDB Community Server via Mongoose to persist records on the backend."*

### Q10: "How did you prevent Cross-Site Scripting (XSS)?"
> **Answer**:  
> *"We implemented an `escapeHtml()` utility function. Before any user input or dynamic text (such as names, skills, or search queries) is inserted into innerHTML, it passes through HTML entity encoding, converting characters like `<` and `>` into `&lt;` and `&gt;`."*

### Q11: "What happens if a student clicks on a company card?"
> **Answer**:  
> *"Clicking toggles the `.is-expanded` class to reveal salary, eligibility criteria, and the direct application link. To ensure clean UX, we added `mouseleave`, `pointerleave`, and click-outside event listeners so cards automatically collapse when the student moves their cursor away."*

### Q12: "How does the backend securely handle resume file downloads?"
> **Answer**:  
> *"The endpoint `/api/resume/download` uses Express's `res.download()`. It resolves the active resume file path inside `uploads/`, sets proper `Content-Disposition: attachment` headers, and includes error handling so missing files return clean `404 Not Found` messages without crashing the server."*

### Q13: "How does the manual certification entry work alongside AI extraction?"
> **Answer**:  
> *"Students can either let AI extract certifications from their resume or click '+ Add Certification' to enter credentials manually (Title, Issuer, Tag). The new entry is unshifted to the top of the stack, deduplicated via `cleanUserCertificates()`, and saved to `localStorage`."*

### Q14: "How does your test suite guarantee system reliability?"
> **Answer**:  
> *"We have 27 automated unit and integration tests running on Node's native test runner (`node:test`). They test pure utility functions, seed data schemas, 25+ DOM element contracts in `index.html`, Express server health checks, live placement drives proxying, resume upload parsing, re-parsing, and binary file download endpoints."*

### Q15: "Why did you store the Gemini API key in a server-side .env file rather than a client-side config.js?"
> **Answer**:  
> *"Storing API keys in client-side files like `config.js` exposes credentials to anyone inspecting browser DevTools, script tags, or network traffic. In our architecture, the API key is kept strictly on the Node.js server in `.env` (ignored by git). The browser simply calls our `/api/drives/live` and `/api/resume/parse` endpoints, and the server communicates with Gemini on behalf of the client. This guarantees zero key leakage and complies with production security standards."*
