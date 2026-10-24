/**
 * Elevate Backend Server (Node.js & Express)
 * Provides static asset serving, health monitoring, resume PDF/text ingestion,
 * and Gemini 3.5 Flash Lite parsing for skills, projects, and certifications.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');

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

// Middleware: parse JSON and serve static workspace assets with no-cache headers in development
app.use(express.json());
app.use(express.static(__dirname, {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Ensure resume uploads directory exists
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
 * Resolves target resume file from uploads directory.
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
 * Extracts text from PDF or raw text buffer.
 * @param {Buffer} buffer
 * @param {string} [filename]
 * @param {string} [mimetype]
 * @returns {Promise<string>}
 */
async function extractTextFromBuffer(buffer, filename = '', mimetype = '') {
  const isPdf = filename.toLowerCase().endsWith('.pdf') || mimetype === 'application/pdf';
  if (isPdf) {
    const parsedPdf = await pdfParse(buffer);
    return parsedPdf.text || '';
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
        const geminiRes = await response.json();
        const rawText = geminiRes?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        extractedData = JSON.parse(rawText);
      }
    } catch (aiErr) {
      console.warn('Gemini AI parse notice:', aiErr.message);
    }
  }

  // Fallback 1: Extract skills from text if empty
  if (!extractedData.skills || extractedData.skills.length === 0) {
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'C++', 'C', 'React', 'Node.js', 'Express',
      'HTML5', 'CSS3', 'SQL', 'MongoDB', 'PostgreSQL', 'Git', 'GitHub', 'Docker',
      'AWS', 'DSA', 'REST APIs', 'TypeScript', 'Tailwind', 'Bootstrap 5', 'FastAPI',
      'OpenCV', 'MediaPipe', 'NumPy', 'Pandas', 'scikit-learn', 'Ollama', 'LLM tool calling'
    ];
    extractedData.skills = commonSkills.filter(s =>
      new RegExp('\\b' + s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(resumeText)
    );
  }

  // Fallback 2: Extract real projects if empty
  if (!extractedData.projects || extractedData.projects.length === 0) {
    const projSectionMatch = resumeText.split(/PROJECTS\s*\n/i)[1];
    const projSection = projSectionMatch ? projSectionMatch.split(/\n\s*(?:CERTIFICATIONS|EDUCATION|EXPERIENCE|TECHNICAL SKILLS)/i)[0] : '';
    if (projSection) {
      const rawLines = projSection.split('\n').map(l => l.trim()).filter(Boolean);
      const mergedLines = [];

      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (!line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*')) {
          if (mergedLines.length > 0 &&
              !mergedLines[mergedLines.length - 1].startsWith('•') &&
              !mergedLines[mergedLines.length - 1].startsWith('-') &&
              !/(\d{4}|in progress|present)/i.test(mergedLines[mergedLines.length - 1]) &&
              /(\d{4}|in progress|present)/i.test(line)) {
            mergedLines[mergedLines.length - 1] += ' ' + line;
            continue;
          }
        }
        mergedLines.push(line);
      }

      let current = null;
      const parsedProjects = [];

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

  // Normalize project schema
  const normalizedProjects = (Array.isArray(extractedData.projects) ? extractedData.projects : [])
    .filter(p => (p.name || p.title) && (p.name || p.title).toUpperCase() !== 'FEATURED RESUME PROJECT' && p.desc !== 'PROJECTS')
    .map(p => ({
      name: p.name || p.title || 'Resume Project',
      desc: p.desc || p.description || p.detail || 'Extracted from resume',
      stack: (Array.isArray(p.stack) && p.stack.length > 0) ? p.stack : (Array.isArray(p.techStack) && p.techStack.length > 0 ? p.techStack : ['Tech Stack']),
      status: p.status || 'Completed'
    }));

  // Normalize certification schema
  const normalizedCertificates = (Array.isArray(extractedData.certifications) ? extractedData.certifications : []).map(c => ({
    title: c.title || c.name || 'Course Certification',
    issuer: c.issuer || c.organization || 'Verified Provider',
    tag: c.tag || 'Skill Credential'
  }));

  return {
    status: 'ok',
    filename: originalName,
    skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
    projects: normalizedProjects,
    certifications: normalizedCertificates
  };
}

// Route 1: Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route 2: Server health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Elevate server is running smoothly'
  });
});

// Route 3: Resume upload and extraction
app.post('/api/resume/parse', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded.' });
    }

    const originalName = req.file.originalname || 'resume.pdf';

    // Persist uploaded file to uploads directory
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
    return res.json(result);
  } catch (error) {
    console.error('Resume parse error:', error);
    return res.status(500).json({ error: 'Failed to process resume.', message: error.message });
  }
});

// Route 4: Re-parse existing resume on file
app.post('/api/resume/reparse', async (req, res) => {
  try {
    const target = resolveResumeFile(req.body && req.body.filename);
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

// Route 5: Download active resume
app.get('/api/resume/download', (req, res) => {
  try {
    const target = resolveResumeFile(req.query.filename);
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

// Start listener when executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
