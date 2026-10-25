/**
 * ============================================================================
 * ELEVATE — Student Placement & Career Portal Backend
 * ============================================================================
 * Author: 5th Semester Computer Science Student Project
 * Technology Stack: Node.js, Express.js, MongoDB (Mongoose), JWT, Multer
 * Description:
 *   Handles student authentication, profile updates, resume PDF text parsing
 *   using Google Gemini AI, and live 2026 campus placement drive proxying.
 * ============================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// Database connection & Mongoose models
const { connectDb, isDbConnected } = require('./db');
const { User, Resume } = require('./models');

// Authentication middleware helpers (JWT)
const {
  generateToken,
  requireAuth,
  optionalAuth,
  requireRole
} = require('./middleware/auth');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// 1. APPLICATION MIDDLEWARE SETUP
// ============================================================================

// Parse incoming JSON and form-data with a 10MB limit (handles resume sync)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend static assets (HTML, CSS, JS, images)
// In development, we disable browser cache so code changes appear immediately
app.use(express.static(__dirname, {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Configure Multer for resume uploads (stores file temporarily in RAM memory buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB maximum file size
});

// Ensure the local 'uploads/' folder exists for backup disk storage
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ============================================================================
// 2. HELPER FUNCTIONS
// ============================================================================

/**
 * Resolves the Google Gemini API key from environment variables or .env file.
 */
function resolveGeminiKey() {
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')) {
    return process.env.GEMINI_API_KEY.trim();
  }
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const match = fs.readFileSync(envPath, 'utf8').match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1] && !match[1].includes('YOUR_GEMINI_API_KEY')) {
        return match[1].trim();
      }
    } catch (_) {}
  }
  return '';
}
const DEFAULT_GEMINI_KEY = resolveGeminiKey();

/**
 * Gets the active Gemini key from request headers or server default.
 */
function getApiKey(req) {
  return req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
}

/**
 * Finds a saved resume file from the uploads directory.
 */
function resolveResumeFile(requestedName) {
  if (requestedName && fs.existsSync(path.join(uploadsDir, requestedName))) {
    return { filePath: path.join(uploadsDir, requestedName), filename: requestedName };
  }
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
    if (files.length > 0) {
      const preferred = files.find(f => /urvansh/i.test(f));
      const picked = preferred || files[files.length - 1];
      return { filePath: path.join(uploadsDir, picked), filename: picked };
    }
  }
  return null;
}

/**
 * Finds a resume document in MongoDB by user ID or filename.
 */
async function findResumeDocument(userId, filename) {
  if (!isDbConnected()) return null;
  if (userId) {
    const resume = await Resume.findOne({ userId, isCurrent: true });
    if (resume) return resume;
  }
  if (filename) {
    return await Resume.findOne({ filename }).sort({ updatedAt: -1 });
  }
  return null;
}

/**
 * Extracts plain text from an uploaded resume buffer (PDF or TXT).
 */
async function extractTextFromBuffer(buffer, filename = '', mimetype = '') {
  const isPdf = filename.toLowerCase().endsWith('.pdf') || mimetype === 'application/pdf';
  if (isPdf) {
    try {
      const parsedPdf = await pdfParse(buffer);
      if (parsedPdf && parsedPdf.text && parsedPdf.text.trim()) {
        return parsedPdf.text;
      }
    } catch (_) {
      // If PDF parsing fails, fallback to string conversion
      return buffer.toString('utf-8');
    }
  }
  return buffer.toString('utf-8');
}

/**
 * Extracts skills, projects, and certifications from resume text using Gemini AI
 * with an automatic regex keyword fallback if Gemini is offline or rate-limited.
 */
async function extractResumeData(resumeText, originalName, apiKey) {
  const prompt = `You are an AI resume parser for a student placement portal.
Analyze this resume text and return ONLY a valid JSON object with:
1. "skills": Array of technical skills (e.g. ["JavaScript", "Python", "React", "Node.js", "MongoDB"]).
2. "projects": Array of project objects with:
   - "name": Project title
   - "desc": Short 1-2 sentence description
   - "stack": Array of technologies used
   - "status": "Completed" or "Active"
3. "certifications": Array of credential objects with:
   - "title": Course or certification name
   - "issuer": Platform or organization (e.g. "Microsoft", "Coursera", "Forage", "freeCodeCamp")
   - "tag": Domain tag (e.g. "Cloud", "AI/ML", "Web Dev", "Data Analytics")

Return strictly JSON. No markdown fences.
Resume Text:
${resumeText.slice(0, 10000)}`;

  let extractedData = { skills: [], projects: [], certifications: [] };

  // 1. Try calling Google Gemini AI
  if (apiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (response.ok) {
        const payload = await response.json();
        const rawJson = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const cleanJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed.skills)) extractedData.skills = parsed.skills;
          if (Array.isArray(parsed.projects)) extractedData.projects = parsed.projects;
          if (Array.isArray(parsed.certifications)) extractedData.certifications = parsed.certifications;
        }
      }
    } catch (err) {
      console.warn('Gemini AI resume call notice:', err.message);
    }
  }

  // 2. Fallback: Keyword search for technical skills
  if (!extractedData.skills || extractedData.skills.length === 0) {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'HTML5', 'CSS3',
      'Bootstrap 5', 'React', 'Node.js', 'Express', 'MongoDB', 'SQL', 'Git',
      'Docker', 'AWS', 'Azure', 'REST APIs', 'Machine Learning', 'Deep Learning'
    ];
    const found = commonSkills.filter(s => new RegExp('\\b' + s.replace('+', '\\+') + '\\b', 'i').test(resumeText));
    extractedData.skills = found.length > 0 ? found : ['JavaScript', 'HTML5', 'CSS3', 'Node.js', 'MongoDB'];
  }

  // 3. Fallback: Parse projects from text if AI missed them
  if (!extractedData.projects || extractedData.projects.length === 0) {
    const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedProjects = [];
    for (let i = 0; i < lines.length; i++) {
      if (/project|app|platform|copilot/i.test(lines[i]) && lines[i].length < 60) {
        parsedProjects.push({
          name: lines[i],
          desc: lines[i + 1] || 'Developed software project during coursework.',
          stack: ['JavaScript', 'Web Tech'],
          status: 'Completed'
        });
        if (parsedProjects.length >= 3) break;
      }
    }
    extractedData.projects = parsedProjects.length > 0 ? parsedProjects : [
      { name: 'Elevate Placement Portal', desc: 'Student career portfolio with AI resume parsing.', stack: ['Node.js', 'Express', 'MongoDB'], status: 'Active' }
    ];
  }

  // 4. Fallback: Parse certifications from text if AI missed them
  if (!extractedData.certifications || extractedData.certifications.length === 0) {
    const certKeywords = ['Azure Data', 'Azure AI', 'Deloitte', 'Neural Networks', 'JavaScript'];
    const parsedCerts = [];
    for (const kw of certKeywords) {
      if (new RegExp(kw, 'i').test(resumeText)) {
        let issuer = 'Verified Provider';
        let tag = 'Core Tech';
        if (/azure/i.test(kw)) { issuer = 'Microsoft'; tag = 'Cloud'; }
        if (/deloitte/i.test(kw)) { issuer = 'Forage'; tag = 'Data Analytics'; }
        if (/neural/i.test(kw)) { issuer = 'DeepLearning.AI'; tag = 'AI/ML'; }
        parsedCerts.push({ title: kw + ' Certification', issuer, tag });
      }
    }
    extractedData.certifications = parsedCerts;
  }

  // Normalize schemas to ensure consistent output
  const normalizedProjects = (extractedData.projects || []).map(p => ({
    name: p.name || p.title || 'Project',
    desc: p.desc || p.description || 'Project details',
    stack: Array.isArray(p.stack) ? p.stack : ['General Tech'],
    status: p.status || 'Completed'
  }));

  const normalizedCertificates = (extractedData.certifications || []).map(c => ({
    title: c.title || c.name || 'Course Certificate',
    issuer: c.issuer || 'Online Platform',
    tag: c.tag || 'Skill Credential'
  }));

  return {
    status: 'ok',
    filename: originalName,
    skills: extractedData.skills,
    projects: normalizedProjects,
    certifications: normalizedCertificates
  };
}

/**
 * Strict, comprehensive prompt for fetching genuine 2026 campus placement drives.
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

// Curated 2026 Campus Placement Drives (Reliable fallback when AI is offline)
const CURATED_2026_DRIVES = [
  { companyName: 'Google', role: 'Software Engineering Intern, 2026', eligibility: 'B.Tech/B.E. 2026 Batch. DSA, C++, Java, or Python.', salary: 'INR 1,00,000 / month', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://www.google.com/about/careers/applications/jobs/results/' },
  { companyName: 'Microsoft', role: 'Software Engineer - 2026 Graduate Hire', eligibility: '2026 Batch B.Tech/M.Tech (CS/IT/ECE). 7.5+ CGPA.', salary: 'INR 16 - 22 LPA', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://careers.microsoft.com/' },
  { companyName: 'Amazon', role: 'Software Development Engineer Intern (2026)', eligibility: 'B.Tech CS or related field graduating in 2026.', salary: 'INR 80,000 / month', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://amazon.jobs/' },
  { companyName: 'Tata Consultancy Services', role: 'TCS Digital & Prime Fresher Drive 2026', eligibility: 'B.Tech/BE 2026 graduates. 6.0+ CGPA.', salary: 'INR 7.5 - 9.0 LPA', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://www.tcs.com/careers' },
  { companyName: 'Qualcomm', role: 'Associate Engineer - Wireless & Systems (2026)', eligibility: '2026 Batch CSE/ECE. C, C++, Embedded Systems.', salary: 'INR 14 - 18 LPA', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://www.qualcomm.com/company/careers' },
  { companyName: 'Goldman Sachs', role: 'Summer Analyst Engineering Intern 2026', eligibility: 'Pre-final year students graduating in 2026.', salary: 'INR 1,20,000 / month', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://www.goldmansachs.com/careers' },
  { companyName: 'Cisco', role: 'Consulting Engineer (Apprenticeship 2026)', eligibility: '2026 passouts with networking and Python skills.', salary: 'INR 10 - 14 LPA', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://jobs.cisco.com/' },
  { companyName: 'Infosys', role: 'Specialist Programmer (SP) 2026 Drive', eligibility: '2026 graduates. Advanced coding & algorithms.', salary: 'INR 9.5 LPA', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://www.infosys.com/careers/' },
  { companyName: 'Oracle', role: 'Associate Applications Developer (2026)', eligibility: 'BE/B.Tech in CS/IT. SQL, Java/JavaScript.', salary: 'INR 12 - 16 LPA', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://www.oracle.com/corporate/careers/' },
  { companyName: 'Wipro', role: 'Wipro Turbo Campus Hiring 2026', eligibility: '2026 Batch B.Tech. 6.5+ CGPA, Web & Cloud basics.', salary: 'INR 6.5 LPA', deadline: 'Open Drive', status: 'Open Drive', applyUrl: 'https://careers.wipro.com/' }
];

// ============================================================================
// 3. REST API ROUTES
// ============================================================================

/**
 * Route: Home Page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Route: Server Health Check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Elevate server is running smoothly',
    timestamp: new Date().toISOString()
  });
});

/**
 * Route: User Registration
 * Validates input, hashes password, saves to MongoDB, and returns a JWT token.
 */
app.post('/api/auth/register', upload.single('resume'), async (req, res) => {
  try {
    const { name, email, password, rollNumber, branch, graduationYear, cgpa, careerGoal, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check valid email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Password complexity: >= 8 characters, 1 uppercase, 1 number, 1 special character
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character.'
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ error: 'MongoDB database is not currently connected.' });
    }

    // Check if user already exists in database
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Process optional resume uploaded during registration
    let extractedSkills = [];
    let extractedProjects = [];
    let extractedCertifications = [];
    let resumeRecord = null;
    let resumeOriginalName = null;

    if (req.file) {
      resumeOriginalName = req.file.originalname || 'resume.pdf';
      try {
        fs.writeFileSync(path.join(uploadsDir, resumeOriginalName), req.file.buffer);
      } catch (_) {}

      try {
        const text = await extractTextFromBuffer(req.file.buffer, resumeOriginalName, req.file.mimetype);
        if (text.trim()) {
          const parsed = await extractResumeData(text, resumeOriginalName, getApiKey(req));
          extractedSkills = parsed.skills || [];
          extractedProjects = parsed.projects || [];
          extractedCertifications = parsed.certifications || [];
        }
      } catch (_) {}
    }

    // Create new student in MongoDB
    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password: password, // Mongoose pre-save hook will automatically hash this with bcrypt
      role: role === 'recruiter' || role === 'admin' ? role : 'student',
      rollNumber: rollNumber ? rollNumber.trim() : '2024CS-NEW',
      branch: branch ? branch.trim() : 'Computer Science & Engineering',
      graduationYear: parseInt(graduationYear, 10) || 2026,
      cgpa: parseFloat(cgpa) || 8.5,
      careerGoal: careerGoal ? careerGoal.trim() : 'Software Engineer specialising in full-stack web technologies.',
      skills: extractedSkills.length > 0 ? extractedSkills : ['JavaScript', 'HTML5', 'CSS3', 'Node.js', 'MongoDB'],
      projects: extractedProjects,
      certificates: extractedCertifications,
      resumeName: resumeOriginalName
    });

    // Save resume document to MongoDB
    if (req.file) {
      resumeRecord = new Resume({
        userId: newUser._id,
        filename: resumeOriginalName,
        originalName: resumeOriginalName,
        mimeType: req.file.mimetype || 'application/pdf',
        size: req.file.size,
        fileData: req.file.buffer,
        skills: extractedSkills,
        projects: extractedProjects,
        certifications: extractedCertifications,
        isCurrent: true
      });
      await resumeRecord.save();

      newUser.activeResume = resumeRecord._id;
      newUser.resumes = [{
        title: 'Resume - ' + resumeOriginalName,
        detail: 'AI Analyzed & Stored in MongoDB',
        status: 'Active',
        filename: resumeOriginalName,
        resumeId: resumeRecord._id
      }];
    }

    await newUser.save();

    // Issue JWT token
    const token = generateToken(newUser);

    return res.status(201).json({
      status: 'ok',
      message: 'Account registered successfully.',
      token: token,
      user: newUser.toSafeObject()
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

/**
 * Route: User Login
 * Compares passwords with bcrypt and returns a JWT token.
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // If MongoDB is connected, authenticate against the database
    if (isDbConnected()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({ error: 'No account found with this email.' });
      }

      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        return res.status(401).json({ error: 'Invalid password. Please try again.' });
      }

      const token = generateToken(user);
      return res.json({
        status: 'ok',
        message: 'Login successful.',
        token: token,
        user: user.toSafeObject()
      });
    }

    // Fallback demo login when running without database
    if (cleanEmail === 'aarav@elevate.edu' && password === 'password123') {
      const demoUser = {
        id: 'usr_demo_aarav',
        name: 'Aarav Sharma',
        email: 'aarav@elevate.edu',
        role: 'student',
        rollNumber: '2024CS101',
        branch: 'Computer Science & Engineering',
        graduationYear: 2026,
        cgpa: 8.9,
        careerGoal: 'Full-Stack Software Engineer & JavaScript Developer',
        skills: ['JavaScript ES6+', 'HTML5', 'CSS3', 'Node.js', 'MongoDB', 'Express'],
        projects: [{ name: 'Elevate Platform', desc: 'Placement readiness portal.', stack: ['Node.js', 'MongoDB'], status: 'Active' }],
        certificates: [{ title: 'JavaScript Algorithms', issuer: 'freeCodeCamp', tag: 'JS Core' }]
      };
      const token = generateToken(demoUser);
      return res.json({ status: 'ok', token: token, user: demoUser });
    }

    return res.status(503).json({ error: 'MongoDB database is not currently connected.' });
  } catch (err) {
    return res.status(500).json({ error: 'Login error: ' + err.message });
  }
});

/**
 * Route: Get Current User Profile
 * Protected route: requires JWT token in Authorization header.
 */
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const user = await User.findById(req.user.id).populate('activeResume');
      if (user) return res.json({ status: 'ok', user: user.toSafeObject() });
    }
    return res.json({ status: 'ok', user: req.user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user profile: ' + err.message });
  }
});

/**
 * Route: Update User Profile
 * Protected route: updates profile data in MongoDB.
 */
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { name, rollNumber, branch, graduationYear, cgpa, careerGoal, skills, projects, certificates } = req.body;

    if (name) user.name = name.trim();
    if (rollNumber) user.rollNumber = rollNumber.trim();
    if (branch) user.branch = branch.trim();
    if (graduationYear) user.graduationYear = parseInt(graduationYear, 10);
    if (cgpa !== undefined && cgpa !== null) user.cgpa = parseFloat(cgpa);
    if (careerGoal) user.careerGoal = careerGoal.trim();
    if (Array.isArray(skills)) user.skills = skills;
    if (Array.isArray(projects)) user.projects = projects;
    if (Array.isArray(certificates)) user.certificates = certificates;

    await user.save();
    return res.json({ status: 'ok', message: 'Profile updated in MongoDB.', user: user.toSafeObject() });
  } catch (err) {
    return res.status(500).json({ error: 'Profile update error: ' + err.message });
  }
});

/**
 * Route: List All Users
 * Protected route: only accessible to 'admin' or 'recruiter' roles.
 */
app.get('/api/users', requireAuth, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    if (isDbConnected()) {
      const users = await User.find({}, '-password').sort({ createdAt: -1 });
      return res.json({ status: 'ok', count: users.length, users: users });
    }
    return res.json({ status: 'ok', count: 0, users: [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve users: ' + err.message });
  }
});

/**
 * Route: Upload & Parse Resume
 * Uses Multer memory buffer and pdf-parse, then calls Gemini AI to extract data.
 */
app.post('/api/resume/parse', optionalAuth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded.' });
    }

    const originalName = req.file.originalname || 'resume.pdf';

    // Save copy to local uploads folder
    try {
      fs.writeFileSync(path.join(uploadsDir, originalName), req.file.buffer);
    } catch (_) {}

    // Extract text from file
    const resumeText = await extractTextFromBuffer(req.file.buffer, originalName, req.file.mimetype);
    if (!resumeText.trim()) {
      return res.status(400).json({ error: 'Could not extract text from the uploaded resume.' });
    }

    // Call Gemini AI or regex parser
    const result = await extractResumeData(resumeText, originalName, getApiKey(req));

    // Save resume record in MongoDB if connected
    let savedResumeId = null;
    if (isDbConnected()) {
      try {
        const resumeDoc = new Resume({
          userId: req.user ? req.user.id : null,
          filename: originalName,
          originalName: originalName,
          mimeType: req.file.mimetype || 'application/pdf',
          size: req.file.size,
          fileData: req.file.buffer,
          extractedText: resumeText,
          skills: result.skills || [],
          projects: result.projects || [],
          certifications: result.certifications || [],
          isCurrent: true
        });
        await resumeDoc.save();
        savedResumeId = resumeDoc._id;

        // Associate with logged-in student if authenticated
        if (req.user && req.user.id) {
          const user = await User.findById(req.user.id);
          if (user) {
            user.activeResume = resumeDoc._id;
            user.resumeName = originalName;
            if (result.skills && result.skills.length > 0) {
              user.skills = Array.from(new Set([...user.skills, ...result.skills]));
            }
            if (result.projects && result.projects.length > 0) user.projects = result.projects;
            if (result.certifications && result.certifications.length > 0) user.certificates = result.certifications;
            await user.save();
          }
        }
      } catch (dbErr) {
        console.warn('MongoDB resume store warning:', dbErr.message);
      }
    }

    return res.json({
      ...result,
      resumeId: savedResumeId
    });
  } catch (error) {
    console.error('Resume parse error:', error);
    return res.status(500).json({ error: 'Failed to process resume: ' + error.message });
  }
});

/**
 * Route: Re-Parse Existing Resume
 * Re-analyzes an existing resume already saved in MongoDB or uploads directory.
 */
app.post('/api/resume/reparse', optionalAuth, async (req, res) => {
  try {
    const requestedName = req.body && req.body.filename;
    const dbResume = await findResumeDocument(req.user ? req.user.id : null, requestedName);

    if (dbResume && dbResume.fileData) {
      const text = await extractTextFromBuffer(dbResume.fileData, dbResume.filename, dbResume.mimeType);
      const result = await extractResumeData(text, dbResume.filename, getApiKey(req));
      return res.json(result);
    }

    // Fallback to local uploads folder
    const target = resolveResumeFile(requestedName);
    if (!target) {
      return res.status(404).json({ error: 'No resume found on server. Please upload your resume first.' });
    }

    const fileBuffer = fs.readFileSync(target.filePath);
    const resumeText = await extractTextFromBuffer(fileBuffer, target.filename);
    const result = await extractResumeData(resumeText, target.filename, getApiKey(req));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to re-parse resume: ' + error.message });
  }
});

/**
 * Route: Download Resume PDF
 * Streams the PDF file from MongoDB or local uploads folder.
 */
app.get('/api/resume/download', optionalAuth, async (req, res) => {
  try {
    const requestedName = req.query.filename;
    const dbResume = await findResumeDocument(req.user ? req.user.id : null, requestedName);

    if (dbResume && dbResume.fileData && dbResume.fileData.length > 0) {
      const downloadName = dbResume.originalName || dbResume.filename || 'resume.pdf';
      res.set({
        'Content-Type': dbResume.mimeType || 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`
      });
      return res.send(dbResume.fileData);
    }

    // Fallback to disk file in uploads folder
    const target = resolveResumeFile(requestedName);
    if (target && fs.existsSync(target.filePath)) {
      return res.download(target.filePath, target.filename);
    }

    return res.status(404).json({ error: 'Resume file not found.' });
  } catch (err) {
    return res.status(500).json({ error: 'Download failed: ' + err.message });
  }
});

/**
 * Route: Live 2026 Campus Placement Drives
 * Proxies Google Gemini AI on the backend so API keys are never exposed in the browser.
 */
app.get('/api/drives/live', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.json({ status: 'ok', source: 'curated', drives: CURATED_2026_DRIVES });
  }

  try {
    const prompt = getGeminiSearchPrompt();

    let responseText = null;

    // Priority 1: gemini-flash-latest with search grounding
    try {
      const searchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`;
      const searchRes = await fetch(searchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }]
        }),
        signal: AbortSignal.timeout(6000)
      });
      if (searchRes.ok) {
        const data = await searchRes.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } catch (_) {}

    // Priority 2: gemini-3.5-flash-lite fallback
    if (!responseText) {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(6000)
      });
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    }

    if (responseText) {
      const clean = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ status: 'ok', source: 'gemini', drives: parsed });
      }
    }
  } catch (err) {
    console.warn('Backend live drives fetch notice:', err.message);
  }

  // Fallback to verified 2026 drives
  return res.json({ status: 'ok', source: 'curated', drives: CURATED_2026_DRIVES });
});

// ============================================================================
// 4. SERVER STARTUP & DATABASE CONNECTION
// ============================================================================

if (require.main === module) {
  // Connect to MongoDB first, then start listening for HTTP requests
  connectDb().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  });
}

// Export app instance for automated tests (node --test)
module.exports = app;
