#!/usr/bin/env node
/**
 * generate-manifest.js
 *
 * Scans the `outing_data/excursion_details/` folder and writes
 * `outing_data/excursion_details_js.json` — the file the website actually
 * reads. This is the one command you run after adding or changing an
 * outing folder.
 *
 * FOLDER NAMING CONVENTION
 *   excursion_details/<Title>_<DD.MM.YYYY>/   e.g. .../5k marathon_01.09.2024/
 *   excursion_details/<Title>_<YYYY-MM-DD>/   also accepted (e.g. 5k-Marathon_2024-09-01)
 *
 * INSIDE EACH FOLDER
 *   - One image is the cover/profile photo. Name it so its filename starts
 *     with "cover", "profile", or "display" (e.g. cover.jpg, profile_01.png).
 *     If none is found, the first image alphabetically is used instead.
 *   - README.md is optional — rendered as the outing's notes. Put a line
 *     starting with "Location:" right after the title to give the outing
 *     a map pin, e.g.:
 *       # 5K Marathon
 *       Location: Schützenstraße 1A, 96450 Coburg-Ketschendorf
 *     A plain address is looked up automatically (OpenStreetMap/Nominatim,
 *     no API key needed). No Location line = no map pin, nothing breaks.
 *   - Everything else with an image/video extension is treated as gallery
 *     media automatically. No need to list files by hand.
 *
 * SAFE TO RE-RUN
 *   If excursion_details_js.json already exists, this script preserves any
 *   hand-edited "featured" flag (and a few other optional fields) for
 *   outings that still exist, and only recalculates paths from disk.
 *
 * USAGE
 *   node scripts/generate-manifest.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// These use path.join (OS-specific separators) because they're real
// filesystem paths Node reads from disk — fine on Windows or Mac/Linux.
const EVENTS_DIR = path.join(ROOT, "outing_data", "excursion_details");
const OUTPUT_FILE = path.join(ROOT, "outing_data", "excursion_details_js.json");

// This is the folder prefix written INTO the JSON, so the browser can use
// it directly as a URL. It must always use forward slashes, regardless of
// which OS generated it — a Windows backslash would break in the browser.
const WEB_FOLDER_PREFIX = "outing_data/excursion_details";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
const VIDEO_EXTS = [".mp4", ".mov", ".webm", ".m4v"];
const COVER_HINTS = /^(cover|profile|display)/i;

// Fields a person might hand-edit in excursion_details_js.json that re-running this
// script should NOT clobber, as long as the outing's slug still exists.
const PRESERVE_FIELDS = ["featured", "title"];

/**
 * Location resolution, two ways:
 *
 * 1. location.txt in the outing's folder — "lat,lng" or "lat,lng,Label".
 *    Still supported for backwards compatibility, and always wins if present.
 *
 * 2. A "Location: <address>" line right after the title in README.md, e.g.:
 *      # 5K Marathon
 *      Location: Schützenstraße 1A, 96450 Coburg-Ketschendorf
 *    A plain address is geocoded via OpenStreetMap's free Nominatim
 *    service. The resolved coordinates are cached in the manifest under
 *    "locationQuery" so re-running the script doesn't re-geocode an
 *    unchanged address every time (staying well within Nominatim's
 *    light-use policy).
 *
 * Either way, an outing with no location at all simply gets no map pin —
 * nothing fails.
 */

function parseLatLng(raw) {
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  const label = parts[2] || null;
  return label ? { lat, lng, label } : { lat, lng };
}

function readLocationFile(folderPath) {
  const file = path.join(folderPath, "location.txt");
  if (!fs.existsSync(file)) return null;
  const parsed = parseLatLng(fs.readFileSync(file, "utf8").trim());
  if (!parsed) {
    console.warn(`⚠ Ignoring malformed location.txt in "${path.basename(folderPath)}"`);
  }
  return parsed;
}

/** The first non-empty line after the title (line 1) in README.md, if it
 *  starts with "Location:" — otherwise null (no location line present). */
function extractLocationQuery(readmePath) {
  if (!fs.existsSync(readmePath)) return null;
  const lines = fs
    .readFileSync(readmePath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const candidate = lines[1];
  if (!candidate) return null;
  const match = candidate.match(/^location:\s*(.+)$/i);
  return match ? match[1].trim() : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Looks up an address via Nominatim (OpenStreetMap). Returns {lat,lng} or
 *  null if it couldn't be found — never throws, so one bad address can't
 *  crash the whole run. */
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      // Nominatim's usage policy requires a real User-Agent identifying
      // the application — this is a personal, low-volume script.
      headers: { "User-Agent": "IchGeheDraussen-manifest-generator/1.0 (personal project)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    return null;
  }
}

/** Resolves an outing's location, preferring location.txt, then a
 *  "Location:" line in README.md — geocoding it if needed, or reusing a
 *  cached result if the address text hasn't changed since last time. */
async function resolveLocation(folderPath, prior) {
  const fileLoc = readLocationFile(folderPath);
  if (fileLoc) return { location: fileLoc, locationQuery: null };

  const query = extractLocationQuery(path.join(folderPath, "README.md"));
  if (!query) return { location: undefined, locationQuery: undefined };

  const direct = parseLatLng(query);
  if (direct) return { location: direct, locationQuery: query };

  if (prior.locationQuery === query && prior.location) {
    return { location: prior.location, locationQuery: query };
  }

  console.log(`  → Looking up "${query}"…`);
  const geocoded = await geocodeAddress(query);
  await sleep(1100); // stay under Nominatim's 1-request-per-second policy

  if (!geocoded) {
    console.warn(`⚠ Could not find coordinates for "${query}" — no map pin for this outing.`);
    return { location: undefined, locationQuery: query };
  }
  return { location: { ...geocoded, label: query }, locationQuery: query };
}

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
    console.warn("⚠ Existing excursion_details_js.json couldn't be parsed — starting fresh.");
    return new Map();
  }
}

async function run() {
  if (!fs.existsSync(EVENTS_DIR)) {
    fail(`No excursion_details folder found at ${EVENTS_DIR}`);
  }

  const existing = loadExistingManifest();
  const folders = fs
    .readdirSync(EVENTS_DIR)
    .filter((name) => fs.statSync(path.join(EVENTS_DIR, name)).isDirectory());

  if (!folders.length) {
    fail("excursion_details/ exists but has no outing folders inside it yet.");
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
      folder: `${WEB_FOLDER_PREFIX}/${folderName}`,
      cover,
      featured: false,
      photos,
      videos,
    };

    // location.txt (if present) always wins; otherwise a "Location:" line
    // in README.md is geocoded (or reused from cache) — see resolveLocation.
    const { location, locationQuery } = await resolveLocation(folderPath, prior);
    if (location) entry.location = location;
    if (locationQuery) entry.locationQuery = locationQuery;

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

  console.log(`\n✓ Wrote ${results.length} outing(s) to outing_data/excursion_details_js.json`);
  if (skipped) console.log(`  (${skipped} folder(s) skipped — see warnings above)`);
  console.log("");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
