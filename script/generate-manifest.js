#!/usr/bin/env node
/**
 * generate-manifest.js
 *
 * Scans the `events/` folder and writes `data/events.json` — the file the
 * website actually reads. This is the one command you run after adding or
 * changing an outing folder.
 *
 * FOLDER NAMING CONVENTION
 *   events/<Title>_<DD.MM.YYYY>/          e.g. events/5k marathon_01.09.2024/
 *   events/<Title>_<YYYY-MM-DD>/          also accepted
 *
 * INSIDE EACH FOLDER
 *   - One image is the cover/profile photo. Name it so its filename starts
 *     with "cover", "profile", or "display" (e.g. cover.jpg, profile_01.png).
 *     If none is found, the first image alphabetically is used instead.
 *   - README.md is optional — rendered as the outing's notes.
 *   - Everything else with an image/video extension is treated as gallery
 *     media automatically. No need to list files by hand.
 *
 * SAFE TO RE-RUN
 *   If data/events.json already exists, this script preserves any
 *   hand-edited "featured" flag (and a few other optional fields) for
 *   outings that still exist, and only recalculates paths from disk.
 *
 * USAGE
 *   node scripts/generate-manifest.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const EVENTS_DIR = path.join(ROOT, "events");
const OUTPUT_FILE = path.join(ROOT, "data", "events.json");

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
const VIDEO_EXTS = [".mp4", ".mov", ".webm", ".m4v"];
const COVER_HINTS = /^(cover|profile|display)/i;

// Fields a person might hand-edit in events.json that re-running this
// script should NOT clobber, as long as the outing's slug still exists.
const PRESERVE_FIELDS = ["featured", "title"];

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function toTitleCase(raw) {
  return raw
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function toSlug(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Parses "5k marathon_01.09.2024" or "5k-marathon_2024-09-01" into { title, date }. */
function parseFolderName(folderName) {
  const match = folderName.match(
    /^(.+?)_(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})$/
  );
  if (!match) return null;

  const [, rawTitle, rawDate] = match;
  let date = rawDate;

  if (rawDate.includes(".")) {
    const [dd, mm, yyyy] = rawDate.split(".");
    date = `${yyyy}-${mm}-${dd}`;
  }

  if (Number.isNaN(new Date(date).getTime())) return null;

  return { title: toTitleCase(rawTitle), date };
}

function classifyFiles(folderPath) {
  const files = fs.readdirSync(folderPath).filter((f) => !f.startsWith("."));
  const images = [];
  const videos = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (IMAGE_EXTS.includes(ext)) images.push(file);
    else if (VIDEO_EXTS.includes(ext)) videos.push(file);
  }

  images.sort();
  videos.sort();

  const coverFile = images.find((f) => COVER_HINTS.test(f)) || images[0] || null;
  const photos = images.filter((f) => f !== coverFile);

  return { cover: coverFile, photos, videos };
}

function loadExistingManifest() {
  if (!fs.existsSync(OUTPUT_FILE)) return new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    return new Map(raw.map((ev) => [ev.slug, ev]));
  } catch (e) {
    console.warn("⚠ Existing events.json couldn't be parsed — starting fresh.");
    return new Map();
  }
}

function run() {
  if (!fs.existsSync(EVENTS_DIR)) {
    fail(`No events/ folder found at ${EVENTS_DIR}`);
  }

  const existing = loadExistingManifest();
  const folders = fs
    .readdirSync(EVENTS_DIR)
    .filter((name) => fs.statSync(path.join(EVENTS_DIR, name)).isDirectory());

  if (!folders.length) {
    fail("events/ exists but has no outing folders inside it yet.");
  }

  const results = [];
  const usedSlugs = new Set();
  let skipped = 0;

  for (const folderName of folders) {
    const parsed = parseFolderName(folderName);
    if (!parsed) {
      console.warn(
        `⚠ Skipping "${folderName}" — doesn't match "<Title>_<DD.MM.YYYY>"`
      );
      skipped++;
      continue;
    }

    const folderPath = path.join(EVENTS_DIR, folderName);
    const { cover, photos, videos } = classifyFiles(folderPath);

    if (!cover) {
      console.warn(`⚠ Skipping "${folderName}" — no image files found for a cover.`);
      skipped++;
      continue;
    }

    let slug = toSlug(parsed.title);
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${toSlug(parsed.title)}-${n++}`;
    }
    usedSlugs.add(slug);

    const prior = existing.get(slug) || {};
    const entry = {
      slug,
      title: parsed.title,
      date: parsed.date,
      folder: `events/${folderName}`,
      cover,
      featured: false,
      photos,
      videos,
    };

    for (const field of PRESERVE_FIELDS) {
      if (prior[field] !== undefined) entry[field] = prior[field];
    }

    results.push(entry);
  }

  if (!results.length) {
    fail("No valid outing folders found — nothing to write.");
  }

  results.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2) + "\n");

  console.log(`\n✓ Wrote ${results.length} outing(s) to data/events.json`);
  if (skipped) console.log(`  (${skipped} folder(s) skipped — see warnings above)`);
  console.log("");
}

run();
