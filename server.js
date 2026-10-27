// Elevate backend server - handles auth, resume parsing, and placement drives
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// Automatically load environment variables from .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath);
    } catch (_) {}
  }
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    });
  } catch (_) {}
}

const { connectDb, isDbConnected } = require('./db');
const { User, Resume } = require('./models');
const {
  generateToken,
  requireAuth,
  optionalAuth,
  requireRole
} = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing with 10MB limit for resumes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend static files without caching during development
app.use(express.static(__dirname, {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Temporary memory storage for resume uploads (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Local uploads directory for backup files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get active Gemini API key from header, user, body, or environment
function getApiKey(req) {
  if (req && req.headers && req.headers['x-gemini-key'] !== undefined) {
    const k = String(req.headers['x-gemini-key']).trim();
    if (k && !k.includes('YOUR_GEMINI_API_KEY')) return k;
    if (k === '' || k === 'none') return '';
  }
  if (req && req.user && req.user.geminiApiKey) {
    const k = req.user.geminiApiKey.trim();
    if (k && !k.includes('YOUR_GEMINI_API_KEY')) return k;
  }
  if (req && req.body && req.body.geminiApiKey) {
    const k = String(req.body.geminiApiKey).trim();
    if (k && !k.includes('YOUR_GEMINI_API_KEY')) return k;
  }
  if (process.env.NODE_ENV === 'test') {
    return '';
  }
  if (process.env.GEMINI_API_KEY) {
    const k = process.env.GEMINI_API_KEY.trim();
    if (k && !k.includes('YOUR_GEMINI_API_KEY')) return k;
  }
  return '';
}

// Find saved resume file on disk
function resolveResumeFile(requestedName) {
  if (requestedName && fs.existsSync(path.join(uploadsDir, requestedName))) {
    return { filePath: path.join(uploadsDir, requestedName), filename: requestedName };
  }
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
    if (files.length > 0) {
      const picked = files[files.length - 1];
      return { filePath: path.join(uploadsDir, picked), filename: picked };
    }
  }
  return null;
}

// Find resume in MongoDB by user ID or filename
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

// Extract plain text from PDF or TXT buffer
async function extractTextFromBuffer(buffer, filename = '', mimetype = '') {
  const isPdf = filename.toLowerCase().endsWith('.pdf') || mimetype === 'application/pdf';
  if (isPdf) {
    try {
      const parsedPdf = await pdfParse(buffer);
      if (parsedPdf && parsedPdf.text && parsedPdf.text.trim()) {
        return parsedPdf.text;
      }
    } catch (_) {
      // If PDF parsing fails, fall through to string conversion
    }
  }
  return buffer.toString('utf-8');
}

// Parse skills, projects, and certifications using Gemini AI (with keyword fallback)
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

  let extractedData = { status: 'ok', skills: [], projects: [], certifications: [] };

  // If no API key provided, Gemini AI is offline: do not perform AI analysis or regex fallback
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

// Prompt for live 2026 campus placement drive searches
function getGeminiSearchPrompt() {
  return `You are an AI career and placement intelligence engine for Indian engineering college students (2026 batch).
Generate a curated list of 10 to 15 genuine, realistic software engineering campus placement drives, graduate engineer trainee (GET) roles, and software internships in India for candidates graduating in 2026.

Include a diverse mix of:
- Major IT Services firms (e.g. TCS NQT, Infosys SP/DSE, Wipro Turbo, Cognizant GenC Next, Accenture ASE/FSE, Capgemini, LTIMindtree)
- Product & Tech Giants (e.g. Amazon WOW / SDE Intern, Microsoft, Google, Cisco, Oracle)
- High-growth Indian tech & SaaS companies (e.g. Zoho, Swiggy, Zomato, PhonePe, Razorpay)

For each opportunity provide strictly these 7 keys in each object:
1. "companyName": Exact name of the employer
2. "role": Job title (e.g. "Graduate Engineer Trainee - Software", "Associate Software Engineer", "SDE Intern (2026)")
3. "eligibility": Requirements for 2026 graduates (degree, branches, CGPA / percentage cutoffs)
4. "salary": CTC or monthly stipend (e.g. "INR 4.5 - 7.5 LPA", "INR 35,000 / month")
5. "deadline": Target application deadline (e.g. "Nov 30, 2026", "Dec 15, 2026", or "Rolling / Ongoing")
6. "status": "Open Drive" or "Shortlisting"
7. "applyUrl": Official career site or application link (e.g. "https://www.tcs.com/careers", "https://careers.infosys.com")

Return ONLY a valid JSON array of objects. No markdown backticks, no comments, no intro text.`;
}

// Mock drives shown when Gemini is offline or key is missing
const STATIC_OFFLINE_DRIVES = [
  {
    companyName: 'Acme Innovations (Sample Demo)',
    role: 'Junior Web Developer (Mock)',
    eligibility: 'B.Tech/B.E. (2026 Batch) • Demo Sample Profile Only',
    salary: 'INR 4.5 - 6.0 LPA (Mock Package)',
    deadline: 'Offline Mode (Sample)',
    status: 'Offline Demo',
    applyUrl: '#sample-demo',
    isSampleMock: true
  },
  {
    companyName: 'NovaSphere Labs (Sample Demo)',
    role: 'Software Engineering Intern (Mock)',
    eligibility: '2026 Graduates • Sample Offline Data',
    salary: 'INR 20,000 / month (Mock Stipend)',
    deadline: 'Offline Mode (Sample)',
    status: 'Offline Demo',
    applyUrl: '#sample-demo',
    isSampleMock: true
  },
  {
    companyName: 'Apex Digital Systems (Sample Demo)',
    role: 'QA Automation Associate (Mock)',
    eligibility: 'All 2026 Engineering Streams • Offline Sample Data',
    salary: 'INR 3.6 - 4.8 LPA (Mock Package)',
    deadline: 'Offline Mode (Sample)',
    status: 'Offline Demo',
    applyUrl: '#sample-demo',
    isSampleMock: true
  }
];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY'));
  res.json({
    status: 'ok',
    message: 'Elevate server is running smoothly',
    hasGeminiKey: hasEnvKey,
    dbConnected: isDbConnected(),
    timestamp: new Date().toISOString()
  });
});

// Register user, optionally parse resume, and return JWT
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
    const activeKey = getApiKey(req);
    const userCustomKey = (req.body && typeof req.body.geminiApiKey === 'string') ? req.body.geminiApiKey.trim() : '';

    if (req.file) {
      resumeOriginalName = req.file.originalname || 'resume.pdf';
      try {
        fs.writeFileSync(path.join(uploadsDir, resumeOriginalName), req.file.buffer);
      } catch (_) {}

      // AI resume parsing runs if a Gemini API key is available (from user or .env)
      if (activeKey) {
        try {
          const text = await extractTextFromBuffer(req.file.buffer, resumeOriginalName, req.file.mimetype);
          if (text.trim()) {
            const parsed = await extractResumeData(text, resumeOriginalName, activeKey);
            extractedSkills = parsed.skills || [];
            extractedProjects = parsed.projects || [];
            extractedCertifications = parsed.certifications || [];
          }
        } catch (_) {}
      }
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
      skills: extractedSkills,
      projects: extractedProjects,
      certificates: extractedCertifications,
      resumeName: resumeOriginalName,
      geminiApiKey: userCustomKey || ''
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

// Login user and return JWT
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

// Get current user profile
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

// Update user profile
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

// List all users (admin or recruiter only)
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

// Upload and parse resume
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

// Re-parse saved resume
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

// Download resume file
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

// Fetch 2026 placement drives via Gemini AI or return offline mock
app.get('/api/drives/live', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.json({ status: 'ok', source: 'offline', drives: STATIC_OFFLINE_DRIVES });
  }

  try {
    const prompt = getGeminiSearchPrompt();

    let responseText = null;

    // Priority 1: gemini-3.5-flash-lite (fast, structured JSON response)
    try {
      const liveUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`;
      const liveRes = await fetch(liveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(12000)
      });
      if (liveRes.ok) {
        const data = await liveRes.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } catch (_) {}

    // Priority 2: gemini-3.8-flash fallback
    if (!responseText) {
      try {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          }),
          signal: AbortSignal.timeout(12000)
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      } catch (_) {}
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

  // Fallback to static mock drives when Gemini AI is offline
  return res.json({ status: 'ok', source: 'offline', drives: STATIC_OFFLINE_DRIVES });
});

// Save or clear user's Gemini API key
app.post('/api/user/gemini-key', requireAuth, async (req, res) => {
  try {
    const key = (req.body && typeof req.body.geminiApiKey === 'string') ? req.body.geminiApiKey.trim() : '';
    if (isDbConnected() && req.user && req.user.id) {
      await User.findByIdAndUpdate(req.user.id, { geminiApiKey: key });
    }
    return res.json({
      status: 'ok',
      hasGeminiKey: Boolean(key),
      message: key ? 'Gemini API key saved successfully.' : 'Gemini API key removed.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update Gemini API key: ' + err.message });
  }
});

// Start server and connect to database
if (require.main === module) {
  connectDb().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  });
}

module.exports = app;
