import User from "../models/userModel.js";
import Gig from "../models/gigModel.js";
import createError from "../utils/createError.js";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";
import puppeteer from "puppeteer";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─────────────────────────────────────────────
// IMAGE STORAGE
// NOTE: this assumes Cloudinary is configured via CLOUDINARY_* env vars
// (the same pattern used on OuterSkinX). If this project's image uploads
// actually go through a different service, swap the body of
// uploadImageBuffer() below — everything else in this file just calls
// that one function and doesn't care how/where the URL comes from.
// ─────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadImageBuffer(buffer, mimeType, folder = "portfolio") {
  const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const res = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: "image",
  });
  return res.secure_url;
}

// ─────────────────────────────────────────────
// MODEL FALLBACK CHAIN
// Each Gemini model has its own SEPARATE daily quota on the free tier.
// When one model's RPD cap is hit, we fall through to the next rather than
// failing the whole extraction. Ordered to burn the small 20 RPD pools
// first and save the big 500 RPD pool (3.1 Flash Lite) as the long-tail
// reserve once everything else is exhausted.
// ─────────────────────────────────────────────

const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite-preview", // 500 RPD reserve — kept for last
];

// In-memory cooldown so a single batch of files doesn't waste a round trip
// re-testing a model we already know is exhausted on every subsequent file.
// 10 minutes is short-lived on purpose — we don't try to track the exact
// daily-reset time, so worst case we retry a still-exhausted model once
// after the cooldown and simply fall through again.
const modelCooldownUntil = new Map();
const COOLDOWN_MS = 10 * 60 * 1000;

function isQuotaError(err) {
  return (
    err?.status === 429 ||
    /429|quota|RESOURCE_EXHAUSTED/i.test(err?.message || "")
  );
}

async function generateContentWithFallback(parts, label = "request") {
  const available = MODEL_FALLBACK_CHAIN.filter(
    (m) => !modelCooldownUntil.has(m) || Date.now() > modelCooldownUntil.get(m),
  );
  // If every model is currently on cooldown, try them anyway in original
  // order — a slow retry beats failing outright.
  const chain = available.length > 0 ? available : MODEL_FALLBACK_CHAIN;

  let lastErr;
  for (const modelName of chain) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(parts);
      console.log(`[Gemini] ✅ ${label} succeeded on ${modelName}`);
      modelCooldownUntil.delete(modelName);
      return result;
    } catch (err) {
      lastErr = err;
      if (isQuotaError(err)) {
        console.warn(
          `[Gemini] ⚠️ ${modelName} hit its quota for ${label}, switching model...`,
        );
        modelCooldownUntil.set(modelName, Date.now() + COOLDOWN_MS);
      } else {
        console.warn(
          `[Gemini] ⚠️ ${modelName} failed for ${label} (${err.message}), trying next model...`,
        );
      }
    }
  }
  throw lastErr || new Error(`All Gemini models exhausted for ${label}`);
}

// ─────────────────────────────────────────────
// PORTFOLIO QUALITY SCORING
// Measures how strong a portfolio actually is — completely separate from
// confidence_score, which only tells us how reliably Gemini could read the
// source material. A weak portfolio on a clean PDF can have confidence 0.95;
// a rich portfolio on a janky site can have confidence 0.55. This score is
// what drives freelancer ranking and tier badges.
// ─────────────────────────────────────────────

/**
 * Compute a 0–1 portfolio quality score from the extracted data.
 *
 * CALIBRATION PHILOSOPHY
 * ───────────────────────
 * The previous caps (10 skills, 5 services, 3 certs, 5 projects for full
 * marks) only an unusually prolific portfolio would hit — a genuinely solid,
 * typical professional freelancer (a few years in, a focused skill set,
 * 2-3 well-documented case studies, no formal certs) would top out around
 * "Associate" even though that's roughly what a client should expect a
 * competent freelancer to look like. Certifications in particular are a
 * bonus, not a baseline — plenty of strong freelancers have none, so
 * they're weighted lightly and aren't required for a high score.
 *
 * These caps are now set at "what a solid professional realistically has,"
 * not "what a portfolio maximalist has":
 *
 *   headline present            → +0.05  (any non-trivial headline)
 *   experience (years)          → up to +0.15  (capped at 5 yrs → full marks)
 *   skills count                → up to +0.20  (6+ relevant skills → full marks)
 *   services count              → up to +0.10  (3+ services → full marks)
 *   industries count            → up to +0.05  (2+ → full marks)
 *   certifications count        → up to +0.10  (2+ certs → full marks; 0 certs only
 *                                                misses this bonus, nothing more)
 *   projects count              → up to +0.20  (3+ documented case studies → full marks)
 *   project quality bonus       → up to +0.15  (up to 3 projects w/ real description + outcome)
 *
 * Weights still sum to 1.0 — only the denominators ("what counts as full
 * marks") moved, so a realistic, well-documented freelancer profile can
 * land in "Professional" territory without needing an unusually large
 * portfolio.
 *
 * NOTE: image presence and project "link" fields are intentionally NOT
 * factored into this score — they're profile-page polish, not a measure of
 * underlying skill/experience, so they shouldn't move someone's ranking.
 */
function computePortfolioScore(data) {
  if (!data) return 0;

  let score = 0;

  // Headline
  if (data.headline && data.headline.trim().length > 3) score += 0.05;

  // Experience — linear up to 5 years (beyond this, more years doesn't make
  // someone meaningfully more "qualified" for scoring purposes)
  const exp = Number(data.experience) || 0;
  score += Math.min(exp / 5, 1) * 0.15;

  // Skills — linear up to 6 (a focused, real skill set beats a padded list)
  const skillCount = (data.skills || []).length;
  score += Math.min(skillCount / 6, 1) * 0.2;

  // Services — linear up to 3 (most freelancers reasonably offer 2-3 core services)
  const serviceCount = (data.services || []).length;
  score += Math.min(serviceCount / 3, 1) * 0.1;

  // Industries — linear up to 2
  const industryCount = (data.industries || []).length;
  score += Math.min(industryCount / 2, 1) * 0.05;

  // Certifications — linear up to 2. A bonus signal, not a baseline
  // expectation — many strong freelancers have none.
  const certCount = (data.certifications || []).length;
  score += Math.min(certCount / 2, 1) * 0.1;

  // Projects — linear up to 3 documented case studies (a credible, focused
  // portfolio, not a dump of every project ever touched)
  const projects = data.projects || [];
  score += Math.min(projects.length / 3, 1) * 0.2;

  // Project quality: each project can contribute up to 0.05 (max 3 projects scored → 0.15)
  // A project earns its 0.05 by having both a meaningful description AND a non-empty outcomes field.
  const qualityProjects = projects
    .filter(
      (p) =>
        p.description &&
        p.description.trim().length > 20 &&
        p.outcomes &&
        p.outcomes.trim().length > 5,
    )
    .slice(0, 3);
  score += qualityProjects.length * 0.05;

  return Math.min(Math.round(score * 100) / 100, 1);
}

// ── Portfolio grade thresholds (based on portfolio_score, 0–1)
// confidence_score is NOT used here anymore.
const GRADE_THRESHOLDS = [
  { min: 0.9, label: "Master Freelancer" },
  { min: 0.7, label: "Professional Freelancer" },
  { min: 0.5, label: "Associate Freelancer" },
];

function getPortfolioGrade(portfolioScore) {
  if (portfolioScore == null) return null;
  for (const tier of GRADE_THRESHOLDS) {
    if (portfolioScore >= tier.min) return tier.label;
  }
  return null;
}

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
//
// CONTACT_PATTERNS vs PROJECT LINKS
// ──────────────────────────────────
// These patterns intentionally target PERSONAL/CONTACT info only — emails,
// phone numbers, messaging handles (WhatsApp/Telegram), and personal social
// PROFILE urls (linkedin.com/in/…, twitter/x.com/…, a bare "@handle").
//
// We deliberately do NOT blanket-strip every http(s):// or www. URL anymore.
// Portfolios routinely embed per-project links (GitHub repos, live demo
// sites, case-study pages, Behance/Dribbble shots) right next to the
// project description, and the old generic URL patterns were redacting
// those along with actual contact info — so Gemini never saw them and
// "link" had nowhere to come from.
//
// github.com/<user> (bare profile, no repo path) is still treated as a
// personal-contact link and stripped; github.com/<user>/<repo> (an actual
// project repo) is left alone so it can be picked up as a project "link".

const CONTACT_PATTERNS = [
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, // emails
  /(\+?\d[\d\s\-().]{7,}\d)/g, // phone numbers
  /whatsapp[:\s]*[\d\s+\-()]+/gi,
  /telegram[:\s]*@?[a-zA-Z0-9_]+/gi,
  /linkedin\.com\/in\/[^\s]*/gi,
  /(twitter|x)\.com\/(?!.*\/status)[a-zA-Z0-9_]+\/?(?![a-zA-Z0-9_\/])/gi, // personal profile only
  /(?:^|\s)github\.com\/[a-zA-Z0-9_-]+\/?(?![a-zA-Z0-9_\/-])/gi, // bare profile, not /user/repo
  /(?:^|\s)@[a-zA-Z0-9._]+/g, // bare @handle mentions
];

function stripContactInfo(text) {
  let clean = text;
  for (const pattern of CONTACT_PATTERNS)
    clean = clean.replace(pattern, " [REDACTED] ");
  return clean;
}

function normalizeUrl(rawUrl) {
  return rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : `https://${rawUrl}`;
}

function getSystemChromePath() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
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

// ─────────────────────────────────────────────
// IMAGE EXTRACTION (shared across website scraping AND DOCX uploads)
// Pulls candidate <img> tags out of a chunk of HTML, filters out obvious
// icons/logos/spacers, resolves relative URLs, and captures whatever
// nearby text (alt, figcaption, heading, description) gives Gemini a
// strong enough hint to assign the image to the right project — not gallery.
// ─────────────────────────────────────────────

const MAX_IMAGES_PER_SOURCE = 12;

const SKIP_SRC_PATTERNS =
  /(favicon|sprite|spinner|loading|placeholder|pixel\.gif|1x1)/i;

function isLikelyContentImage($, el, resolvedUrl) {
  if (!resolvedUrl || resolvedUrl.startsWith("data:")) return false;
  if (SKIP_SRC_PATTERNS.test(resolvedUrl)) return false;
  const w = parseInt($(el).attr("width"), 10);
  const h = parseInt($(el).attr("height"), 10);
  if (w && h && w < 80 && h < 80) return false; // almost certainly an icon
  return true;
}

function getImageContext($, el) {
  const alt = $(el).attr("alt")?.trim();
  if (
    alt &&
    alt.length > 3 &&
    !/^(image|photo|picture|img)\s*\d*$/i.test(alt)
  ) {
    return alt;
  }

  const figcaption = $(el)
    .closest("figure")
    .find("figcaption")
    .first()
    .text()
    .trim();
  if (figcaption) return figcaption;

  // Walk up to 8 levels — portfolio sites often nest images deep inside
  // card/section wrappers. Collect the heading AND a snippet of body text
  // from the closest ancestor that has both, so Gemini has enough signal
  // to match the image to the right project instead of falling back to gallery.
  let node = $(el).parent();
  for (let i = 0; i < 8 && node && node.length; i++) {
    const heading = node
      .find("h1,h2,h3,h4,h5,[class*='title'],[class*='name']")
      .first()
      .text()
      .trim();
    const body = node
      .find("p,[class*='desc'],[class*='summary'],[class*='detail']")
      .first()
      .text()
      .trim();

    if (heading && body) {
      // Both present — give Gemini the richest possible hint
      return `${heading}: ${body}`.slice(0, 300);
    }
    if (heading) return heading;

    // No structured heading yet — try the raw text of this node
    const bare = node.clone().children().remove().end().text().trim();
    if (bare.length > 3 && bare.length < 300) return bare;

    node = node.parent();
  }
  return "";
}

function extractImagesFromHtml($, baseUrl) {
  const found = [];
  const seen = new Set();

  $("img").each((_, el) => {
    const rawSrc =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("srcset")?.split(",")[0]?.trim()?.split(" ")[0];
    if (!rawSrc) return;

    let resolved;
    try {
      resolved = new URL(rawSrc, baseUrl).href;
    } catch {
      return;
    }

    if (!isLikelyContentImage($, el, resolved)) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);

    found.push({
      url: resolved,
      context: stripContactInfo(getImageContext($, el) || ""),
    });
  });

  return found.slice(0, MAX_IMAGES_PER_SOURCE);
}

// ─────────────────────────────────────────────
// PROJECT LINK EXTRACTION (HTML-based, mirrors the image extraction
// pattern). Pulls candidate <a href> tags that look like project links
// (GitHub repos, live demo/case-study pages, Behance/Dribbble shots, etc.),
// resolves relative URLs, and captures nearby text so Gemini can match each
// link to the right project the same way it matches images.
// ─────────────────────────────────────────────

const MAX_LINKS_PER_SOURCE = 20;

// Anything matching these is treated as personal/contact, not a project link.
const SKIP_LINK_PATTERNS =
  /(mailto:|tel:|wa\.me|t\.me|telegram\.me|^https?:\/\/(www\.)?(linkedin|twitter|x)\.com\/in\/|^https?:\/\/(www\.)?(linkedin|twitter|x)\.com\/[a-zA-Z0-9_]+\/?$|^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$|facebook\.com\/|instagram\.com\/)/i;

function isLikelyProjectLink(href) {
  if (!href || href.startsWith("#") || href.startsWith("javascript:"))
    return false;
  if (SKIP_LINK_PATTERNS.test(href)) return false;
  return true;
}

function getLinkContext($, el) {
  const text = $(el).text().trim();
  if (text && text.length > 1 && text.length < 150) return text;

  const title = $(el).attr("title")?.trim();
  if (title) return title;

  // Walk up a few levels to find a nearby heading (same idea as image context)
  let node = $(el).parent();
  for (let i = 0; i < 5 && node && node.length; i++) {
    const heading = node
      .find("h1,h2,h3,h4,h5,[class*='title'],[class*='name']")
      .first()
      .text()
      .trim();
    if (heading) return heading;
    node = node.parent();
  }
  return "";
}

function extractLinksFromHtml($, baseUrl) {
  const found = [];
  const seen = new Set();

  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href");
    if (!rawHref) return;

    let resolved;
    try {
      resolved = new URL(rawHref, baseUrl).href;
    } catch {
      return;
    }

    if (!isLikelyProjectLink(resolved)) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);

    found.push({
      url: resolved,
      context: stripContactInfo(getLinkContext($, el) || ""),
    });
  });

  return found.slice(0, MAX_LINKS_PER_SOURCE);
}

// Best-effort, used when a scraping strategy gave us text but not HTML
// (Jina, screenshot OCR) — just go grab the images AND links separately so
// we don't lose them entirely. Failures here are non-fatal; the text
// extraction already succeeded via the primary strategy.
async function tryGetImagesOnly(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 15000,
    });
    if (!res.ok) return { images: [], links: [] };
    const html = await res.text();
    const $ = cheerio.load(html);
    return {
      images: extractImagesFromHtml($, url),
      links: extractLinksFromHtml($, url),
    };
  } catch {
    return { images: [], links: [] };
  }
}

// Pulls embedded images out of a DOCX file by uploading each one to
// storage as mammoth converts the document, then runs the same generic
// extractor over the resulting HTML to attach context to each one. Also
// pulls any hyperlinks (e.g. "View live site" links pointing at a project)
// using the same link extractor.
async function extractDocxImagesAndLinks(filePath) {
  try {
    const htmlResult = await mammoth.convertToHtml(
      { path: filePath },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          try {
            const buffer = await image.read();
            const url = await uploadImageBuffer(
              buffer,
              image.contentType,
              "portfolio/docx",
            );
            return { src: url };
          } catch (err) {
            console.warn(
              "[Portfolio] Failed to upload a DOCX image:",
              err.message,
            );
            return { src: "" };
          }
        }),
      },
    );
    const $ = cheerio.load(htmlResult.value);
    // Images already have absolute Cloudinary URLs as their src, so the
    // base URL passed here is never actually used for resolution. Links
    // inside a DOCX are usually already absolute too.
    return {
      images: extractImagesFromHtml($, "https://portfolio.local/"),
      links: extractLinksFromHtml($, "https://portfolio.local/"),
    };
  } catch (err) {
    console.warn("[Portfolio] DOCX image/link extraction failed:", err.message);
    return { images: [], links: [] };
  }
}

async function scrapeWithPuppeteer(url) {
  const executablePath = getSystemChromePath();
  if (!executablePath) throw new Error("System Chrome not found");

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

    // Grab the fully-rendered HTML (post-scroll, so lazy-loaded images/links
    // have populated their src/href) before stripping it down to plain text.
    const finalUrl = page.url();
    const html = await page.content();
    const $ = cheerio.load(html);
    const images = extractImagesFromHtml($, finalUrl);
    const links = extractLinksFromHtml($, finalUrl);

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

    if (text.trim().length < 80) throw new Error("Too little text extracted");
    return { text: text.slice(0, 15000), images, links };
  } finally {
    await browser.close();
  }
}

async function scrapeWithJina(url) {
  const res = await axios.get(`https://r.jina.ai/${url}`, {
    headers: {
      Accept: "text/plain",
      "X-Return-Format": "text",
      "X-With-Generated-Alt": "true",
      "X-No-Cache": "true",
      "User-Agent": "Mozilla/5.0",
    },
    timeout: 45000,
  });

  const text = res.data?.toString() ?? "";
  if (
    text.trim().length < 80 ||
    (text.includes("Terms of Use") && text.length < 600)
  ) {
    throw new Error("Jina returned boilerplate/too little content");
  }

  // Jina gives us plain text, not HTML — no images/links here directly.
  // tryGetImagesOnly() picks both up separately in scrapeUrl() below.
  return { text: text.slice(0, 15000), images: [], links: [] };
}

async function scrapeWithScreenshot(url) {
  const executablePath = getSystemChromePath();
  if (!executablePath)
    throw new Error("System Chrome not found for screenshot");

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

    const scrollPositions = [0, 900, 1800, 2700, 3600];
    for (let i = 0; i < scrollPositions.length; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollPositions[i]);
      await new Promise((r) => setTimeout(r, 1500));
      const screenshotPath = `/tmp/portfolio-uploads/screenshot-${Date.now()}-${i}.png`;
      await page.screenshot({ path: screenshotPath, type: "png" });
      screenshotPaths.push(screenshotPath);
    }
  } finally {
    await browser.close();
  }

  const imageParts = screenshotPaths.map((p) => ({
    inlineData: {
      data: fs.readFileSync(p).toString("base64"),
      mimeType: "image/png",
    },
  }));

  const result = await generateContentWithFallback(
    [
      {
        text: `These are screenshots of a freelancer's portfolio website. Extract ALL visible text content including: name, bio, skills, services, projects, experience, and any professional information. Return the raw extracted text only, no formatting.`,
      },
      ...imageParts,
    ],
    "screenshot extraction",
  );

  screenshotPaths.forEach((p) => fs.unlink(p, () => {}));

  const extractedText = result.response.text().trim();
  if (extractedText.length < 80)
    throw new Error("Screenshot extraction returned too little");
  // These are full-viewport screenshots, not individual content images, so
  // we don't surface them as portfolio gallery images — tryGetImagesOnly()
  // gets a shot at finding real <img>/<a> tags separately in scrapeUrl().
  return { text: extractedText.slice(0, 15000), images: [], links: [] };
}

async function scrapeWithCheerio(url) {
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
  const images = extractImagesFromHtml($, url);
  const links = extractLinksFromHtml($, url);
  $("script,style,nav,footer,head,iframe,noscript").remove();
  const chunks = [];
  $("h1,h2,h3,h4,p,li,span,div,section,article").each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 15) chunks.push(t);
  });
  const text = [...new Set(chunks)].join("\n");
  if (text.trim().length < 80)
    throw new Error("Cheerio returned too little content");
  return { text: text.slice(0, 15000), images, links };
}

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
      const { text, images, links } = await fn();
      console.log(
        `[Scraper] ✅ ${name} succeeded (${images.length} images, ${links.length} links found)`,
      );
      let finalImages = images;
      let finalLinks = links;
      if (
        (finalImages.length === 0 || finalLinks.length === 0) &&
        name !== "Cheerio"
      ) {
        const recovered = await tryGetImagesOnly(url);
        if (finalImages.length === 0 && recovered.images.length > 0) {
          finalImages = recovered.images;
          console.log(
            `[Scraper] Recovered ${finalImages.length} images via fallback fetch`,
          );
        }
        if (finalLinks.length === 0 && recovered.links.length > 0) {
          finalLinks = recovered.links;
          console.log(
            `[Scraper] Recovered ${finalLinks.length} links via fallback fetch`,
          );
        }
      }
      return { text, images: finalImages, links: finalLinks };
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

// ─────────────────────────────────────────────
// GEMINI PROMPT
// confidence_score here is purely an extraction-quality signal (did Gemini
// successfully parse the content?). It is NOT shown to users and is NOT
// used for ranking. portfolio_score (computed separately) handles that.
//
// IMAGE/LINK ASSIGNMENT POLICY (enforced via prompt):
// Gemini must assign every extracted image AND every extracted link to a
// project where possible. gallery is a true last resort for images only —
// there is no top-level "leftover links" bucket; an unmatched link is
// simply dropped rather than guessed at.
// ─────────────────────────────────────────────

const EXTRACTION_PROMPT = `
You are a professional portfolio analyst for a freelance marketplace.

Analyze the provided portfolio content (which may be a document, website text, or image) and extract structured professional information.

STRICT RULES:
- Remove ALL personal contact information: emails, phone numbers, WhatsApp, Telegram, and personal social profile handles/URLs (e.g. linkedin.com/in/..., a bare twitter/x.com/@handle, a bare github.com/username with no repo). Replace with nothing — do not include them anywhere in your output.
- However, PROJECT-SPECIFIC links (a GitHub repo URL like github.com/user/repo, a live demo/site URL, a case-study page, a Behance/Dribbble shot link) are NOT contact info — these should be KEPT and attached to the relevant project's "link" field. Do not redact these.
- If a project clearly has no associated link anywhere in the source content, set "link" to null. Never invent a URL.
- Return ONLY valid JSON. No markdown, no backticks, no explanation, no extra text.
- If you cannot determine a field, use null or an empty array.
- Keep all text professional and concise.
- For "experience", return a number (years). If not stated, estimate from project history or return null.
- For "industries", infer from the projects and services (e.g. "Fintech", "E-Commerce", "Healthcare", "Media").
- For "confidence_score", return a number between 0 and 1 indicating ONLY how reliably you could extract
  information from this source (1 = clear, well-structured content you could read perfectly;
  0 = garbled, unreadable, or almost no content). This is an internal extraction-quality flag,
  NOT a measure of how good the portfolio is.

IMAGE ASSIGNMENT RULES (critical — read carefully):
- If a list of "EXTRACTED IMAGES" is included below the portfolio content, you MUST assign every
  image to a project. Use the "Nearby text" hint for each image to find the best-matching project
  by name, description, or technology — even a loose keyword match is enough.
- If one image could plausibly belong to multiple projects, assign it to whichever project's name
  or description is the closest match. Never leave an image unassigned just because you are unsure.
- Only place an image in the top-level "gallery" array if it is genuinely impossible to link it to
  any project — for example: a headshot portrait, a personal logo/branding graphic, or a skills-icons
  grid that contains no project name or context whatsoever. THIS SHOULD BE RARE.
- Only ever use the literal URLs given to you in the EXTRACTED IMAGES list. Never invent or guess a URL.
- If no images were provided, return empty arrays for all "images" fields and for "gallery".

LINK ASSIGNMENT RULES (critical — read carefully):
- If a list of "EXTRACTED LINKS" is included below the portfolio content, match each link to the
  project it belongs to using the "Nearby text" hint (link text, button label, or nearby heading) —
  match by project name, keyword, or technology, the same way you match images.
- Each project should get AT MOST one "link" — if multiple candidate links point to the same project
  (e.g. both a GitHub repo and a live demo), prefer the live/demo URL if it's clearly the primary one,
  otherwise prefer the GitHub/repo URL.
- If a link cannot be confidently matched to any specific project, do NOT attach it anywhere and do NOT
  invent a new field for it — just leave it out.
- Only ever use the literal URLs given to you in the EXTRACTED LINKS list. Never invent or guess a URL.
- If no links were provided, set every project's "link" to null.

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
      "outcomes": "Measurable result or impact",
      "link": "https://github.com/user/project",
      "images": []
    }
  ],
  "gallery": [],
  "confidence_score": 0.85
}
`;

function formatImageContext(images) {
  if (!images?.length) return "";
  const lines = images
    .map(
      (img, i) =>
        `${i + 1}. URL: ${img.url}\n   Nearby text: ${img.context || "(none)"}`,
    )
    .join("\n");
  return `\n\nEXTRACTED IMAGES (assign every image to a project using the nearby text as a hint — only use gallery as a last resort for images with zero project context):\n${lines}`;
}

function formatLinkContext(links) {
  if (!links?.length) return "";
  const lines = links
    .map(
      (link, i) =>
        `${i + 1}. URL: ${link.url}\n   Nearby text: ${link.context || "(none)"}`,
    )
    .join("\n");
  return `\n\nEXTRACTED LINKS (match each link to a project's "link" field using the nearby text as a hint — leave unmatched links out entirely, do not guess):\n${lines}`;
}

async function analyzeWithGemini(textContent, images = [], links = []) {
  const imageContext = formatImageContext(images);
  const linkContext = formatLinkContext(links);
  const result = await generateContentWithFallback(
    [
      EXTRACTION_PROMPT,
      `\n\nPORTFOLIO CONTENT:\n${textContent}${imageContext}${linkContext}`,
    ],
    "text extraction",
  );

  const raw = result.response.text().trim();
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const parsed = JSON.parse(cleaned);
  console.log(
    "[Gemini/text] extraction_confidence:",
    parsed.confidence_score,
    "| skills:",
    parsed.skills?.length,
    "| images supplied:",
    images.length,
    "| links supplied:",
    links.length,
    "| project images:",
    parsed.projects?.reduce((n, p) => n + (p.images?.length || 0), 0),
    "| project links matched:",
    parsed.projects?.reduce((n, p) => n + (p.link ? 1 : 0), 0),
    "| gallery images:",
    parsed.gallery?.length,
  );
  return parsed;
}

async function analyzeFileWithGemini(filePath, mimeType) {
  const filePart = fileToGeminiPart(filePath, mimeType);
  const result = await generateContentWithFallback(
    [{ text: EXTRACTION_PROMPT }, filePart],
    "file extraction",
  );

  const raw = result.response.text().trim();
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const parsed = JSON.parse(cleaned);
  console.log(
    "[Gemini/file] extraction_confidence:",
    parsed.confidence_score,
    "| headline:",
    parsed.headline,
    "| project links matched:",
    parsed.projects?.reduce((n, p) => n + (p.link ? 1 : 0), 0),
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
      `[Portfolio] Processing file: ${file.originalname} | MIME: ${file.mimetype}`,
    );
    try {
      let extracted;
      if (PDF_IMAGE_MIMES.has(file.mimetype)) {
        // NOTE: for PDFs/images, Gemini reads the file directly (inline
        // bytes) rather than us pre-extracting links/images from raw HTML —
        // there's no HTML to walk. Gemini can still surface a project "link"
        // here if the link text is visible in the PDF itself (e.g. a footer
        // URL under a project section); it just won't get an EXTRACTED LINKS
        // hint list the way scraped/DOCX sources do.
        extracted = await analyzeFileWithGemini(file.path, file.mimetype);

        // A standalone image upload (jpg/png/webp) usually *is* a portfolio
        // image itself — a project screenshot, work sample, etc. Keep it
        // instead of discarding it after analysis, and attach it to the
        // single project it was almost certainly illustrating.
        // (PDFs go through this same branch for the Gemini call, but we
        // don't attempt to pull individual embedded images back out of a
        // PDF here — that would need a PDF rasterizer like pdfjs-dist +
        // canvas, which isn't wired up in this project yet.)
        if (file.mimetype.startsWith("image/")) {
          try {
            const buffer = fs.readFileSync(file.path);
            const uploadedUrl = await uploadImageBuffer(
              buffer,
              file.mimetype,
              "portfolio/uploads",
            );
            if (extracted.projects?.length === 1) {
              extracted.projects[0].images = [
                ...(extracted.projects[0].images || []),
                uploadedUrl,
              ];
            } else {
              extracted.gallery = [...(extracted.gallery || []), uploadedUrl];
            }
          } catch (uploadErr) {
            console.warn(
              `[Portfolio] Failed to persist uploaded image "${file.originalname}":`,
              uploadErr.message,
            );
          }
        }
      } else if (DOCX_MIMES.has(file.mimetype)) {
        const result = await mammoth.extractRawText({ path: file.path });
        const clean = stripContactInfo(result.value);
        const { images, links } = await extractDocxImagesAndLinks(file.path);
        extracted = await analyzeWithGemini(clean, images, links);
      } else {
        const text = fs.readFileSync(file.path, "utf8");
        const clean = stripContactInfo(text);
        extracted = await analyzeWithGemini(clean);
      }
      allExtracted.push(extracted);
    } catch (fileErr) {
      console.error(
        `[Portfolio] Error processing "${file.originalname}":`,
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
      const {
        text: scrapedText,
        images: scrapedImages,
        links: scrapedLinks,
      } = await scrapeUrl(url);
      const clean = stripContactInfo(scrapedText);

      if (clean.trim().length < 80) {
        console.warn("[Portfolio] Content too short after cleaning, skipping.");
      } else {
        const extracted = await analyzeWithGemini(
          clean,
          scrapedImages,
          scrapedLinks,
        );
        // Only discard if Gemini genuinely couldn't read the source at all
        if (!extracted.confidence_score || extracted.confidence_score < 0.3) {
          console.warn(
            "[Portfolio] Extraction confidence too low, discarding:",
            extracted.confidence_score,
          );
        } else {
          allExtracted.push(extracted);
        }
      }
    } catch (urlErr) {
      console.error("[Portfolio] All strategies exhausted:", urlErr.message);
    }
  }

  if (allExtracted.length === 0) return null;

  // Merge all sources into a single object
  const merged = {
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
    gallery: [...new Set(allExtracted.flatMap((e) => e.gallery || []))],
    // Internal only — average extraction reliability across all sources
    _extraction_confidence:
      allExtracted.reduce((sum, e) => sum + (e.confidence_score || 0), 0) /
      allExtracted.length,
  };

  // The public-facing quality score: computed purely from content richness
  merged.portfolio_score = computePortfolioScore(merged);

  const projectImageCount = merged.projects.reduce(
    (n, p) => n + (p.images?.length || 0),
    0,
  );
  const projectLinkCount = merged.projects.reduce(
    (n, p) => n + (p.link ? 1 : 0),
    0,
  );
  console.log(
    `[Portfolio] extraction_confidence: ${merged._extraction_confidence.toFixed(2)} | portfolio_score: ${merged.portfolio_score} | project images: ${projectImageCount} | project links: ${projectLinkCount} | gallery images: ${merged.gallery.length}`,
  );

  return merged;
}

// ─────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────

export const analyzePortfolio = async (req, res, next) => {
  const { userId } = req.params;
  const { url } = req.body;
  const files = req.files || [];

  if (!url && files.length === 0)
    return next(createError(400, "Provide at least one file or a URL."));

  try {
    await User.findByIdAndUpdate(userId, {
      $set: { portfolio: { status: "processing" } },
    });

    const merged = await extractFromSources(files, url);

    if (!merged) {
      await User.findByIdAndUpdate(userId, {
        $set: { portfolio: { status: "failed" } },
      });
      return next(createError(500, "AI extraction failed for all sources."));
    }

    const portfolioObject = {
      status: "completed",
      analyzedAt: new Date(),
      headline: merged.headline,
      experience: merged.experience,
      skills: merged.skills,
      services: merged.services,
      industries: merged.industries,
      certifications: merged.certifications,
      projects: merged.projects,
      gallery: merged.gallery,
      portfolio_score: merged.portfolio_score, // used for ranking + grades
      // keep internal confidence out of the stored document to avoid confusion
    };

    await User.findByIdAndUpdate(
      userId,
      { $set: { portfolio: portfolioObject } },
      { new: true },
    );

    return res.status(200).json({
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

  if (!url && files.length === 0)
    return next(createError(400, "Provide at least one file or a URL."));

  try {
    const merged = await extractFromSources(files, url);

    if (!merged)
      return next(
        createError(
          500,
          "Could not read your portfolio. Please try a different file or URL.",
        ),
      );

    return res.status(200).json({
      message: "Portfolio read successfully.",
      portfolio: {
        headline: merged.headline,
        experience: merged.experience,
        skills: merged.skills,
        services: merged.services,
        industries: merged.industries,
        certifications: merged.certifications,
        projects: merged.projects,
        gallery: merged.gallery,
        portfolio_score: merged.portfolio_score,
      },
    });
  } catch (err) {
    console.error("[Portfolio/temp] Unexpected error:", err);
    next(err);
  }
};

export const applyPortfolioToProfile = async (req, res, next) => {
  const { userId } = req.params;

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
  try {
    await User.findByIdAndUpdate(userId, { $set: { portfolio: null } });
    return res.status(200).json({ message: "Portfolio cleared." });
  } catch (err) {
    console.error("[Portfolio] clearPortfolio error:", err);
    next(err);
  }
};

// GET /api/portfolio/top
// Returns highest-scoring freelancers ranked by portfolio_score (content
// richness), not extraction confidence. Grade labels derive from the same score.
export const getTopPortfolioUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      "portfolio.status": "completed",
      "portfolio.portfolio_score": { $gte: 0.5 },
      suspended: { $ne: true },   // ← exclude suspended users
    })
      .select("username img portfolio yearsOfExperience country")
      .sort({ "portfolio.portfolio_score": -1 })
      .limit(12)
      .lean();

    const usersWithExtras = await Promise.all(
      users.map(async (user) => {
        const gigCount = await Gig.countDocuments({
          userId: user._id.toString(),
        });
        return {
          ...user,
          gigCount,
          portfolio: {
            ...user.portfolio,
            grade: getPortfolioGrade(user.portfolio?.portfolio_score),
          },
        };
      }),
    );

    return res.status(200).json({ users: usersWithExtras });
  } catch (err) {
    console.error("[Portfolio] getTopPortfolioUsers error:", err);
    next(err);
  }
};
