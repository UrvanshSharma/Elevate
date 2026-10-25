/**
 * Elevate Backend Server (Node.js & Express)
 * Provides static asset serving, health monitoring, resume PDF/text ingestion,
 * Gemini 3.5 Flash Lite parsing, MongoDB database storage for users & resumes,
 * and robust JWT authentication & role-based authorization.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// MongoDB & Auth modules
const { connectDb, isDbConnected } = require('./db');
const { User, Resume } = require('./models');
const {
  JWT_SECRET,
  generateToken,
  requireAuth,
  optionalAuth,
  requireRole
} = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve default Gemini API key dynamically from environment or .env
function resolveGeminiKey() {
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')) {
    return process.env.GEMINI_API_KEY.trim();
  }
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const match = fs.readFileSync(envPath, 'utf8').match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1] && !match[1].includes('YOUR_GEMINI_API_KEY')) return match[1].trim();
    } catch (_) {}
  }
  return '';
}
const DEFAULT_GEMINI_KEY = resolveGeminiKey();

// Configure Multer for in-memory upload buffering (10MB maximum file size)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware: parse JSON and urlencoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static workspace assets with no-cache headers in development
app.use(express.static(__dirname, {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Ensure resume uploads directory exists for disk persistence/cache
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Extracts client Gemini API key from HTTP request headers or environment.
 * @param {express.Request} req
 * @returns {string}
 */
function getApiKey(req) {
  return req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
}

/**
 * Resolves target resume file from uploads directory as fallback.
 * Prioritizes requested filename, then Urvansh.pdf, then newest available file.
 * @param {string} [requestedName]
 * @returns {{ filePath: string, filename: string } | null}
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
 * Extracts text from PDF or raw text buffer with resilient fallback.
 * @param {Buffer} buffer
 * @param {string} [filename]
 * @param {string} [mimetype]
 * @returns {Promise<string>}
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
      // Fallback to text string decoding if PDF parser encounters non-standard stream
      return buffer.toString('utf-8');
    }
  }
  return buffer.toString('utf-8');
}

/**
 * Parses resume text using Gemini 3.5 Flash Lite with resilient structural fallback.
 * @param {string} resumeText
 * @param {string} originalName
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
async function extractResumeData(resumeText, originalName, apiKey) {
  const prompt = `You are an expert AI resume parser for a student placement platform.
Analyze the following resume text and extract:
1. "skills": An array of technical skill strings (e.g. ["JavaScript", "Python", "React", "Node.js", "MongoDB", "Git"]).
2. "projects": An array of ALL project objects found in the resume. Extract every project (typically 2 to 5 projects). Each project must have:
   - "name": Real name of the project (e.g. "Layer Learn — AI Desktop Copilot", "WebEase — AI-Powered Accessibility Browser Companion", etc.). Never use generic placeholders like "Project" or "Featured Resume Project".
   - "desc": Concise 1 or 2 sentence summary of what was built, key features, and achievements.
   - "stack": Array of technologies/tools used (e.g. ["Python", "FastAPI", "React", "OpenCV"]).
   - "status": "Completed" or "Active"
3. "certifications": An array of ALL certification or credential objects found in the resume. Each certification must have:
   - "title": Exact name of the certification or course (e.g. "Azure AI Fundamentals", "Neural Networks and Deep Learning", "Azure Data Fundamentals", "Deloitte Data Analytics Job Simulation").
   - "issuer": Issuing organization/platform (e.g. "Microsoft", "Coursera", "Forage", "DeepLearning.AI", "AWS", "Google", "Udemy", "freeCodeCamp", "NPTEL").
   - "tag": Short domain tag (e.g. "Cloud", "AI/ML", "Database", "Data Analytics", "Web Dev", "DSA").

Return ONLY a valid JSON object with keys "skills", "projects", and "certifications". No markdown fences.

Resume Text:
${resumeText.slice(0, 10000)}`;

  let extractedData = { skills: [], projects: [], certifications: [] };

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
        const rawJsonText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const cleanJson = rawJsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed.skills)) extractedData.skills = parsed.skills;
          if (Array.isArray(parsed.projects)) extractedData.projects = parsed.projects;
          if (Array.isArray(parsed.certifications)) extractedData.certifications = parsed.certifications;
        }
      }
    } catch (apiErr) {
      console.warn('Gemini AI resume extraction warning:', apiErr.message);
    }
  }

  // Fallback 1: Extract technical skills via keyword dictionary
  if (!extractedData.skills || extractedData.skills.length === 0) {
    const skillDictionary = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
      'HTML5', 'CSS3', 'Bootstrap 5', 'Tailwind CSS', 'Sass', 'React', 'Next.js', 'Vue.js', 'Angular',
      'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'ASP.NET',
      'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Firebase', 'Supabase',
      'Git', 'GitHub', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Linux',
      'REST APIs', 'GraphQL', 'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'NLP', 'Computer Vision'
    ];
    const foundSkills = skillDictionary.filter(skill => {
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp('\\b' + escaped + '\\b', 'i').test(resumeText);
    });
    extractedData.skills = foundSkills.length > 0 ? foundSkills : ['JavaScript', 'HTML5', 'CSS3', 'Node.js', 'MongoDB'];
  }

  // Fallback 2: Extract projects via heuristic section parsing
  if (!extractedData.projects || extractedData.projects.length === 0) {
    const projectSectionMatch = resumeText.split(/PROJECTS\s*\n/i)[1];
    const projectSection = projectSectionMatch ? projectSectionMatch.split(/\n\s*(?:CERTIFICATIONS|EDUCATION|SKILLS|EXPERIENCE)/i)[0] : '';

    if (projectSection) {
      const rawLines = projectSection.split('\n').map(l => l.trim()).filter(Boolean);
      const mergedLines = [];
      for (const line of rawLines) {
        if ((line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) && mergedLines.length > 0 && mergedLines[mergedLines.length - 1].startsWith('•')) {
          mergedLines[mergedLines.length - 1] += ' ' + line.replace(/^[•\-\*]\s*/, '');
        } else {
          mergedLines.push(line);
        }
      }

      const parsedProjects = [];
      let current = null;

      for (const line of mergedLines) {
        const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
        const isHeader = !isBullet && (line.includes('—') || line.includes('–')) && !/^(projects?|education)$/i.test(line);

        if (isHeader) {
          if (current && current.name && current.desc) parsedProjects.push(current);
          let rawName = line.split(/[|]/)[0].trim().replace(/^.*?[\.\;]\s+/, '').trim();
          const matchedSkills = (extractedData.skills || []).filter(s =>
            new RegExp('\\b' + s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(line)
          );
          current = {
            name: rawName,
            desc: '',
            stack: matchedSkills.length > 0 ? matchedSkills : (extractedData.skills || []).slice(0, 3),
            status: /present|in progress|ongoing/i.test(line) ? 'Active' : 'Completed'
          };
        } else if (current && isBullet) {
          const bullet = line.replace(/^[•\-\*]\s*/, '').trim();
          if (bullet.length > 15) {
            if (!current.desc) current.desc = bullet;
            else if (current.desc.length < 220) current.desc += ' ' + bullet;
          }
        }
      }

      if (current && current.name && current.desc) parsedProjects.push(current);
      if (parsedProjects.length > 0) extractedData.projects = parsedProjects;
    }
  }

  // Fallback 3: Extract certifications if empty
  if (!extractedData.certifications || extractedData.certifications.length === 0) {
    const certSectionMatch = resumeText.split(/CERTIFICATIONS\s*\n/i)[1];
    const certSection = certSectionMatch ? certSectionMatch.split(/\n\s*(?:EDUCATION|PROJECTS|SKILLS)/i)[0] : '';
    if (certSection) {
      const certLines = certSection.split('\n').map(l => l.trim()).filter(Boolean);
      const parsedCerts = [];

      for (const line of certLines) {
        const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
        if (cleanLine.length > 5 && !/^(certifications?|courses?|licenses?)$/i.test(cleanLine)) {
          let issuer = 'Verified Platform';
          if (/microsoft/i.test(cleanLine)) issuer = 'Microsoft';
          else if (/coursera|deeplearning\.ai/i.test(cleanLine)) issuer = 'Coursera';
          else if (/forage|deloitte/i.test(cleanLine)) issuer = 'Forage';
          else if (/freecodecamp/i.test(cleanLine)) issuer = 'freeCodeCamp';
          else if (/udemy/i.test(cleanLine)) issuer = 'Udemy';
          else if (/aws/i.test(cleanLine)) issuer = 'AWS';
          else if (/nptel/i.test(cleanLine)) issuer = 'NPTEL';
          else if (/google/i.test(cleanLine)) issuer = 'Google';

          let tag = 'Core Tech';
          if (/cloud|azure/i.test(cleanLine)) tag = 'Cloud';
          else if (/data|analytics/i.test(cleanLine)) tag = 'Data Analytics';
          else if (/deep learning|neural|ai|machine learning/i.test(cleanLine)) tag = 'AI/ML';
          else if (/web|full stack/i.test(cleanLine)) tag = 'Web Dev';

          parsedCerts.push({
            title: cleanLine.split(/—|-/)[0].trim(),
            issuer: issuer,
            tag: tag
          });
        }
      }
      if (parsedCerts.length > 0) extractedData.certifications = parsedCerts;
    }
  }

  // Default fallback if still empty
  if (!extractedData.projects || extractedData.projects.length === 0) {
    extractedData.projects = [
      {
        name: 'Elevate Career Portal',
        desc: 'Student placement-readiness portal with portfolio management, resume tracking, and interview preparation.',
        stack: ['JavaScript', 'Express', 'MongoDB'],
        status: 'Active'
      }
    ];
  }

  // Normalize project names
  const normalizedProjects = (extractedData.projects || []).map(p => ({
    name: (p.name || 'Resume Project').replace(/^project\s*\d*\s*[-:]\s*/i, '').trim(),
    desc: p.desc || 'Technical project extracted from uploaded candidate resume.',
    stack: Array.isArray(p.stack) && p.stack.length > 0 ? p.stack : (extractedData.skills || []).slice(0, 3),
    status: p.status || 'Completed'
  }));

  const normalizedCertificates = (extractedData.certifications || []).map(c => ({
    title: c.title || 'Technical Certification',
    issuer: c.issuer || 'Verified Platform',
    tag: c.tag || 'Core Tech'
  }));

  return {
    status: 'ok',
    filename: originalName,
    skills: extractedData.skills || [],
    projects: normalizedProjects,
    certifications: normalizedCertificates
  };
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Route 1: Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route 2: Server health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Elevate server is running smoothly',
    database: isDbConnected() ? 'connected' : 'disconnected'
  });
});

// -------------------------------------------------------------
// AUTHENTICATION & USER MANAGEMENT ROUTES (MongoDB + JWT)
// -------------------------------------------------------------

/**
 * Route: POST /api/auth/register
 * Handles user registration with password hashing, optional resume upload,
 * MongoDB persistence, and JWT token issuance.
 */
app.post('/api/auth/register', upload.single('resume'), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      rollNumber,
      branch,
      graduationYear,
      cgpa,
      careerGoal,
      role
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Validate password complexity: >=8 chars, 1 uppercase, 1 digit, 1 special character
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.'
      });
    }

    // Process optional resume upload during registration
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
        const resumeText = await extractTextFromBuffer(req.file.buffer, resumeOriginalName, req.file.mimetype);
        if (resumeText.trim()) {
          const parsed = await extractResumeData(resumeText, resumeOriginalName, getApiKey(req));
          extractedSkills = parsed.skills || [];
          extractedProjects = parsed.projects || [];
          extractedCertifications = parsed.certifications || [];
        }
      } catch (parseErr) {
        console.warn('Resume parse warning during registration:', parseErr.message);
      }
    }

    // Persist user and optional resume in database
    if (!isDbConnected()) {
      return res.status(503).json({
        error: 'MongoDB database is not connected. Please ensure MongoDB is running or configure MONGODB_URI in .env.'
      });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const parsedCgpa = parseFloat(cgpa);
    const parsedYear = parseInt(graduationYear, 10);

    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password: password, // Automatically hashed with bcrypt
      role: role === 'recruiter' || role === 'admin' ? role : 'student',
      rollNumber: rollNumber ? rollNumber.trim() : '2024CS-NEW',
      branch: branch ? branch.trim() : 'Computer Science & Engineering',
      graduationYear: !isNaN(parsedYear) ? parsedYear : 2026,
      cgpa: !isNaN(parsedCgpa) ? parsedCgpa : 8.5,
      careerGoal: careerGoal ? careerGoal.trim() : 'Build a strong placement-ready profile with organized documents, visible projects, and structured interview preparation.',
      skills: extractedSkills.length > 0 ? extractedSkills : ['JavaScript', 'HTML5', 'CSS3', 'Node.js', 'MongoDB'],
      projects: extractedProjects,
      certificates: extractedCertifications,
      resumeName: resumeOriginalName
    });

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
        detail: 'AI Analyzed & Stored in Database',
        status: 'Active',
        filename: resumeOriginalName,
        resumeId: resumeRecord._id
      }];
    }

    await newUser.save();
    const token = generateToken(newUser);

    return res.status(201).json({
      status: 'ok',
      message: 'Account registered successfully in database.',
      token: token,
      user: newUser.toSafeObject()
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register account: ' + err.message });
  }
});

/**
 * Route: POST /api/auth/login
 * Validates user credentials with bcrypt comparison and returns JWT token.
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const candidatePassword = typeof password === 'string' ? password : String(password);

    if (isDbConnected()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({ error: 'No account found with this email. Please check your email or create an account.' });
      }

      const isMatch = await user.comparePassword(candidatePassword);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password. Please check Caps Lock and try again.' });
      }

      const token = generateToken(user);
      return res.json({
        status: 'ok',
        message: 'Login successful.',
        token: token,
        user: user.toSafeObject()
      });
    }

    // Fallback when MongoDB is not connected (e.g. demo mode during offline tests)
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
        skills: ['JavaScript ES6+', 'HTML5', 'CSS3', 'Bootstrap 5', 'DOM & Events', 'Async/Await', 'REST APIs', 'MongoDB', 'Node.js', 'Express'],
        projects: [{ name: 'Elevate Platform', desc: 'Student placement & portfolio portal built using Vanilla JS, Express, and MongoDB.', stack: ['HTML5', 'CSS3', 'Bootstrap 5', 'Node.js', 'MongoDB'], status: 'Active' }],
        certificates: [{ title: 'JavaScript Algorithms & Data Structures', issuer: 'freeCodeCamp', tag: 'JS Core' }]
      };
      const token = generateToken(demoUser);
      return res.json({
        status: 'ok',
        message: 'Login successful.',
        token: token,
        user: demoUser
      });
    }

    return res.status(503).json({ error: 'MongoDB database is not currently connected. Please ensure MongoDB is running or check your MONGODB_URI in .env.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

/**
 * Route: GET /api/auth/me
 * Authenticated endpoint: Returns currently logged-in user profile from database.
 */
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const user = await User.findById(req.user.id).populate('activeResume');
      if (user) {
        return res.json({ status: 'ok', user: user.toSafeObject() });
      }
    }
    return res.json({ status: 'ok', user: req.user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user: ' + err.message });
  }
});

/**
 * Route: PUT /api/auth/profile
 * Authenticated endpoint: Updates user profile, skills, projects, and credentials in database.
 */
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const {
      name,
      rollNumber,
      branch,
      graduationYear,
      cgpa,
      careerGoal,
      skills,
      projects,
      certificates
    } = req.body;

    if (name) user.name = name.trim();
    if (rollNumber) user.rollNumber = rollNumber.trim();
    if (branch) user.branch = branch.trim();
    if (graduationYear) user.graduationYear = parseInt(graduationYear, 10) || user.graduationYear;
    if (cgpa !== undefined && cgpa !== null) {
      const parsedCgpa = parseFloat(cgpa);
      if (!isNaN(parsedCgpa)) user.cgpa = parsedCgpa;
    }
    if (careerGoal) user.careerGoal = careerGoal.trim();
    if (Array.isArray(skills)) user.skills = skills;
    if (Array.isArray(projects)) user.projects = projects;
    if (Array.isArray(certificates)) user.certificates = certificates;

    await user.save();

    return res.json({
      status: 'ok',
      message: 'Profile updated in MongoDB successfully.',
      user: user.toSafeObject()
    });
  } catch (err) {
    return res.status(500).json({ error: 'Profile update failed: ' + err.message });
  }
});

/**
 * Route: GET /api/users
 * Role-Based Authorization demonstration: Requires 'admin' or 'recruiter' role.
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

// -------------------------------------------------------------
// RESUME STORAGE & PARSING ROUTES (MongoDB + Filesystem Cache)
// -------------------------------------------------------------

/**
 * Route 3: Resume upload and extraction
 * Stores resume binary file and extracted metadata in MongoDB when authenticated.
 */
app.post('/api/resume/parse', optionalAuth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded.' });
    }

    const originalName = req.file.originalname || 'resume.pdf';

    // Persist uploaded file to uploads directory for local file cache
    try {
      fs.writeFileSync(path.join(uploadsDir, originalName), req.file.buffer);
    } catch (saveErr) {
      console.warn('Could not save resume to uploads directory:', saveErr.message);
    }

    const resumeText = await extractTextFromBuffer(req.file.buffer, originalName, req.file.mimetype);
    if (!resumeText.trim()) {
      return res.status(400).json({ error: 'Could not extract text from the uploaded resume.' });
    }

    const result = await extractResumeData(resumeText, originalName, getApiKey(req));

    // Store resume in MongoDB if database is connected
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

        // If authenticated, associate resume with user profile in MongoDB
        if (req.user && req.user.id) {
          const user = await User.findById(req.user.id);
          if (user) {
            user.activeResume = resumeDoc._id;
            user.resumeName = originalName;
            if (result.skills && result.skills.length > 0) {
              const combined = Array.from(new Set([...user.skills, ...result.skills]));
              user.skills = combined;
            }
            if (result.projects && result.projects.length > 0) {
              user.projects = result.projects;
            }
            if (result.certifications && result.certifications.length > 0) {
              user.certificates = result.certifications;
            }
            user.resumes.unshift({
              title: 'Resume - ' + originalName,
              detail: 'Stored in MongoDB & Analyzed with AI',
              status: 'Active',
              filename: originalName,
              resumeId: resumeDoc._id
            });
            await user.save();
          }
        }
      } catch (dbErr) {
        console.warn('MongoDB resume storage notice:', dbErr.message);
      }
    }

    return res.json({
      ...result,
      resumeId: savedResumeId
    });
  } catch (error) {
    console.error('Resume parse error:', error);
    return res.status(500).json({ error: 'Failed to process resume.', message: error.message });
  }
});

/**
 * Route 4: Re-parse existing resume on file or MongoDB
 */
app.post('/api/resume/reparse', optionalAuth, async (req, res) => {
  try {
    const requestedName = req.body && req.body.filename;

    // Check MongoDB first if authenticated or if matching resume exists in database
    if (isDbConnected()) {
      let dbResume = null;
      if (req.user && req.user.id) {
        dbResume = await Resume.findOne({ userId: req.user.id, isCurrent: true });
      }
      if (!dbResume && requestedName) {
        dbResume = await Resume.findOne({ filename: requestedName }).sort({ updatedAt: -1 });
      }

      if (dbResume && dbResume.fileData) {
        const resumeText = await extractTextFromBuffer(dbResume.fileData, dbResume.filename, dbResume.mimeType);
        const result = await extractResumeData(resumeText, dbResume.filename, getApiKey(req));

        // Update MongoDB record
        dbResume.skills = result.skills;
        dbResume.projects = result.projects;
        dbResume.certifications = result.certifications;
        await dbResume.save();

        return res.json(result);
      }
    }

    // Fallback to disk uploads directory
    const target = resolveResumeFile(requestedName);
    if (!target) {
      return res.status(404).json({ error: 'No resume found on server. Please upload your resume first.' });
    }

    const fileBuffer = fs.readFileSync(target.filePath);
    const resumeText = await extractTextFromBuffer(fileBuffer, target.filename);
    const result = await extractResumeData(resumeText, target.filename, getApiKey(req));
    return res.json(result);
  } catch (error) {
    console.error('Resume re-parse error:', error);
    return res.status(500).json({ error: 'Failed to re-parse resume.', message: error.message });
  }
});

/**
 * Route 5: Download active resume (from MongoDB or disk)
 */
app.get('/api/resume/download', optionalAuth, async (req, res) => {
  try {
    const requestedName = req.query.filename;

    // 1. Try streaming binary resume directly from MongoDB
    if (isDbConnected()) {
      let dbResume = null;
      if (req.user && req.user.id) {
        dbResume = await Resume.findOne({ userId: req.user.id, isCurrent: true });
      }
      if (!dbResume && requestedName) {
        dbResume = await Resume.findOne({ filename: requestedName }).sort({ updatedAt: -1 });
      }

      if (dbResume && dbResume.fileData && dbResume.fileData.length > 0) {
        const downloadFilename = dbResume.originalName || dbResume.filename || 'resume.pdf';
        res.set({
          'Content-Type': dbResume.mimeType || 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFilename)}"`
        });
        return res.send(dbResume.fileData);
      }
    }

    // 2. Fallback to disk file in uploads directory
    const target = resolveResumeFile(requestedName);
    if (target && fs.existsSync(target.filePath)) {
      return res.download(target.filePath, target.filename);
    }

    return res.status(404).json({ error: 'Resume file not found.' });
  } catch (err) {
    return res.status(500).json({ error: 'Download failed: ' + err.message });
  }
});

// Curated 2026 campus drives for fallback
const CURATED_2026_DRIVES = [
  {
    companyName: 'Google',
    role: 'Software Engineering Intern, 2026',
    eligibility: 'B.Tech/B.E./M.Tech graduating in 2026. Strong foundation in DSA, Algorithms, C++, Java, or Python.',
    salary: 'INR 1,00,000 / month',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://www.google.com/about/careers/applications/jobs/results/'
  },
  {
    companyName: 'Microsoft',
    role: 'Software Engineer - 2026 Graduate Hire',
    eligibility: '2026 Batch B.Tech/M.Tech (CS/IT/ECE). 7.5+ CGPA with strong problem solving skills.',
    salary: 'INR 16 - 22 LPA',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://careers.microsoft.com/'
  },
  {
    companyName: 'Amazon',
    role: 'Software Development Engineer Intern (2026)',
    eligibility: "Bachelor's / Master's in CS or related field graduating in 2026. Proficiency in Java/C++.",
    salary: 'INR 80,000 / month',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://amazon.jobs/'
  },
  {
    companyName: 'Tata Consultancy Services',
    role: 'TCS Digital & Prime Fresher Drive 2026',
    eligibility: 'B.Tech/BE 2026 graduates. 60% or 6.0 CGPA throughout academics. Coding assessment qualified.',
    salary: 'INR 7.5 - 9.0 LPA',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://www.tcs.com/careers'
  },
  {
    companyName: 'Qualcomm',
    role: 'Associate Engineer - Wireless & Systems (2026)',
    eligibility: '2026 Batch CSE/ECE. C, C++, Embedded Systems, Operating Systems.',
    salary: 'INR 14 - 18 LPA',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://www.qualcomm.com/company/careers'
  },
  {
    companyName: 'Goldman Sachs',
    role: 'Summer Analyst Engineering Intern 2026',
    eligibility: 'Pre-final year students graduating in 2026. CS/Data Science/FinTech.',
    salary: 'INR 1,20,000 / month',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://www.goldmansachs.com/careers'
  },
  {
    companyName: 'Cisco',
    role: 'Consulting Engineer (Technical Apprenticeship 2026)',
    eligibility: '2026 passouts with networking, Python, cloud, and security fundamentals.',
    salary: 'INR 10 - 14 LPA',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://jobs.cisco.com/'
  },
  {
    companyName: 'Infosys',
    role: 'Specialist Programmer (SP) 2026 Campus Connect',
    eligibility: '2026 graduates. Advanced algorithmic coding, graph algorithms, and DP expertise.',
    salary: 'INR 9.5 LPA',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://www.infosys.com/careers/'
  },
  {
    companyName: 'Oracle',
    role: 'Associate Applications Developer (2026)',
    eligibility: 'BE/B.Tech in CS/IT graduating in 2026. Database systems, SQL, Java/JavaScript.',
    salary: 'INR 12 - 16 LPA',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://www.oracle.com/corporate/careers/'
  },
  {
    companyName: 'Wipro',
    role: 'Wipro Turbo Campus Hiring 2026',
    eligibility: '2026 Batch B.Tech all technical streams. 6.5+ CGPA, full-stack web or cloud fundamentals.',
    salary: 'INR 6.5 LPA',
    deadline: 'Open Drive',
    status: 'Open Drive',
    applyUrl: 'https://careers.wipro.com/'
  }
];

// Route 6: Live 2026 Campus Placement Drives (proxies Gemini using server-side .env)
app.get('/api/drives/live', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.json({ status: 'ok', source: 'curated', drives: CURATED_2026_DRIVES });
  }

  try {
    const prompt = `Find 10 verified, currently active campus hiring drives, graduate trainee positions, and software internships in India for 2026 graduates. Return ONLY a valid JSON array of objects with keys: "companyName", "role", "eligibility", "salary", "deadline", "status", "applyUrl". No markdown fences.`;

    let responseText = null;
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
    console.warn('Backend live drives fetch error:', err.message);
  }

  return res.json({ status: 'ok', source: 'curated', drives: CURATED_2026_DRIVES });
});

// Start listener and initialize database connection when executed directly
if (require.main === module) {
  connectDb().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
