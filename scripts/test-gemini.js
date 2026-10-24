/**
 * Diagnostic CLI script to test Google Gemini API with Google Search grounding and fallback.
 * Run directly with: node scripts/test-gemini.js
 */
const fs = require('fs');
const path = require('path');

// Dynamically resolve API key without committing secrets:
// Priority: process.env.GEMINI_API_KEY -> root .env
function getApiKey() {
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')) {
    return process.env.GEMINI_API_KEY.trim();
  }

  // Check local .env file in project root
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1] && !match[1].includes('YOUR_GEMINI_API_KEY')) {
        return match[1].trim();
      }
    } catch (_) {}
  }

  return '';
}

const apiKey = getApiKey();
if (!apiKey) {
  console.error('\n[Error] No GEMINI_API_KEY found.');
  console.error('Please configure your API key in .env or set the GEMINI_API_KEY environment variable.\n');
  process.exit(1);
}

const prompt = `Find up to 15 genuine, currently active software engineering jobs, fresher hiring drives, graduate recruitment programs, and software internships in India for candidates graduating in 2026. Aim for 10–15 verified results whenever enough qualifying opportunities exist.

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

async function testWithSearch() {
  console.log("Testing primary endpoint (gemini-flash-latest with search grounding)...");
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }]
      }),
      signal: AbortSignal.timeout(30000)
    });
    console.log("gemini-flash-latest with search Status:", res.status);
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (res.ok && raw) {
      console.log("Raw response:\n", raw.slice(0, 300) + "...\n");
      const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(text);
      console.log("Parsed successfully! Total drives:", parsed.length);
      console.log("First item:", parsed[0]);
      return parsed;
    } else {
      console.log("Search grounding response was not OK or rate limited:", JSON.stringify(data.error || data, null, 2));
    }
  } catch (err) {
    console.warn("Search grounding query error:", err.message);
  }

  // Fallback to active model with JSON generation
  console.log("\nTesting fallback endpoint (gemini-3.5-flash-lite with JSON mode)...");
  try {
    const fallbackPrompt = `Find currently active campus hiring drives, software internships, and fresher placement opportunities in India for 2026 graduates.
Provide 10 verified campus recruitment opportunities and engineering internships for the 2026 batch at top technology companies in India (such as Google, Microsoft, Amazon, Tata Consultancy Services, Qualcomm, Goldman Sachs, Cisco, Infosys).

Return ONLY a valid JSON array of objects using this exact structure:
[
  {
    "companyName": "Company Name",
    "role": "Role Title",
    "eligibility": "Eligibility requirements including 2026 batch eligibility, degrees, CGPA, and core technical skills",
    "salary": "Package or stipend details",
    "deadline": "Application deadline or Open Drive",
    "status": "Open Drive or Shortlisting",
    "applyUrl": "Official direct student careers URL"
  }
]`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fallbackPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
      signal: AbortSignal.timeout(30000)
    });
    console.log("gemini-3.5-flash-lite Status:", res.status);
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (res.ok && raw) {
      const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(text);
      console.log("Fallback parsed successfully! Total drives:", parsed.length);
      console.log("First item:", parsed[0]);
      return parsed;
    }
  } catch (err) {
    console.error("Fallback query error:", err.message);
  }
}

testWithSearch().catch(console.error);
