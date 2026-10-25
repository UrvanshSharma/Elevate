# Elevate — Student Career & Placement Portal

> A unified student placement-readiness ecosystem with portfolio management, AI resume parsing, verified credentials, peer interview logs, study resource packs, and AI-powered campus drive tracking built with **Node.js, Express.js, MongoDB (Mongoose), JWT Authentication, HTML5, CSS3, Vanilla JavaScript, and Google Gemini AI**.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture & Directory Structure](#architecture--directory-structure)
- [Prerequisites](#prerequisites)
- [Getting Started & Running Locally](#getting-started--running-locally)
- [REST API Endpoints](#rest-api-endpoints)
- [Google Gemini AI Live Search & Resume Extraction](#google-gemini-ai-live-search--resume-extraction)
- [Database Architecture (MongoDB & Mongoose)](#database-architecture-mongodb--mongoose)
- [Interactive UI & Design Systems](#interactive-ui--design-systems)
- [Automated Testing](#automated-testing)
- [Default Demo Credentials](#default-demo-credentials)
- [Environment Variables & Security](#environment-variables--security)
- [License](#license)

---

## Overview

**Elevate** is a centralized web ecosystem designed to help university engineering students (specifically the **2026 graduating batch**) organize and accelerate their campus placement journey from a single, responsive dashboard. It solves the fragmentation of placement preparation by bringing together:

1. **Student Placement Profile**: Displays student name, roll number, department, CGPA, graduation year (`<Branch> | Graduating <Year>`), personalized career goals, and a dynamic technical skills cloud.
2. **Resume & Asset Management**: Versioning and tracking of role-specific resumes (SDE, Full-Stack, Frontend) with AI-powered resume extraction and instant PDF download.
3. **Interactive Certifications Stack**: Displays the top credential on front with a subtle `+N, Hover to reveal ↓` drawer that expands smoothly on hover/tap without blurring or edge clipping.
4. **Featured Project Portfolio**: Live showcase of practical software projects with tech stack badges, status indicators, and automatic resume extraction.
5. **Peer Interview Hub**: Crowdsourced logs of real technical interview rounds, company difficulty ratings, and key preparation takeaways.
6. **Curated Learning Resources**: Fast-track revision packs covering Data Structures & Algorithms, REST APIs, and Campus Aptitude.
7. **Live Campus Placement Drives**: Verified hiring drives fetched dynamically via the **Google Gemini AI API** specifically for 2026 batch candidates with direct application links.
8. **JWT & Bcrypt Authentication**: Secure user registration, password hashing with bcrypt, and token-based session management stored in MongoDB.
9. **Node.js & Express.js Backend**: Robust server delivering static assets, resume file extraction, re-parsing, and system health REST endpoints.

---

## Key Features

- **Node.js & Express.js Backend**: Lightweight HTTP server (`server.js`) delivering static files, health checks, multipart file uploads, and resume re-parsing on port 3000.
- **MongoDB Database Storage**: Real persistence using Mongoose ODM for student profiles, hashed passwords, technical skills, and binary resume documents.
- **JWT Authentication & Bcrypt Security**: Industry-standard password hashing (10 salt rounds) and signed JSON Web Tokens for secure session persistence.
- **AI-Powered Resume Parsing**: Uses `multer` and `pdf-parse` to extract text from resumes, sending it to **Google Gemini AI** to extract technical skills for the profile and projects for the portfolio.
- **One-Click AI Re-Analysis**: Re-scans active resumes directly from MongoDB or the `uploads/` directory with a single click, refreshing skills, projects, and certifications without re-uploading.
- **Instant Resume Download**: Securely downloads the active student resume PDF (`/api/resume/download`) with proper `Content-Disposition` headers.
- **Interactive Accordion Drawer for Certifications**: Shows the top-most certification on front with a subtle indicator (`+3, Hover to reveal ↓`); expands smoothly downwards on hover or tap to reveal all verified credentials.
- **Razor-Sharp Hover Elevations (Zero Blur)**: Uses pure `transform: translateY(-4px)` with subpixel anti-aliasing matching the jobs section, completely eliminating text blur and edge clipping.
- **Live Gemini AI Grounding**: Two-tier placement search engine using `gemini-flash-latest` with Google Search Grounding and rapid JSON fallback.
- **Custom Branding**: Integrated custom brand logo (`css/logo.png`) and SVG icons across the navigation bar, footer, and browser favicon.
- **Full Test Coverage**: 39 automated test cases powered by Node.js native test runner (`node:test`) verifying schema integrity, validation logic, DOM contracts, and Express server routes.

---

## Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v18+) | Server-side JavaScript runtime for hosting, testing, and dev tooling |
| **Web Server** | Express.js (^5.3.0) | Minimalist web framework delivering static files and REST API routes |
| **Database** | MongoDB & Mongoose (^9.11.4) | NoSQL document database storing student profiles and binary resumes |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`) & `bcryptjs` | Password encryption and stateless token authorization |
| **File Uploads** | Multer (^2.5.0) | Memory-buffered multipart form data handling for resume documents |
| **Document Parser** | pdf-parse (1.1.1) | Fast extraction of text from binary PDF resume buffers |
| **Markup** | HTML5 | Semantic HTML (`<header>`, `<aside>`, `<main>`, `<section>`) with ARIA accessibility |
| **Styling** | Vanilla CSS3 & Bootstrap 5.3 CDN | Custom design tokens, glassmorphism, responsive grid, zero hover blur |
| **Logic** | Vanilla JavaScript (ES6+) | Modular architecture with safe browser globals & CommonJS support |
| **AI Integration** | Google Gemini AI API | Generative AI models (`gemini-flash-latest` & `gemini-3.5-flash-lite`) |
| **Persistence** | MongoDB + Browser `localStorage` | Persists user accounts, sessions, skills, projects, and live drive caches |
| **Testing** | Node.js Test Runner (`node:test`) | Zero-dependency automated unit and integration tests (39 passing tests) |
| **Typography** | Google Fonts | Inter (`400`, `500`, `600`, `700`, `800`) |

---

## Architecture & Directory Structure

```
Elevate/
├── server.js                # Express.js backend server (Auth, Resumes, Drives Proxy, Health)
├── db.js                    # MongoDB Mongoose connection manager & seed script
├── package.json             # Dependencies (express, mongoose, bcryptjs, jwt, multer) and scripts
├── .env                     # Local environment variables (PORT, GEMINI_API_KEY, MONGODB_URI)
├── .env.example             # Clean template for environment configuration
├── .gitignore               # Ignored files (node_modules, uploads, .env)
├── README.md                # Project documentation and developer instructions
├── index.html               # Main application shell with Landing & Dashboard views
├── models/
│   ├── User.js              # Mongoose User Schema (Profile, CGPA, Skills, Password Hash)
│   ├── Resume.js            # Mongoose Resume Schema (Binary PDF Buffer, Extracted JSON)
│   └── index.js             # Model exports
├── middleware/
│   └── auth.js              # JWT verification middleware & Role-Based Access Control
├── css/
│   ├── logo.png             # Elevate official brand logo & browser favicon
│   ├── styles.css           # Design tokens, editorial theme, cards, navigation, animations
│   └── stroke-text.css      # StrokeText SVG glyph animation styling
├── js/
│   ├── data.js              # ElevateData: Seed datasets, default profiles, storage keys
│   ├── utils.js             # ElevateUtils: Pure functions (XSS escaping, CGPA format, regex)
│   ├── stroke-text.js       # StrokeText: Dynamic SVG stroke drawing & GSAP fill reveals
│   ├── auth.js              # ElevateAuth: Authentication handling & session state
│   └── app.js               # ElevateApp: View switcher, live drives sync, DOM rendering
├── uploads/
│   └── Urvansh.pdf          # Active student resume for re-analysis & instant download
└── tests/
    └── app.test.js          # Automated test suite (39 unit, DOM, server & DB tests)
```

---

## Prerequisites

Before running the project locally, ensure you have:
- **[Node.js](https://nodejs.org/)** (v18.0.0 or higher) and **npm** installed.
- A modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari).
- *(Optional)* A **MongoDB** local instance or MongoDB Atlas connection string.
- *(Optional)* A **Google Gemini API Key** for real-time live placement drive search and resume parsing.

---

## Getting Started & Running Locally

### Step 1: Open Terminal & Navigate to Project Directory
```bash
# Clone the repository (if not already done)
git clone https://github.com/UrvanshSharma/Elevate.git

# Navigate into the project folder
cd Elevate
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
Copy the example environment template and configure your keys:
```bash
cp .env.example .env
```
Edit `.env`:
```env
PORT=3000
MONGODB_URI="mongodb://127.0.0.1:27017/elevate"
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
JWT_SECRET="elevate_jwt_secret_2026_super_secure_key"
```

### Step 4: Launch the Server
```bash
npm start
# or for auto-reloading development:
npm run dev
```

The server will output:
```text
Connected to MongoDB database (elevate)
Seeded demo student user into MongoDB (aarav@elevate.edu)
Server is running at http://localhost:3000
```

### Step 5: Open in Your Browser
Visit [http://localhost:3000](http://localhost:3000) in your web browser.

---

## REST API Endpoints

The Express backend (`server.js`) provides the following REST API endpoints:

| Method | Endpoint | Auth | Description | Request Format | Response Format |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | Serves the main `index.html` application shell | None | `text/html` |
| `GET` | `/api/health` | Public | Server health check and diagnostics | None | `{"status":"ok","message":"..."}` |
| `POST` | `/api/auth/register` | Public | Register student, hash password, optional resume upload | Multipart / JSON | `{"status":"ok","token":"...","user":{...}}` |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials & issue JWT token | JSON `{email, password}` | `{"status":"ok","token":"...","user":{...}}` |
| `GET` | `/api/auth/me` | JWT | Get authenticated student profile from MongoDB | None (Bearer header) | `{"status":"ok","user":{...}}` |
| `PUT` | `/api/auth/profile` | JWT | Update student profile, skills, and projects | JSON `{name, cgpa, skills, ...}` | `{"status":"ok","user":{...}}` |
| `GET` | `/api/users` | Admin/Recruiter | List all registered students (Role-Based Access) | None (Bearer header) | `{"status":"ok","count":N,"users":[...]}` |
| `GET` | `/api/drives/live` | Public | Live 2026 Campus Placement Drives (proxies Gemini AI) | None | `{"status":"ok","source":"gemini","drives":[...]}` |
| `POST` | `/api/resume/parse` | Optional JWT | Upload resume & extract skills, projects & certifications | Multipart form (`resume`) | `{"status":"ok","filename":"...","skills":[...],...}` |
| `POST` | `/api/resume/reparse` | Optional JWT | Re-analyze active resume saved in DB or `uploads/` | JSON `{filename}` | `{"status":"ok","filename":"...","skills":[...],...}` |
| `GET` | `/api/resume/download` | Optional JWT | Stream and download active student resume PDF | Query `?filename=...` | Binary PDF (`Content-Disposition: attachment`) |

---

## Google Gemini AI Live Search & Resume Extraction

Elevate leverages Google Gemini AI across two core capabilities:

1. **Live 2026 Campus Placement Drives**:
   - Queries `gemini-flash-latest` with real-time Google Search Grounding to verify genuine, currently active 2026 batch hiring drives across India.
   - Enforces genuine deadlines, stipend/salary packages, tech stack requirements, and direct application links.
   - Automatically updates the **Placement Drives & Eligibility** section with a live status badge (`LIVE (Gemini AI • HH:MM)`).
   - Falls back gracefully to `gemini-3.5-flash-lite` in structured JSON mode if search quota is exceeded.

2. **Resume Understanding & Portfolio Generation**:
   - Extracts clean text from uploaded PDF/DOCX/TXT resumes using `pdf-parse`.
   - Formulates a structured schema prompt requesting `{ skills: [], projects: [], certifications: [] }`.
   - Automatically populates the student profile's skill cloud, featured project portfolio, and verified credentials stack.
   - Includes a robust regex keyword parser fallback to guarantee student profiles are never left empty even during network outages.

---

## Database Architecture (MongoDB & Mongoose)

- **`User` Collection**: Stores student account details, bcrypt-hashed passwords, academic details (roll number, branch, 2026 graduation year, CGPA), career goals, technical skills arrays, featured projects, certifications, and active resume references.
- **`Resume` Collection**: Stores the raw binary file data (`Buffer`) directly in MongoDB alongside plain text extractions, skills, and projects.
- **Auto-Seeding**: Seeds the default student account (`aarav@elevate.edu`) automatically on first startup.

---

## Interactive UI & Design Systems

- **Interactive Certifications Stack**: Displays only the primary credential on front with a subtle `+3, Hover to reveal ↓` indicator; on hover or tap, an accordion drawer expands downwards revealing all remaining verified credentials.
- **Anti-Blur Technology**: Unlike standard UI scaling that introduces rasterization blur, Elevate uses clean `transform: translateY(-4px)` with `-webkit-backface-visibility: hidden` and `cubic-bezier(0.16, 1, 0.3, 1)` transitions, keeping all text, badges, and borders razor-sharp.
- **Edge-Clearance Architecture**: The expanded drawer uses an 18px horizontal padding buffer (`margin: 0 -18px; padding: 8px 18px; width: calc(100% + 36px)`) so elevated cards never clip on the left or right edges.
- **Placement Opportunity Bricks**: Feature rich company initials, package badges, and eligibility requirements with automatic closing on `mouseleave` or outside click.

---

## Automated Testing

Elevate includes an automated test suite executed via the Node.js native test runner (`node:test`):

```bash
# Run all 39 automated unit, server, and database tests
npm test

# Run syntax verification across all JavaScript files
npm run check
```

### Test Coverage (39 Passing Tests Across 12 Suites):
- **ElevateUtils Unit Tests**:
  - `escapeHtml()`: HTML entity escaping to prevent XSS.
  - `formatCgpa()`: Numerical formatting and rounding to 1 decimal place.
  - `isValidEmail()`: RFC-compliant email pattern validation.
  - `isValidPassword()`: 4-tier password complexity rules (length $\ge 8$, uppercase, digit, special character).
  - `getUserInitials()`: Extraction of initials for single, double, and multi-word names.
- **ElevateData Schema & Seed Integrity**:
  - Storage keys definition and immutability.
  - Default demo student account validation.
  - Complete seed data structure verification.
- **HTML Contract & DOM Element IDs**:
  - Verifies all 25+ essential element IDs exist in `index.html`.
  - Confirms references to stylesheets, modular scripts, and favicon.
  - Verifies physical existence of `css/styles.css`.
- **Node.js & Express.js Server Integrity**:
  - Verifies `server.js` exports a valid Express application instance.
  - Tests `GET /api/health` returns `200 OK` with status `ok`.
  - Tests `POST /api/resume/parse` rejects missing files with `400 Bad Request`.
  - Tests `POST /api/resume/parse` extracts skills and projects from uploaded documents.
  - Tests `POST /api/resume/reparse` re-analyzes active resume from `uploads/`.
  - Tests `GET /api/resume/download` delivers binary resume with proper download headers.
  - Tests `GET /api/drives/live` returns 10+ verified 2026 campus drives (proxies Gemini using server `.env`).
- **MongoDB Database & Password Security**:
  - Verifies passwords are automatically hashed with bcrypt (`$2b$10$...`) on save.
  - Confirms password comparison logic (`user.comparePassword()`).
  - Verifies `toSafeObject()` strips passwords and internal fields.
  - Validates `Resume` model binary buffer and extraction schema.
- **JWT Authentication & Authorization Middleware**:
  - Verifies JWT signing with payload (id, email, role, name) and 7-day expiration.
  - Confirms `requireAuth` rejects missing tokens with `401 Unauthorized`.
  - Confirms `requireAuth` permits valid Bearer tokens.
  - Confirms `requireRole` rejects non-admin/recruiter roles with `403 Forbidden`.
- **Authentication & User REST API Endpoints**:
  - Tests registration input validation and password complexity enforcement.
  - Tests login authentication with demo account and JWT token issuance.
  - Tests authenticated profile retrieval via `GET /api/auth/me`.
  - Tests role-based access control on `GET /api/users`.

---

## Default Demo Credentials

A pre-configured demo account is included for immediate evaluation:

| Attribute | Value |
| :--- | :--- |
| **Email** | `aarav@elevate.edu` |
| **Password** | `password123` |
| **Student Name** | Aarav Sharma |
| **Roll Number** | `2024CS101` |
| **Department** | Computer Science & Engineering |
| **Graduation Year** | 2026 |
| **CGPA** | 8.9 |
| **Career Goal** | Full-Stack Developer specializing in scalable MERN architectures |

> You can also register new accounts using the **Sign In / Register** modal; all new accounts persist in MongoDB and trigger live Gemini placement searches.

---

## Environment Variables & Security

- **Server Environment & Secrets**: API keys and database credentials are maintained strictly on the server in `.env`, which is ignored by `.gitignore` to prevent secret leaks. A clean template is provided in `.env.example`.
- **Password Security**: Passwords are encrypted with `bcrypt` (10 salt rounds) before touching the database.
- **Cross-Site Scripting (XSS) Mitigation**: All user-supplied inputs and dynamically rendered text strings pass through `ElevateUtils.escapeHtml()` prior to insertion into the DOM.
- **Safe File Uploads**: Multer memory storage handles resume parsing in RAM, preventing unmonitored disk clutter, while verified active resumes are stored safely in MongoDB and `uploads/` with sanitized filenames.
- **Cache-Control & Security Headers**: Express server provides clean no-cache headers for dynamic assets during development.

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.
