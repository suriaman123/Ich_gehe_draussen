// app.js
// Loads outing_data/excursion_details_js.json, renders the homepage trail,
// and handles the hash-based router for individual outing detail pages
// (#/event/<slug>).

const DATA_URL = "outing_data/excursion_details_js.json";

/**
 * Outing folder names can contain spaces (e.g. "5k Marathon_01.09.2024"),
 * which browsers require to be percent-encoded in a URL. This wraps
 * encodeURI() so every path we build for fetch() or an <img>/<video> src
 * is safe, while leaving forward slashes intact.
 */
function encodePath(p) {
  return encodeURI(p);
}

const els = {
  home: document.getElementById("view-home"),
  detail: document.getElementById("view-detail"),
  empty: document.getElementById("view-empty"),
  archive: document.getElementById("view-archive"),
  archiveGrid: document.getElementById("archive-grid"),
  archiveSub: document.getElementById("archive-sub"),
  archiveBackLink: document.getElementById("archive-back-link"),
  archiveTools: document.getElementById("archive-tools"),
  archiveSearch: document.getElementById("archive-search"),
  archiveSearchClear: document.getElementById("archive-search-clear"),
  logTitle: document.getElementById("log-title"),
  yearMenu: document.getElementById("year-menu"),
  archiveYearMenu: document.getElementById("archive-year-menu"),
  randomBtn: document.getElementById("random-btn"),
  detailPager: document.getElementById("detail-pager"),
  trail: document.getElementById("trail"),
  featuredSection: document.getElementById("featured-section"),
  featuredTrack: document.getElementById("featured-track"),
  statCount: document.getElementById("stat-count"),
  statSince: document.getElementById("stat-since"),
  statLatest: document.getElementById("stat-latest"),
  backLink: document.getElementById("back-link"),
  logSearch: document.getElementById("log-search"),
  logSearchClear: document.getElementById("log-search-clear"),
  viewButtons: document.querySelectorAll(".view-btn"),
  logMap: document.getElementById("log-map"),
  detailCover: document.getElementById("detail-cover"),
  detailPlace: document.getElementById("detail-place"),
  detailDate: document.getElementById("detail-date"),
  detailTitle: document.getElementById("detail-title"),
  detailReadme: document.getElementById("detail-readme"),
  mediaGrid: document.getElementById("media-grid"),
  attachSection: document.getElementById("detail-attachments"),
  attachList: document.getElementById("attachment-list"),
  mediaLabel: document.getElementById("detail-media-label"),
  lightbox: document.getElementById("lightbox"),
  lightboxContent: document.getElementById("lightbox-content"),
  lightboxClose: document.getElementById("lightbox-close"),
  lightboxPrev: document.getElementById("lightbox-prev"),
  lightboxNext: document.getElementById("lightbox-next"),
  lightboxCounter: document.getElementById("lightbox-counter"),
  lightboxOriginal: document.getElementById("lightbox-original"),
  shareOpen: document.getElementById("share-open"),
  shareModal: document.getElementById("share-modal"),
  shareClose: document.getElementById("share-close"),
  sharePreview: document.getElementById("share-preview"),
  shareSave: document.getElementById("share-save"),
  shareCopy: document.getElementById("share-copy"),
  shareCopyLabel: document.getElementById("share-copy-label"),
};

let EVENTS = [];
let searchQuery = "";
let viewMode = "trail";
let yearFilter = ""; // "" = all years
let archiveQuery = "";
let archiveYear = "";

/** Formats an ISO date ("2024-09-01") as "01 SEP 2024" (or "01. SEP. 2024" in German). */
function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d
    .toLocaleDateString(getLocale(), { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

function isVideo(filename) {
  return /\.(mp4|mov|webm|m4v)$/i.test(filename);
}

/** Loads the outing manifest once and caches sorted results. */
async function loadEvents() {
  if (EVENTS.length) return EVENTS;
  const res = await fetch(encodePath(DATA_URL));
  if (!res.ok) throw new Error("Could not load excursion_details_js.json");
  const raw = await res.json();
  EVENTS = raw.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  return EVENTS;
}

/** Outings with "archived": true in the manifest live on the archive page
 *  only; everything else is "active" and shown on the main page. */
function activeEvents() {
  return EVENTS.filter((ev) => !ev.archived);
}
function archivedEvents() {
  return EVENTS.filter((ev) => ev.archived);
}

/** ---- Home view ---- */
function renderStats(events) {
  els.statCount.textContent = events.length;
  if (events.length) {
    const oldest = events[events.length - 1];
    const newest = events[0];
    els.statSince.textContent = formatDate(oldest.date);
    els.statLatest.textContent = newest.title;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** URL for an outing's image. With size "sm" / "md" and a thumbnail folder
 *  in the manifest (made by the generator), returns the small WebP version;
 *  otherwise the original file. */
function imageUrl(ev, file, size) {
  if (size && ev.thumbFolder && /\.(jpe?g|png|webp)$/i.test(file)) {
    return encodePath(`${ev.thumbFolder}/${file}.${size}.webp`);
  }
  return encodePath(`${ev.folder}/${file}`);
}

function coverUrl(ev) {
  return imageUrl(ev, ev.cover, "sm");
}

// If a thumbnail is missing (not generated or not pushed yet), quietly
// fall back to the original image instead of showing a broken picture.
const THUMB_RE = /\/outing_data\/thumbs\/(.+)\.(?:sm|md)\.webp$/;
document.addEventListener(
  "error",
  (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (img.classList.contains("video-poster")) {
      img.style.display = "none";
      return;
    }
    if (!THUMB_RE.test(img.src)) return;
    img.src = img.src.replace(THUMB_RE, "/outing_data/excursion_details/$1");
  },
  true
);

function renderTrail(events, target = els.trail) {
  if (!events.length) {
    const isArchive = target === els.archiveGrid;
    const q = isArchive ? archiveQuery : searchQuery;
    let msg;
    if (q) msg = t("no_match", { q: escapeHtml(q) });
    else if (isArchive && archiveYear) msg = t("none_archived_year", { year: escapeHtml(archiveYear) });
    else if (isArchive) msg = t("archive_empty");
    else if (yearFilter) msg = t("none_year", { year: escapeHtml(yearFilter) });
    else msg = t("none_yet");
    target.innerHTML = `<p class="loading-state">${msg}</p>`;
    return;
  }
  target.innerHTML = "";
  events.forEach((ev) => {
    const node = document.createElement("a");
    node.className = "trail-node";
    node.href = `#/event/${ev.slug}`;
    node.innerHTML = `
      <span class="trail-card">
        <span class="trail-date">${formatDate(ev.date)}</span>
        <span class="trail-title">${ev.title}</span>
      </span>
      <span class="trail-marker">
        <img src="${coverUrl(ev)}" alt="" loading="lazy">
      </span>
      <span class="trail-spacer" aria-hidden="true"></span>
    `;
    target.appendChild(node);
  });
}

/** Highlights only show featured outings from the current year; the rest
 *  stay in the full log. (When a new year starts, Highlights starts fresh.) */
function renderFeatured(events) {
  const thisYear = String(new Date().getFullYear());
  const featured = events.filter((ev) => ev.featured && ev.date.slice(0, 4) === thisYear);
  if (!featured.length) {
    els.featuredSection.hidden = true;
    return;
  }
  els.featuredSection.hidden = false;
  els.featuredTrack.innerHTML = featured
    .map(
      (ev) => `
      <a href="#/event/${ev.slug}" class="featured-card">
        <span class="featured-cover">
          <img src="${coverUrl(ev)}" alt="" loading="lazy">
        </span>
        <span class="featured-caption">
          <span class="trail-date">${formatDate(ev.date)}</span>
          <span class="trail-title">${ev.title}</span>
        </span>
      </a>`
    )
    .join("");
  updateCarouselButtons();
}

/** ---- Featured carousel: arrow buttons + drag-to-scroll ---- */
const carouselPrev = document.getElementById("featured-prev");
const carouselNext = document.getElementById("featured-next");

function scrollAmount() {
  const card = els.featuredTrack.querySelector(".featured-card");
  return card ? card.getBoundingClientRect().width + 20 : 260;
}

function updateCarouselButtons() {
  const track = els.featuredTrack;
  const maxScroll = track.scrollWidth - track.clientWidth - 2;
  carouselPrev.disabled = track.scrollLeft <= 0;
  carouselNext.disabled = track.scrollLeft >= maxScroll;
}

carouselPrev.addEventListener("click", () => {
  els.featuredTrack.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
});
carouselNext.addEventListener("click", () => {
  els.featuredTrack.scrollBy({ left: scrollAmount(), behavior: "smooth" });
});
els.featuredTrack.addEventListener("scroll", () => updateCarouselButtons());
window.addEventListener("resize", () => updateCarouselButtons());

els.featuredTrack.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") els.featuredTrack.scrollBy({ left: scrollAmount(), behavior: "smooth" });
  if (e.key === "ArrowLeft") els.featuredTrack.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
});

// Drag-to-scroll with mouse/touch (pointer events cover both)
(function enableDragScroll(track) {
  let isDown = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;

  track.addEventListener("pointerdown", (e) => {
    isDown = true;
    moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    track.classList.add("is-dragging");
  });

  track.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    track.scrollLeft = startScroll - dx;
  });

  function endDrag() {
    isDown = false;
    track.classList.remove("is-dragging");
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointerleave", endDrag);

  // Prevent the click-through to a card if the user was actually dragging
  track.addEventListener(
    "click",
    (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
})(els.featuredTrack);

/** ---- Detail view ---- */
async function renderDetail(slug) {
  const ev = EVENTS.find((e) => e.slug === slug);
  if (!ev) {
    showView("empty");
    return;
  }

  currentEvent = ev;
  const fromArchive = !!ev.archived;
  els.backLink.innerHTML = `<span aria-hidden="true">←</span> ${t(fromArchive ? "back_archive" : "back_trail")}`;
  els.backLink.dataset.target = fromArchive ? "#/archive" : "#/";

  els.detailCover.src = imageUrl(ev, ev.cover, "md");
  els.detailCover.alt = ev.title;
  els.detailDate.textContent = formatDate(ev.date);
  els.detailTitle.textContent = ev.title;
  document.title = `${ev.title} — Ich gehe draußen`;

  els.detailReadme.innerHTML = `<p><em>${t("notes_loading")}</em></p>`;
  try {
    const res = await fetch(encodePath(`${ev.folder}/README.md`));
    const md = res.ok ? stripLocationLine(await res.text()).trim() : "";
    els.detailReadme.innerHTML = md ? marked.parse(md) : `<p><em>${t("notes_none")}</em></p>`;

    // Fix relative image paths inside the README
    els.detailReadme.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");

      if (src && !/^(https?:|data:|\/)/i.test(src)) {
        img.src = new URL(
          src,
          new URL(
            encodePath(`${ev.folder}/README.md`),
            document.baseURI
          )
        ).href;
      }
    });
  } catch (e) {
    els.detailReadme.innerHTML = `<p><em>${t("notes_error")}</em></p>`;
  }

  renderPlace(ev);
  renderAttachments(ev);

  const media = [...(ev.photos || []), ...(ev.videos || [])];
  els.mediaLabel.textContent = media.length ? t("moments") : "";
  const total = media.length;

  // Built once here and reused by the lightbox's prev/next navigation,
  // so opening any thumbnail knows the full ordered list it belongs to.
  currentGallery = media.map((file, i) => {
    const url = encodePath(`${ev.folder}/${file}`);
    const type = isVideo(file) ? "video" : "image";
    const label = t(type === "video" ? "video_label" : "photo_label", {
      i: i + 1,
      n: total,
      title: ev.title,
    });
    const thumb = type === "video" ? url : imageUrl(ev, file, "sm");
    // The lightbox shows the 1600px copy (~250 KB) instead of the multi-MB
    // original; the original stays one click away via "Open original".
    const view = type === "video" ? url : imageUrl(ev, file, "md");
    // Still frame made by the generator (needs ffmpeg), so the gallery doesn't
    // have to load the video itself just to show a tile.
    const poster =
      type === "video" && ev.videoPosters && ev.videoPosters[file]
        ? encodePath(ev.videoPosters[file])
        : null;
    return { url, thumb, view, type, label, poster };
  });

  els.mediaGrid.innerHTML = currentGallery
    .map(({ url, thumb, type, label, poster }, i) => {
      if (type === "video") {
        const inner = poster
          ? `<img class="video-poster" src="${poster}" alt="" loading="lazy" decoding="async">`
          : `<video src="${url}" muted preload="metadata"></video>`;
        return `<button class="media-item is-video" data-index="${i}" aria-label="${escapeHtml(t("play_item", { label }))}">${inner}</button>`;
      }
      return `<button class="media-item" data-index="${i}" aria-label="${escapeHtml(t("view_item", { label }))}"><img src="${thumb}" alt="" loading="lazy" decoding="async"></button>`;
    })
    .join("");

  renderPager(ev);
  showView("detail");
  window.scrollTo(0, 0);
}

/** Removes the "Location: …" line from the notes. The generator reads that
 *  line to place the map pin, and the page already shows the place under the
 *  title, so repeating it in the notes is noise. Only looked for in the first
 *  three non-empty lines (same rule as the generator), so a "Location:" later
 *  in your writing is left alone. */
function stripLocationLine(md) {
  const lines = md.split(/\r?\n/);
  let seen = 0;
  for (let i = 0; i < lines.length && seen < 3; i++) {
    if (!lines[i].trim()) continue;
    seen++;
    if (/^#{0,6}\s*location:\s*.+$/i.test(lines[i].trim())) {
      lines.splice(i, 1);
      break;
    }
  }
  return lines.join("\n");
}

/** Location line under the title: a pin, the place name, and a link that
 *  opens the spot on OpenStreetMap. Hidden when the outing has no location. */
function renderPlace(ev) {
  const text = placeText(ev);
  els.detailPlace.hidden = !text;
  if (!text) {
    els.detailPlace.innerHTML = "";
    return;
  }
  const pin = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`;
  if (ev.location) {
    const { lat, lng } = ev.location;
    const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
    els.detailPlace.innerHTML = `<a class="detail-place-link" href="${href}" target="_blank" rel="noopener" title="${escapeHtml(t("open_map"))}">${pin}<span>${escapeHtml(text)}</span><span class="visually-hidden">${t("opens_new_tab")}</span></a>`;
  } else {
    els.detailPlace.innerHTML = `<span class="detail-place-link">${pin}<span>${escapeHtml(text)}</span></span>`;
  }
}

/** "Attachments" section: PDF / text files that open in a new tab.
 *  Only shown for outings whose manifest entry has an `attachments` list. */
function renderAttachments(ev) {
  const files = ev.attachments || [];
  els.attachSection.hidden = !files.length;
  els.attachList.innerHTML = files
    .map((file) => {
      const ext = (file.split(".").pop() || "").toUpperCase();
      return `<li>
        <a class="attachment" href="${encodePath(`${ev.folder}/${file}`)}" target="_blank" rel="noopener">
          <svg class="attachment-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>
          </svg>
          <span class="attachment-name">${escapeHtml(file)}</span>
          <span class="attachment-type">${escapeHtml(ext)}</span>
          <span class="attachment-open" aria-hidden="true">↗</span>
          <span class="visually-hidden">${t("opens_new_tab")}</span>
        </a>
      </li>`;
    })
    .join("");
}

/** Older / newer links at the bottom of a detail page. Moves within the
 *  same collection (main trail or archive), newest-first order. */
function renderPager(ev) {
  const list = EVENTS.filter((e) => !!e.archived === !!ev.archived);
  const i = list.findIndex((e) => e.slug === ev.slug);
  const newer = i > 0 ? list[i - 1] : null;
  const older = i >= 0 ? list[i + 1] : null;
  const link = (e, cls, dir) =>
    e
      ? `<a class="pager-link ${cls}" href="#/event/${e.slug}">
          <span class="pager-dir">${dir}</span>
          <span class="pager-title">${escapeHtml(e.title)}</span>
          <span class="trail-date">${formatDate(e.date)}</span>
        </a>`
      : `<span></span>`;
  els.detailPager.hidden = !newer && !older;
  els.detailPager.innerHTML =
    link(older, "pager-older", t("pager_older")) + link(newer, "pager-newer", t("pager_newer"));
}

/** ---- Lightbox ---- */
let lightboxTrigger = null; // the thumbnail that opened the lightbox, so focus can return to it
let currentGallery = []; // the current outing's media, in display order
let currentIndex = -1; // index within currentGallery of what's showing now

function renderLightboxAt(index) {
  if (!currentGallery.length) return;
  // Wrap around at either end rather than dead-ending the arrows.
  currentIndex = (index + currentGallery.length) % currentGallery.length;
  const { url, view, type, label, poster } = currentGallery[currentIndex];

  els.lightboxContent.innerHTML =
    type === "video"
      ? `<video src="${url}" ${poster ? `poster="${poster}"` : ""} controls autoplay aria-label="${escapeHtml(label)}"></video>`
      : `<img src="${view}" alt="${escapeHtml(label)}">`;

  // "Open original" only when we're showing a smaller copy of it.
  const hasSmallerCopy = type === "image" && view !== url;
  els.lightboxOriginal.hidden = !hasSmallerCopy;
  if (hasSmallerCopy) els.lightboxOriginal.href = url;

  // Warm the cache for the neighbours so prev/next feels instant.
  [currentIndex - 1, currentIndex + 1].forEach((n) => {
    const g = currentGallery[(n + currentGallery.length) % currentGallery.length];
    if (g && g.type === "image") new Image().src = g.view;
  });

  els.lightboxCounter.textContent =
    currentGallery.length > 1 ? `${currentIndex + 1} / ${currentGallery.length}` : "";
  const showArrows = currentGallery.length > 1;
  els.lightboxPrev.hidden = !showArrows;
  els.lightboxNext.hidden = !showArrows;
}

document.addEventListener("click", (e) => {
  const item = e.target.closest(".media-item");
  if (!item) return;
  lightboxTrigger = item;
  els.lightbox.hidden = false;
  renderLightboxAt(Number(item.dataset.index));
  // Move focus into the overlay so keyboard/screen-reader users land
  // somewhere sensible rather than staying "under" the now-hidden page.
  els.lightboxClose.focus();
});

els.lightboxPrev.addEventListener("click", (e) => {
  e.stopPropagation();
  renderLightboxAt(currentIndex - 1);
});
els.lightboxNext.addEventListener("click", (e) => {
  e.stopPropagation();
  renderLightboxAt(currentIndex + 1);
});

function closeLightbox() {
  els.lightbox.hidden = true;
  els.lightboxOriginal.hidden = true;
  els.lightboxContent.innerHTML = "";
  currentIndex = -1;
  // Return focus to whatever thumbnail opened this, so keyboard users
  // don't lose their place in the media grid.
  if (lightboxTrigger) {
    lightboxTrigger.focus();
    lightboxTrigger = null;
  }
}
els.lightboxClose.addEventListener("click", closeLightbox);
els.lightbox.addEventListener("click", (e) => {
  if (e.target === els.lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (els.lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") renderLightboxAt(currentIndex + 1);
  if (e.key === "ArrowLeft") renderLightboxAt(currentIndex - 1);
});

// Basic focus trap: while the lightbox is open, Tab should cycle only
// between elements inside it (close/prev/next and, for videos, the
// native player controls) rather than escaping into the hidden page.
els.lightbox.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const focusable = els.lightbox.querySelectorAll(
    "button:not([hidden]), video, [href], [tabindex]:not([tabindex='-1'])"
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

/** ---- Share: Polaroid card + copy link ---- */
let currentEvent = null; // the outing whose detail page is showing
let shareTrigger = null; // the Share button, so focus can return to it
let shareBlobUrl = ""; // object URL of the generated image (preview + download)
let shareRun = 0; // lets us ignore a slow image if the popup was closed meanwhile

/** Link to the outing's own page. */
function outingLink(ev) {
  return `${window.location.origin}${window.location.pathname}#/event/${ev.slug}`;
}

/** The text for an outing's location (outing page + Polaroid), in this order:
 *  a "place" you typed by hand, an address from the README, the name looked
 *  up from the coordinates by the generator, neat coordinates, or nothing. */
function placeText(ev) {
  if (ev.place) return ev.place;
  const text = (ev.location && ev.location.label) || ev.locationQuery || "";
  const looksLikeCoords = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/.test(text);
  if (text && !looksLikeCoords) return text;
  if (ev.placeName) return ev.placeName;
  if (ev.location) {
    const { lat, lng } = ev.location;
    return `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? "N" : "S"} · ${Math.abs(lng).toFixed(3)}° ${lng >= 0 ? "E" : "W"}`;
  }
  return "";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}

function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text.replace(/…$/, "");
  while (s.length > 1 && ctx.measureText(s + "…").width > maxWidth) s = s.slice(0, -1);
  return s.trimEnd() + "…";
}

/** Splits text into at most `maxLines` lines that fit `maxWidth`. */
function wrapText(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] += "…";
  }
  return lines.map((l) => ellipsize(ctx, l, maxWidth));
}

/** Draws the outing as a Polaroid (cover photo, then title / date / place on
 *  the white strip) and returns it as a JPEG Blob. */
async function renderPolaroid(ev) {
  const W = 1200, H = 1500; // the saved picture
  const CW = 1000, CH = 1300; // the Polaroid card inside it
  const PAD = 55, PHOTO = CW - PAD * 2; // white border + square photo

  const css = getComputedStyle(document.documentElement);
  const displayFont = css.getPropertyValue("--font-display").trim() || "Georgia, serif";
  const monoFont = css.getPropertyValue("--font-mono").trim() || "monospace";
  // Make sure the site's fonts are ready before drawing text with them.
  await Promise.all([
    document.fonts.load(`600 60px ${displayFont}`),
    document.fonts.load(`500 28px ${monoFont}`),
  ]).catch(() => {});

  let img;
  try {
    img = await loadImage(imageUrl(ev, ev.cover, "md"));
  } catch (e) {
    img = await loadImage(imageUrl(ev, ev.cover)); // thumbnail missing: use the original
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Soft backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#efebe4");
  bg.addColorStop(1, "#e0dad0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // The card, tilted a touch like it was set down by hand
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.02);
  const x = -CW / 2, y = -CH / 2;

  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = "#fcfbf8";
  ctx.fillRect(x, y, CW, CH);
  ctx.shadowColor = "transparent";

  // Photo: cover-crop into the square
  const px = x + PAD, py = y + PAD;
  const scale = Math.max(PHOTO / img.width, PHOTO / img.height);
  const sw = PHOTO / scale, sh = PHOTO / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, px, py, PHOTO, PHOTO);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, PHOTO, PHOTO);

  // Caption strip: title, date, place — centred as one block
  const maxW = CW - PAD * 2 - 20;
  const stripTop = py + PHOTO;
  const stripH = y + CH - stripTop;
  const place = placeText(ev);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 60px ${displayFont}`;
  const titleLines = wrapText(ctx, ev.title, maxW, 2);
  const LINE = 68;
  const blockH = titleLines.length * LINE + 20 + 34 + (place ? 16 + 34 : 0);
  let cy = stripTop + (stripH - blockH) / 2 - 4;

  ctx.fillStyle = "#1d2b3a";
  titleLines.forEach((line, i) => ctx.fillText(line, 0, cy + i * LINE + LINE / 2));
  cy += titleLines.length * LINE + 20;

  ctx.font = `500 28px ${monoFont}`;
  ctx.fillStyle = "#6b6f76";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
  ctx.fillText(formatDate(ev.date), 0, cy + 17);
  cy += 34 + 16;

  if (place) {
    ctx.font = `500 26px ${monoFont}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.fillStyle = "#8a8e95";
    const text = ellipsize(ctx, place, maxW - 50);
    const textW = ctx.measureText(text).width;
    const iconW = 24, gap = 12;
    const startX = -(iconW + gap + textW) / 2;
    // little map pin
    ctx.save();
    ctx.translate(startX, cy + 17 - 17);
    ctx.scale(1.4, 1.4);
    ctx.strokeStyle = "#8a8e95";
    ctx.lineWidth = 1.8;
    ctx.stroke(new Path2D("M8.6 1.4a6 6 0 0 0-6 6c0 4.3 6 11.2 6 11.2s6-6.9 6-11.2a6 6 0 0 0-6-6z"));
    ctx.beginPath();
    ctx.arc(8.6, 7.4, 2.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.textAlign = "left";
    ctx.fillText(text, startX + iconW + gap, cy + 17);
  }
  ctx.restore();

  // Tiny signature on the backdrop
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 22px ${monoFont}`;
  ctx.fillStyle = "rgba(60, 50, 40, 0.5)";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
  ctx.fillText("ICH GEHE DRAUSSEN by Aman Suri", W / 2, H - 66);
  //ctx.font = `500 20px ${monoFont}`;
  //if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
  //ctx.fillText("by Aman Suri", W / 2, H - 34);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92)
  );
}

async function openShare(ev) {
  if (!ev) return;
  shareTrigger = document.activeElement;
  els.shareModal.hidden = false;
  els.shareClose.focus();
  els.shareSave.disabled = true;
  els.shareCopyLabel.textContent = t("share_copy");
  els.sharePreview.innerHTML = `<p class="share-status">${t("share_preparing")}</p>`;

  const run = ++shareRun;
  try {
    const blob = await renderPolaroid(ev);
    if (run !== shareRun) return; // popup was closed or reopened meanwhile
    if (shareBlobUrl) URL.revokeObjectURL(shareBlobUrl);
    shareBlobUrl = URL.createObjectURL(blob);
    els.sharePreview.innerHTML = `<img class="share-polaroid" src="${shareBlobUrl}" alt="${escapeHtml(t("share_alt", { title: ev.title }))}">`;
    els.shareSave.disabled = false;
  } catch (e) {
    if (run !== shareRun) return;
    els.sharePreview.innerHTML = `<p class="share-status">${t("share_error")}</p>`;
  }
}

function closeShare() {
  if (els.shareModal.hidden) return;
  shareRun++;
  els.shareModal.hidden = true;
  els.sharePreview.innerHTML = "";
  if (shareBlobUrl) URL.revokeObjectURL(shareBlobUrl);
  shareBlobUrl = "";
  if (shareTrigger) {
    shareTrigger.focus();
    shareTrigger = null;
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Older browsers / non-secure pages: fall back to a hidden text box.
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
    document.body.appendChild(box);
    box.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {}
    box.remove();
    return ok;
  }
}

els.shareOpen.addEventListener("click", () => openShare(currentEvent));
els.shareClose.addEventListener("click", closeShare);
els.shareModal.addEventListener("click", (e) => {
  if (e.target === els.shareModal) closeShare();
});

els.shareSave.addEventListener("click", () => {
  if (!shareBlobUrl || !currentEvent) return;
  const a = document.createElement("a");
  a.href = shareBlobUrl;
  a.download = `${currentEvent.slug}-polaroid.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

let copyTimer = null;
els.shareCopy.addEventListener("click", async () => {
  if (!currentEvent) return;
  const ok = await copyText(outingLink(currentEvent));
  if (!ok) return;
  els.shareCopyLabel.textContent = t("share_copied");
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (els.shareCopyLabel.textContent = t("share_copy")), 2000);
});

document.addEventListener("keydown", (e) => {
  if (els.shareModal.hidden) return;
  if (e.key === "Escape") closeShare();
  if (e.key === "Tab") {
    // keep Tab inside the popup
    const focusable = [...els.shareModal.querySelectorAll("button:not([disabled])")];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

/** ---- View switching + router ---- */
function showView(name) {
  els.home.hidden = name !== "home";
  els.detail.hidden = name !== "detail";
  els.empty.hidden = name !== "empty";
  els.archive.hidden = name !== "archive";
}

els.backLink.addEventListener("click", () => {
  window.location.hash = els.backLink.dataset.target || "#/";
});
els.archiveBackLink.addEventListener("click", () => {
  window.location.hash = "#/";
});

/** ---- Search + view toggle for the Full log section ---- */

/** Text a search should be able to match for a given outing: title plus
 *  any location text we have, whether or not it successfully geocoded. */
function searchableText(ev) {
  const parts = [ev.title, ev.locationQuery, ev.location && ev.location.label];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function getFilteredEvents() {
  let list = activeEvents();
  if (yearFilter) list = list.filter((ev) => ev.date.slice(0, 4) === yearFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter((ev) => searchableText(ev).includes(q));
  }
  return list;
}

/** Reusable year dropdown (small calendar button + menu). `root` is the
 *  .year-menu element; `onPick(year)` runs when a choice is made ("" = all).
 *  render(events) rebuilds the list from the years in `events` and returns
 *  the current selection (reset to "" if that year no longer exists). */
function createYearMenu(root, onPick) {
  const btn = root.querySelector(".year-menu-btn");
  const list = root.querySelector(".year-menu-list");
  let current = "";

  function sync() {
    btn.classList.toggle("is-active", !!current);
    list.querySelectorAll(".year-menu-item").forEach((b) =>
      b.setAttribute("aria-checked", String(b.dataset.year === current))
    );
  }

  function open(isOpen) {
    list.hidden = !isOpen;
    btn.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      const target =
        list.querySelector('[aria-checked="true"]') || list.querySelector(".year-menu-item");
      if (target) target.focus();
    }
  }

  btn.addEventListener("click", () => open(list.hidden));

  list.addEventListener("click", (e) => {
    const item = e.target.closest(".year-menu-item");
    if (!item) return;
    current = item.dataset.year;
    sync();
    open(false);
    btn.focus();
    onPick(current);
  });

  // Close when clicking elsewhere, or on Escape; arrow keys move through items.
  document.addEventListener("click", (e) => {
    if (!list.hidden && !root.contains(e.target)) open(false);
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !list.hidden) {
      open(false);
      btn.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (list.hidden) {
      open(true);
      return;
    }
    const items = [...list.querySelectorAll(".year-menu-item")];
    const i = items.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : i <= 0 ? items.length - 1 : i - 1;
    items[next].focus();
  });

  return {
    render(events) {
      const years = [...new Set(events.map((ev) => ev.date.slice(0, 4)))].sort((a, b) => b - a);
      if (current && !years.includes(current)) current = "";
      root.hidden = !years.length;
      list.innerHTML = ["", ...years]
        .map(
          (y) =>
            `<li role="none"><button type="button" role="menuitemradio" class="year-menu-item" data-year="${y}" aria-checked="false">${y || t("all_years")}</button></li>`
        )
        .join("");
      open(false);
      sync();
      return current;
    },
  };
}

/** Main page: the menu after "Full log". Picking a year turns the title
 *  into "<year> log"; "All years" turns it back. */
const mainYearMenu = createYearMenu(els.yearMenu, (year) => {
  yearFilter = year;
  updateLogTitle();
  renderTrail(getFilteredEvents());
  if (viewMode === "map") renderMap(getFilteredEvents());
});

function updateLogTitle() {
  els.logTitle.textContent = yearFilter ? t("year_log", { year: yearFilter }) : t("full_log");
}

function renderYearMenu(events) {
  yearFilter = mainYearMenu.render(events);
  updateLogTitle();
}

/** Archive page: the same menu, after the search box. */
const archiveYearMenu = createYearMenu(els.archiveYearMenu, (year) => {
  archiveYear = year;
  renderArchive();
});

/** Random outing: picks any outing on the main trail (not the archive). */
els.randomBtn.addEventListener("click", () => {
  const pool = activeEvents();
  if (!pool.length) return;
  const ev = pool[Math.floor(Math.random() * pool.length)];
  window.location.hash = `#/event/${ev.slug}`;
});

/** Archive page: search + grid. */
function renderArchive() {
  const all = archivedEvents();
  const q = archiveQuery.toLowerCase();
  let list = all;
  if (archiveYear) list = list.filter((ev) => ev.date.slice(0, 4) === archiveYear);
  if (q) list = list.filter((ev) => searchableText(ev).includes(q));
  renderTrail(list, els.archiveGrid);
  els.archiveTools.hidden = !all.length;
  els.archiveSearchClear.hidden = !els.archiveSearch.value;
  els.archiveSub.textContent = !all.length
    ? ""
    : q || archiveYear
      ? t("archive_count_filtered", { n: list.length, total: all.length })
      : all.length === 1
        ? t("archive_count_one")
        : t("archive_count_many", { n: all.length });
}

els.archiveSearch.addEventListener("input", (e) => {
  archiveQuery = e.target.value.trim();
  renderArchive();
});
els.archiveSearchClear.addEventListener("click", () => {
  archiveQuery = "";
  els.archiveSearch.value = "";
  renderArchive();
  els.archiveSearch.focus();
});

function updateSearchClearButton() {
  els.logSearchClear.hidden = !searchQuery;
}

els.logSearch.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  updateSearchClearButton();
  renderTrail(getFilteredEvents());
  if (viewMode === "map") renderMap(getFilteredEvents());
});

els.logSearchClear.addEventListener("click", () => {
  searchQuery = "";
  els.logSearch.value = "";
  updateSearchClearButton();
  renderTrail(getFilteredEvents());
  if (viewMode === "map") renderMap(getFilteredEvents());
  els.logSearch.focus();
});

function applyViewMode() {
  els.trail.hidden = viewMode === "map";
  els.logMap.hidden = viewMode !== "map";
  els.trail.classList.toggle("is-grid", viewMode === "grid");
  if (viewMode === "map") renderMap(getFilteredEvents());
}

els.viewButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    viewMode = btn.dataset.view;
    els.viewButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    applyViewMode();
  });
});

/** ---- Map view (Leaflet + OpenStreetMap tiles) ---- */
let leafletMap = null;
let leafletMarkerLayer = null;

/** Groups outings by (rounded) coordinates, so multiple outings at the
 *  same spot share one marker instead of stacking invisibly on top of
 *  each other — Leaflet only shows/click-through the last marker added
 *  at an identical position otherwise. */
function groupByLocation(events) {
  const groups = new Map();
  events.forEach((ev) => {
    if (!ev.location) return;
    const key = `${ev.location.lat.toFixed(5)},${ev.location.lng.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ev);
  });
  return groups;
}

function popupHtmlFor(group) {
  if (group.length === 1) {
    const ev = group[0];
    return `<a class="map-popup" href="#/event/${ev.slug}">
      <img src="${coverUrl(ev)}" alt="">
      <span class="trail-date">${formatDate(ev.date)}</span>
      <span class="trail-title">${ev.title}</span>
    </a>`;
  }
  // Several outings at one pin: compact rows (small thumbnail + text) in a
  // scrollable list, so all of them are reachable however many there are.
  const items = group
    .map(
      (ev) => `<li><a class="map-popup-row" href="#/event/${ev.slug}">
        <img src="${coverUrl(ev)}" alt="" loading="lazy">
        <span class="map-popup-text">
          <span class="trail-date">${formatDate(ev.date)}</span>
          <span class="trail-title">${ev.title}</span>
        </span>
      </a></li>`
    )
    .join("");
  return `<span class="map-popup-count">${t("map_count", { n: group.length })}</span><ul class="map-popup-list">${items}</ul>`;
}

function renderMap(events) {
  const located = events.filter((ev) => ev.location);

  if (!located.length) {
    els.logMap.innerHTML = `<p class="map-empty-state">${t("map_empty")}</p>`;
    leafletMap = null; // the container was just replaced with plain text; force re-init next time
    return;
  }

  // The map only needs to be constructed once; after that we just clear
  // and re-add markers. Leaflet requires the container to already be
  // visible in the DOM at init time, which it is by the time this runs
  // (applyViewMode un-hides #log-map before calling this).
  if (!leafletMap) {
    els.logMap.innerHTML = "";
    leafletMap = L.map(els.logMap, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(leafletMap);
    leafletMarkerLayer = L.layerGroup().addTo(leafletMap);
  } else {
    leafletMarkerLayer.clearLayers();
  }

  const groups = groupByLocation(located);
  const bounds = [];

  groups.forEach((group) => {
    const { lat, lng } = group[0].location;
    bounds.push([lat, lng]);
    const marker = L.marker([lat, lng]);
    marker.bindPopup(popupHtmlFor(group), { minWidth: group.length > 1 ? 260 : 150 });
    // Let the list scroll (mouse wheel and touch) without zooming or
    // dragging the map underneath it.
    marker.on("popupopen", (e) => {
      const list = e.popup.getElement().querySelector(".map-popup-list");
      if (list) {
        L.DomEvent.disableScrollPropagation(list);
        L.DomEvent.disableClickPropagation(list);
      }
    });
    marker.addTo(leafletMarkerLayer);
  });

  leafletMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
  // The map was just un-hidden, and Leaflet miscalculates its own size
  // if it initializes (or was last touched) while its container had
  // display:none — this forces it to recheck now that it's visible.
  requestAnimationFrame(() => leafletMap.invalidateSize());
}

async function route() {
  closeShare();
  const hash = window.location.hash;
  const match = hash.match(/^#\/event\/(.+)$/);

  await loadEvents().catch(() => {
    els.trail.innerHTML = `<p class="empty-state">${t("load_error")}</p>`;
  });

  if (match) {
    await renderDetail(decodeURIComponent(match[1]));
  } else if (hash === "#/archive") {
    els.archiveSearch.value = archiveQuery;
    archiveYear = archiveYearMenu.render(archivedEvents());
    renderArchive();
    document.title = t("title_archive");
    showView("archive");
    window.scrollTo(0, 0);
  } else {
    const active = activeEvents();
    renderStats(active);
    renderFeatured(active);
    renderYearMenu(active);
    renderTrail(getFilteredEvents());
    applyViewMode();
    document.title = t("title_home");
    showView("home");
  }
}

// Switching language re-renders the current page in place (keeping the scroll position).
window.onLanguageChange = async () => {
  if (!els.lightbox.hidden) closeLightbox();
  const y = window.scrollY;
  await route();
  window.scrollTo(0, y);
};

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
