import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import Gig from "../models/gigModel.js";
import { v2 as cloudinary } from "cloudinary";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Multer ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only images and PDFs are allowed"));
  },
});

// ── Cloudinary upload ──
const uploadToCloudinary = async (filePath, mimetype) => {
  const resourceType = mimetype.startsWith("image/") ? "image" : "raw";
  const result = await cloudinary.uploader.upload(filePath, {
    folder: "gig-media",
    resource_type: resourceType,
  });
  return result.secure_url;
};

// ── Convert file to Gemini base64 part ──
const fileToGenerativePart = (filePath, mimeType) => ({
  inlineData: {
    data: fs.readFileSync(filePath).toString("base64"),
    mimeType,
  },
});

// ── Scrape a URL: pull page text + image URLs ──
const scrapeUrl = async (url) => {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    const $ = cheerio.load(html);

    // Pull visible text (strip scripts/styles)
    $("script, style, nav, footer, head").remove();
    const pageText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);

    // Pull image src values — prefer larger images (skip icons/tiny assets)
    const imageUrls = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && !src.startsWith("data:") && imageUrls.length < 10) {
        // Resolve relative URLs
        const absolute = src.startsWith("http") ? src : new URL(src, url).href;
        imageUrls.push(absolute);
      }
    });

    // Also grab og:image and twitter:image for hero shots
    const ogImage = $('meta[property="og:image"]').attr("content");
    const twitterImage = $('meta[name="twitter:image"]').attr("content");
    if (ogImage) imageUrls.unshift(ogImage);
    if (twitterImage && twitterImage !== ogImage) imageUrls.unshift(twitterImage);

    return { pageText, imageUrls: [...new Set(imageUrls)].slice(0, 8) };
  } catch (err) {
    console.error("scrapeUrl error:", err.message);
    return { pageText: "", imageUrls: [] };
  }
};

// ── Download an image URL to a temp file for Gemini ──
const downloadImageToTemp = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 Chrome/120",
      },
    });

    const contentType = response.headers["content-type"] || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const tempPath = `uploads/temp-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    fs.writeFileSync(tempPath, response.data);

    return { path: tempPath, mimetype: contentType.split(";")[0] };
  } catch {
    return null;
  }
};

// ── Core Gemini extraction ──
const extractWithGemini = async (files, url) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const parts = [];
  const tempFiles = []; // track downloaded images to clean up

  // Handle URL: scrape text + download images for Gemini
  if (url) {
    const { pageText, imageUrls } = await scrapeUrl(url);

    if (pageText) {
      parts.push({
        text: `The seller provided this URL: ${url}\n\nPage content scraped from the site:\n${pageText}`,
      });
    }

    // Download and inline up to 4 scraped images for Gemini to see
    for (const imgUrl of imageUrls.slice(0, 4)) {
      const downloaded = await downloadImageToTemp(imgUrl);
      if (downloaded) {
        tempFiles.push(downloaded.path);
        parts.push(fileToGenerativePart(downloaded.path, downloaded.mimetype));
      }
    }
  }

  // Handle uploaded files
  for (const file of files) {
    parts.push(fileToGenerativePart(file.path, file.mimetype));
  }

  parts.push({
    text: `
      You are helping a freelancer create a gig listing on a marketplace.
      Based on everything above (scraped site content, images, uploaded files),
      extract the following and return ONLY valid JSON, no markdown, no explanation:
      {
        "suggestedTitle": "...",
        "suggestedDescription": "...",
        "suggestedCategory": "...",
        "tags": ["...", "..."],
        "extractedSamples": [
          { "label": "Sample 1", "note": "what this sample shows" }
        ]
      }
    `,
  });

  try {
    const result = await model.generateContent(parts);
    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { error: "Could not parse Gemini response" };
  } finally {
    // Clean up downloaded temp images
    tempFiles.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
  }
};

// ──────────────────────────────────────────────
// POST /api/gigs/media/analyze-temp
// ──────────────────────────────────────────────
export const analyzeTempGigMedia = async (req, res) => {
  const files = req.files || [];
  const { url } = req.body;

  if (!files.length && !url) {
    return res.status(400).json({ message: "Provide at least one file or a URL." });
  }

  try {
    const uploadedUrls = await Promise.all(
      files.map((f) => uploadToCloudinary(f.path, f.mimetype)),
    );

    // Also grab scraped image URLs to offer as selectable samples
    let scrapedImageUrls = [];
    if (url) {
      const { imageUrls } = await scrapeUrl(url);
      scrapedImageUrls = imageUrls;
    }

    const extracted = await extractWithGemini(files, url);

    files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));

    return res.status(200).json({
      uploadedUrls,       // from uploaded files
      scrapedImageUrls,   // from the URL — seller picks which to keep
      extracted,          // AI: title, desc, category, tags
    });
  } catch (err) {
    files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    console.error("analyzeTempGigMedia error:", err);
    return res.status(500).json({ message: "Analysis failed.", error: err.message });
  }
};

// ──────────────────────────────────────────────
// POST /api/gigs/media/analyze/:gigId
// ──────────────────────────────────────────────
export const analyzeGigMedia = async (req, res) => {
  const { gigId } = req.params;
  const files = req.files || [];
  const { url } = req.body;

  try {
    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ message: "Gig not found." });
    if (gig.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not your gig." });

    const uploadedUrls = await Promise.all(
      files.map((f) => uploadToCloudinary(f.path, f.mimetype)),
    );

    const extracted = await extractWithGemini(files, url);

    gig.images = [...(gig.images || []), ...uploadedUrls];
    gig.aiExtracted = extracted;
    await gig.save();

    files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));

    return res.status(200).json({ gig, extracted });
  } catch (err) {
    files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    console.error("analyzeGigMedia error:", err);
    return res.status(500).json({ message: "Analysis failed.", error: err.message });
  }
};

// ──────────────────────────────────────────────
// POST /api/gigs/media/apply/:gigId
// ──────────────────────────────────────────────
export const applyMediaToGig = async (req, res) => {
  const { gigId } = req.params;
  const { approvedUrls } = req.body;

  if (!approvedUrls?.length) {
    return res.status(400).json({ message: "No URLs provided." });
  }

  try {
    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ message: "Gig not found." });
    if (gig.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not your gig." });

    gig.images = [...new Set([...(gig.images || []), ...approvedUrls])];
    await gig.save();

    return res.status(200).json({ message: "Media applied to gig.", gig });
  } catch (err) {
    console.error("applyMediaToGig error:", err);
    return res.status(500).json({ message: "Failed to apply media.", error: err.message });
  }
};

// ──────────────────────────────────────────────
// DELETE /api/gigs/media/:gigId
// ──────────────────────────────────────────────
export const clearGigMedia = async (req, res) => {
  const { gigId } = req.params;

  try {
    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ message: "Gig not found." });
    if (gig.userId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not your gig." });

    gig.images = [];
    gig.aiExtracted = null;
    await gig.save();

    return res.status(200).json({ message: "Gig media cleared.", gig });
  } catch (err) {
    console.error("clearGigMedia error:", err);
    return res.status(500).json({ message: "Failed to clear media.", error: err.message });
  }
};