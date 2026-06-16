import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";
import puppeteer from "puppeteer";
import axios from "axios";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Multer
export const upload = multer({
  dest: "/tmp/portfolio-uploads/",
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ];
    cb(
      allowed.includes(file.mimetype)
        ? null
        : new Error(`Unsupported file type: ${file.mimetype}`),
      allowed.includes(file.mimetype),
    );
  },
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const CONTACT_PATTERNS = [
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  /(\+?\d[\d\s\-().]{7,}\d)/g,
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /@[a-zA-Z0-9._]+/g,
  /whatsapp[:\s]*[\d\s+\-()]+/gi,
  /telegram[:\s]*@?[a-zA-Z0-9_]+/gi,
  /linkedin\.com\/in\/[^\s]*/gi,
  /twitter\.com\/[^\s]*/gi,
  /github\.com\/[^\s]*/gi,
];

function stripContactInfo(text) {
  let clean = text;
  for (const pattern of CONTACT_PATTERNS)
    clean = clean.replace(pattern, "[REDACTED]");
  return clean;
}

function normalizeUrl(rawUrl) {
  return rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`;
}

// ── Find system Chrome on Windows/Mac/Linux
function getSystemChromePath() {
  const candidates = [
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    // Mac
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log("[Scraper] Found system Chrome at:", p);
      return p;
    }
  }
  return null;
}

// ── Strategy 1: System Chrome via Puppeteer (no download needed)
async function scrapeWithPuppeteer(url) {
  const executablePath = getSystemChromePath();
  if (!executablePath) throw new Error("System Chrome not found");

  console.log("[Scraper/Puppeteer] Using system Chrome:", executablePath);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--window-size=1440,900",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 5000));

    // Slow scroll to trigger lazy-loaded sections (Canva, Webflow, etc.)
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 200);
          totalHeight += 200;
          if (totalHeight >= document.body.scrollHeight + 2000) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
    await new Promise((r) => setTimeout(r, 4000));

    // Second scroll pass
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 1000));
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 300);
          totalHeight += 300;
          if (totalHeight >= document.body.scrollHeight + 2000) {
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });
    await new Promise((r) => setTimeout(r, 3000));

    const text = await page.evaluate(() => {
      document
        .querySelectorAll(
          "script,style,nav,iframe,noscript,svg,canvas,[aria-hidden='true']",
        )
        .forEach((el) => el.remove());

      const attrTexts = [];
      document.querySelectorAll("[aria-label]").forEach((el) => {
        const v = el.getAttribute("aria-label")?.trim();
        if (v && v.length > 15) attrTexts.push(v);
      });
      document.querySelectorAll("[data-text],[alt]").forEach((el) => {
        const v = (
          el.getAttribute("data-text") || el.getAttribute("alt")
        )?.trim();
        if (v && v.length > 15) attrTexts.push(v);
      });

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
      );
      const chunks = [];
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t.length > 10) chunks.push(t);
      }

      return [...new Set([...chunks, ...attrTexts])].join("\n");
    });

    console.log("[Scraper/Puppeteer] Text length:", text.length);
    if (text.trim().length < 80) throw new Error("Too little text extracted");
    return text.slice(0, 15000);
  } finally {
    await browser.close();
  }
}

// ── Strategy 2: Jina AI reader (free, handles JS sites well)
async function scrapeWithJina(url) {
  console.log("[Scraper/Jina] Fetching:", url);

  // Try with X-Return-Format for richer content
  const res = await axios.get(`https://r.jina.ai/${url}`, {
    headers: {
      Accept: "text/plain",
      "X-Return-Format": "text",
      "X-With-Generated-Alt": "true", // include image alt texts
      "X-No-Cache": "true",
      "User-Agent": "Mozilla/5.0",
    },
    timeout: 45000,
  });

  const text = res.data?.toString() ?? "";
  console.log("[Scraper/Jina] Text length:", text.length);

  // If Jina returns only the terms/boilerplate page, reject it
  if (
    text.trim().length < 80 ||
    (text.includes("Terms of Use") && text.length < 600)
  ) {
    throw new Error("Jina returned boilerplate/too little content");
  }

  return text.slice(0, 15000);
}

// ── Strategy 3: Puppeteer screenshot → Gemini Vision
// For sites that block text extraction entirely, screenshot and let Gemini read it visually
async function scrapeWithScreenshot(url) {
  const executablePath = getSystemChromePath();
  if (!executablePath)
    throw new Error("System Chrome not found for screenshot");

  console.log("[Scraper/Screenshot] Taking screenshots of:", url);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1440,900",
    ],
  });

  const screenshotPaths = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
    );
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 5000));

    // Take screenshots at different scroll positions
    const scrollPositions = [0, 900, 1800, 2700, 3600];
    for (let i = 0; i < scrollPositions.length; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollPositions[i]);
      await new Promise((r) => setTimeout(r, 1500));
      const screenshotPath = `/tmp/portfolio-uploads/screenshot-${Date.now()}-${i}.png`;
      await page.screenshot({ path: screenshotPath, type: "png" });
      screenshotPaths.push(screenshotPath);
      console.log(
        `[Scraper/Screenshot] Captured scroll pos ${scrollPositions[i]}`,
      );
    }
  } finally {
    await browser.close();
  }

  // Send screenshots to Gemini Vision
  console.log(
    "[Scraper/Screenshot] Sending",
    screenshotPaths.length,
    "screenshots to Gemini Vision",
  );
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const imageParts = screenshotPaths.map((p) => ({
    inlineData: {
      data: fs.readFileSync(p).toString("base64"),
      mimeType: "image/png",
    },
  }));

  const result = await model.generateContent([
    {
      text: `These are screenshots of a freelancer's portfolio website. Extract ALL visible text content including: name, bio, skills, services, projects, experience, and any professional information. Return the raw extracted text only, no formatting.`,
    },
    ...imageParts,
  ]);

  // Clean up screenshots
  screenshotPaths.forEach((p) => fs.unlink(p, () => {}));

  const extractedText = result.response.text().trim();
  console.log(
    "[Scraper/Screenshot] Extracted text length:",
    extractedText.length,
  );
  if (extractedText.length < 80)
    throw new Error("Screenshot extraction returned too little");
  return extractedText.slice(0, 15000);
}

// ── Strategy 4: Static Cheerio (fast fallback for plain HTML)
async function scrapeWithCheerio(url) {
  console.log("[Scraper/Cheerio] Fetching:", url);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeout: 15000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script,style,nav,footer,head,iframe,noscript").remove();
  const chunks = [];
  $("h1,h2,h3,h4,p,li,span,div,section,article").each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 15) chunks.push(t);
  });
  const text = [...new Set(chunks)].join("\n");
  console.log("[Scraper/Cheerio] Text length:", text.length);
  if (text.trim().length < 80)
    throw new Error("Cheerio returned too little content");
  return text.slice(0, 15000);
}

// ── Master scraper — 4 strategies in order
async function scrapeUrl(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const strategies = [
    { name: "Puppeteer", fn: () => scrapeWithPuppeteer(url) },
    { name: "Jina", fn: () => scrapeWithJina(url) },
    { name: "Screenshot", fn: () => scrapeWithScreenshot(url) },
    { name: "Cheerio", fn: () => scrapeWithCheerio(url) },
  ];

  for (const { name, fn } of strategies) {
    try {
      const text = await fn();
      console.log(`[Scraper] ✅ ${name} succeeded`);
      return text;
    } catch (err) {
      console.warn(`[Scraper] ⚠️ ${name} failed:`, err.message);
    }
  }

  throw new Error("All scraping strategies failed for: " + url);
}

function fileToGeminiPart(filePath, mimeType) {
  const data = fs.readFileSync(filePath);
  return { inlineData: { data: data.toString("base64"), mimeType } };
}

const EXTRACTION_PROMPT = `
You are a professional portfolio analyst for a freelance marketplace.

Analyze the provided portfolio content (which may be a document, website text, or image) and extract structured professional information.

STRICT RULES:
- Remove ALL contact information: emails, phone numbers, WhatsApp, Telegram, social media handles, URLs, website addresses. Replace with nothing — do not include them anywhere in your output.
- Return ONLY valid JSON. No markdown, no backticks, no explanation, no extra text.
- If you cannot determine a field, use null or an empty array.
- Keep all text professional and concise.
- For "experience", return a number (years). If not stated, estimate from project history or return null.
- For "industries", infer from the projects and services (e.g. "Fintech", "E-Commerce", "Healthcare", "Media").
- For "confidence_score", return a number between 0 and 1 indicating how confident you are in the extraction quality.

Return EXACTLY this JSON structure:
{
  "headline": "Short professional headline (max 10 words)",
  "experience": 3,
  "skills": ["skill1", "skill2"],
  "services": ["service1", "service2"],
  "industries": ["industry1"],
  "certifications": ["cert1"],
  "projects": [
    {
      "name": "Project name",
      "description": "1-2 sentence description, no contact info",
      "technologies": ["tech1"],
      "outcomes": "Measurable result or impact"
    }
  ],
  "confidence_score": 0.85
}
`;

async function analyzeWithGemini(textContent) {
  console.log("[Gemini/text] Input length:", textContent.length);
  console.log("[Gemini/text] Preview:", textContent.slice(0, 400));

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    `\n\nPORTFOLIO CONTENT:\n${textContent}`,
  ]);

  const raw = result.response.text().trim();
  console.log("[Gemini/text] Raw response:", raw.slice(0, 600));

  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const parsed = JSON.parse(cleaned);
  console.log(
    "[Gemini/text] Parsed — confidence:",
    parsed.confidence_score,
    "| skills:",
    parsed.skills,
  );
  return parsed;
}

async function analyzeFileWithGemini(filePath, mimeType) {
  console.log("[Gemini/file] Sending file:", filePath, "| MIME:", mimeType);

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  const filePart = fileToGeminiPart(filePath, mimeType);
  const result = await model.generateContent([
    { text: EXTRACTION_PROMPT },
    filePart,
  ]);

  const raw = result.response.text().trim();
  console.log("[Gemini/file] Raw response:", raw.slice(0, 600));

  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const parsed = JSON.parse(cleaned);
  console.log(
    "[Gemini/file] Parsed — confidence:",
    parsed.confidence_score,
    "| headline:",
    parsed.headline,
  );
  return parsed;
}

const PDF_IMAGE_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DOCX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

async function extractFromSources(files = [], url = "") {
  const allExtracted = [];

  for (const file of files) {
    console.log(
      `[Portfolio] Processing file: ${file.originalname} | MIME: ${file.mimetype} | size: ${file.size} bytes`,
    );
    try {
      let extracted;
      if (PDF_IMAGE_MIMES.has(file.mimetype)) {
        extracted = await analyzeFileWithGemini(file.path, file.mimetype);
      } else if (DOCX_MIMES.has(file.mimetype)) {
        console.log("[Portfolio] Extracting DOCX text with mammoth...");
        const result = await mammoth.extractRawText({ path: file.path });
        console.log(
          "[Portfolio] Mammoth extracted length:",
          result.value.length,
        );
        if (result.messages.length > 0)
          console.warn("[Portfolio] Mammoth warnings:", result.messages);
        const clean = stripContactInfo(result.value);
        extracted = await analyzeWithGemini(clean);
      } else {
        console.log("[Portfolio] Reading file as plain text...");
        const text = fs.readFileSync(file.path, "utf8");
        const clean = stripContactInfo(text);
        extracted = await analyzeWithGemini(clean);
      }
      allExtracted.push(extracted);
      console.log(`[Portfolio] File "${file.originalname}" extracted OK.`);
    } catch (fileErr) {
      console.error(
        `[Portfolio] Error processing file "${file.originalname}":`,
        fileErr,
      );
    } finally {
      fs.unlink(file.path, (err) => {
        if (err)
          console.warn(`[Portfolio] Could not delete temp file: ${file.path}`);
      });
    }
  }

  if (url) {
    console.log(`[Portfolio] Scraping URL: ${url}`);
    try {
      const scraped = await scrapeUrl(url);
      const clean = stripContactInfo(scraped);
      console.log(`[Portfolio] Final text length: ${clean.length}`);

      if (clean.trim().length < 80) {
        console.warn("[Portfolio] Content too short after cleaning, skipping.");
      } else {
        const extracted = await analyzeWithGemini(clean);
        if (!extracted.confidence_score || extracted.confidence_score < 0.3) {
          console.warn(
            "[Portfolio] Confidence too low, discarding:",
            extracted.confidence_score,
          );
        } else {
          allExtracted.push(extracted);
          console.log("[Portfolio] URL extraction OK.");
        }
      }
    } catch (urlErr) {
      console.error("[Portfolio] All strategies exhausted:", urlErr.message);
    }
  }

  if (allExtracted.length === 0) return null;

  return {
    headline:
      allExtracted.find((e) => e.headline)?.headline ||
      allExtracted[0].headline,
    experience: Math.max(...allExtracted.map((e) => e.experience || 0)),
    skills: [...new Set(allExtracted.flatMap((e) => e.skills || []))],
    services: [...new Set(allExtracted.flatMap((e) => e.services || []))],
    industries: [...new Set(allExtracted.flatMap((e) => e.industries || []))],
    certifications: [
      ...new Set(allExtracted.flatMap((e) => e.certifications || [])),
    ],
    projects: allExtracted.flatMap((e) => e.projects || []),
    confidence_score:
      allExtracted.reduce((sum, e) => sum + (e.confidence_score || 0), 0) /
      allExtracted.length,
  };
}

// ─────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────

export const analyzePortfolio = async (req, res, next) => {
  const { userId } = req.params;
  const { url } = req.body;
  const files = req.files || [];

  console.log(
    `[Portfolio] analyzePortfolio called — userId: ${userId} | files: ${files.length} | url: ${url || "none"}`,
  );

  if (!url && files.length === 0)
    return next(createError(400, "Provide at least one file or a URL."));

  try {
    await User.findByIdAndUpdate(userId, {
      $set: { portfolio: { status: "processing" } },
    });

    const merged = await extractFromSources(files, url);

    if (!merged) {
      console.error("[Portfolio] All sources failed extraction.");
      await User.findByIdAndUpdate(userId, {
        $set: { portfolio: { status: "failed" } },
      });
      return next(createError(500, "AI extraction failed for all sources."));
    }

    console.log("[Portfolio] Merged result:", JSON.stringify(merged, null, 2));

    const portfolioObject = {
      status: "completed",
      analyzedAt: new Date(),
      ...merged,
    };

    await User.findByIdAndUpdate(
      userId,
      { $set: { portfolio: portfolioObject } },
      { new: true },
    );

    console.log(`[Portfolio] Done — userId: ${userId}`);
    return res
      .status(200)
      .json({
        message: "Portfolio analyzed successfully.",
        portfolio: portfolioObject,
      });
  } catch (err) {
    console.error("[Portfolio] Unexpected error:", err);
    await User.findByIdAndUpdate(userId, {
      $set: { portfolio: { status: "failed" } },
    });
    next(err);
  }
};

export const analyzeTempPortfolio = async (req, res, next) => {
  const { url } = req.body;
  const files = req.files || [];

  console.log(
    `[Portfolio/temp] analyzeTempPortfolio called | files: ${files.length} | url: ${url || "none"}`,
  );

  if (!url && files.length === 0)
    return next(createError(400, "Provide at least one file or a URL."));

  try {
    const merged = await extractFromSources(files, url);

    if (!merged) {
      console.error("[Portfolio/temp] All sources failed extraction.");
      return next(
        createError(
          500,
          "Could not read your portfolio. Please try a different file or URL.",
        ),
      );
    }

    console.log(
      "[Portfolio/temp] Extraction OK — confidence:",
      merged.confidence_score,
    );
    return res
      .status(200)
      .json({ message: "Portfolio read successfully.", portfolio: merged });
  } catch (err) {
    console.error("[Portfolio/temp] Unexpected error:", err);
    next(err);
  }
};

export const applyPortfolioToProfile = async (req, res, next) => {
  const { userId } = req.params;
  console.log(`[Portfolio] applyPortfolioToProfile — userId: ${userId}`);

  try {
    const user = await User.findById(userId);
    if (!user) return next(createError(404, "User not found"));

    const p = user.portfolio;
    if (!p || p.status !== "completed")
      return next(
        createError(
          400,
          "No completed portfolio analysis found for this user.",
        ),
      );

    const skillsSummary =
      p.skills?.length > 0 ? `\n\nCore skills: ${p.skills.join(", ")}.` : "";
    const certsSummary =
      p.certifications?.length > 0
        ? `\n\nCertifications: ${p.certifications.join(", ")}.`
        : "";
    const newDesc = [p.headline, skillsSummary, certsSummary]
      .filter(Boolean)
      .join("")
      .trim();

    const updatePayload = {};
    if (newDesc) {
      updatePayload.desc = newDesc;
      updatePayload.bio = newDesc;
    }
    if (p.services?.length > 0) updatePayload.services = p.services;
    if (p.experience) updatePayload.yearsOfExperience = String(p.experience);

    console.log("[Portfolio] Applying to profile:", updatePayload);

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updatePayload },
      { new: true },
    ).select("-password");
    return res
      .status(200)
      .json({ message: "Portfolio applied to profile.", user: updated });
  } catch (err) {
    console.error("[Portfolio] applyPortfolioToProfile error:", err);
    next(err);
  }
};

export const clearPortfolio = async (req, res, next) => {
  const { userId } = req.params;
  console.log(`[Portfolio] clearPortfolio — userId: ${userId}`);
  try {
    await User.findByIdAndUpdate(userId, { $set: { portfolio: null } });
    return res.status(200).json({ message: "Portfolio cleared." });
  } catch (err) {
    console.error("[Portfolio] clearPortfolio error:", err);
    next(err);
  }
};

export const getTopPortfolioUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      "portfolio.status": "completed",
      "portfolio.confidence_score": { $gte: 0.9 },
    })
      .select("username img portfolio yearsOfExperience country")
      .sort({ "portfolio.confidence_score": -1 })
      .limit(6)
      .lean();

    return res.status(200).json({ users });
  } catch (err) {
    console.error("[Portfolio] getTopPortfolioUsers error:", err);
    next(err);
  }
};
