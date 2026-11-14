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
  detailDate: document.getElementById("detail-date"),
  detailTitle: document.getElementById("detail-title"),
  detailReadme: document.getElementById("detail-readme"),
  mediaGrid: document.getElementById("media-grid"),
  mediaLabel: document.getElementById("detail-media-label"),
  lightbox: document.getElementById("lightbox"),
  lightboxContent: document.getElementById("lightbox-content"),
  lightboxClose: document.getElementById("lightbox-close"),
  lightboxPrev: document.getElementById("lightbox-prev"),
  lightboxNext: document.getElementById("lightbox-next"),
  lightboxCounter: document.getElementById("lightbox-counter"),
};

let EVENTS = [];
let searchQuery = "";
let viewMode = "trail";
let yearFilter = ""; // "" = all years
let archiveQuery = "";
let archiveYear = "";

/** Formats an ISO date ("2024-09-01") as "01 SEP 2024". */
function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
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
    if (!(img instanceof HTMLImageElement) || !THUMB_RE.test(img.src)) return;
    img.src = img.src.replace(THUMB_RE, "/outing_data/excursion_details/$1");
  },
  true
);

function renderTrail(events, target = els.trail) {
  if (!events.length) {
    const isArchive = target === els.archiveGrid;
    const q = isArchive ? archiveQuery : searchQuery;
    let msg;
    if (q) msg = `No outings match "${escapeHtml(q)}".`;
    else if (isArchive && archiveYear) msg = `Nothing archived in ${escapeHtml(archiveYear)}.`;
    else if (isArchive) msg = `Nothing in the archive yet — set "archived": true on an outing in excursion_details_js.json.`;
    else if (yearFilter) msg = `No outings logged in ${escapeHtml(yearFilter)}.`;
    else msg = `No outings logged yet — run the generator after adding your first one.`;
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

function renderFeatured(events) {
  const featured = events.filter((ev) => ev.featured);
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

  const fromArchive = !!ev.archived;
  els.backLink.innerHTML = fromArchive
    ? '<span aria-hidden="true">←</span> Back to the archive'
    : '<span aria-hidden="true">←</span> Back to the trail';
  els.backLink.dataset.target = fromArchive ? "#/archive" : "#/";

  els.detailCover.src = imageUrl(ev, ev.cover, "md");
  els.detailCover.alt = ev.title;
  els.detailDate.textContent = formatDate(ev.date);
  els.detailTitle.textContent = ev.title;
  document.title = `${ev.title} — Ich gehe draußen`;

  els.detailReadme.innerHTML = "<p><em>Loading notes…</em></p>";
  try {
    const res = await fetch(encodePath(`${ev.folder}/README.md`));
    const md = res.ok ? await res.text() : "";
    // els.detailReadme.innerHTML = md ? marked.parse(md) : "<p><em>No notes yet for this one.</em></p>";
    els.detailReadme.innerHTML = md ? marked.parse(md) : "<p><em>No notes yet for this one.</em></p>";

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
    els.detailReadme.innerHTML = "<p><em>Notes couldn't be loaded.</em></p>";
  }

  const media = [...(ev.photos || []), ...(ev.videos || [])];
  els.mediaLabel.textContent = media.length ? "Moments" : "";
  const total = media.length;

  // Built once here and reused by the lightbox's prev/next navigation,
  // so opening any thumbnail knows the full ordered list it belongs to.
  currentGallery = media.map((file, i) => {
    const url = encodePath(`${ev.folder}/${file}`);
    const type = isVideo(file) ? "video" : "image";
    const label =
      type === "video"
        ? `Video, ${i + 1} of ${total}, from ${ev.title}`
        : `Photo, ${i + 1} of ${total}, from ${ev.title}`;
    const thumb = type === "video" ? url : imageUrl(ev, file, "sm");
    return { url, thumb, type, label };
  });

  els.mediaGrid.innerHTML = currentGallery
    .map(({ url, thumb, type, label }, i) => {
      if (type === "video") {
        return `<button class="media-item is-video" data-index="${i}" aria-label="Play ${label}"><video src="${url}" muted preload="metadata"></video></button>`;
      }
      return `<button class="media-item" data-index="${i}" aria-label="View ${label}"><img src="${thumb}" alt="" loading="lazy" decoding="async"></button>`;
    })
    .join("");

  renderPager(ev);
  showView("detail");
  window.scrollTo(0, 0);
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
    link(older, "pager-older", "← Older") + link(newer, "pager-newer", "Newer →");
}

/** ---- Lightbox ---- */
let lightboxTrigger = null; // the thumbnail that opened the lightbox, so focus can return to it
let currentGallery = []; // the current outing's media, in display order
let currentIndex = -1; // index within currentGallery of what's showing now

function renderLightboxAt(index) {
  if (!currentGallery.length) return;
  // Wrap around at either end rather than dead-ending the arrows.
  currentIndex = (index + currentGallery.length) % currentGallery.length;
  const { url, type, label } = currentGallery[currentIndex];

  els.lightboxContent.innerHTML =
    type === "video"
      ? `<video src="${url}" controls autoplay aria-label="${label}"></video>`
      : `<img src="${url}" alt="${label}">`;

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
            `<li role="none"><button type="button" role="menuitemradio" class="year-menu-item" data-year="${y}" aria-checked="false">${y || "All years"}</button></li>`
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
  els.logTitle.textContent = yearFilter ? `${yearFilter} log` : "Full log";
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
      ? `${list.length} of ${all.length} archived outings.`
      : `${all.length} outing${all.length === 1 ? "" : "s"} tucked away from the main trail.`;
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
  return `<span class="map-popup-count">${group.length} outings here · scroll for more</span><ul class="map-popup-list">${items}</ul>`;
}

function renderMap(events) {
  const located = events.filter((ev) => ev.location);

  if (!located.length) {
    els.logMap.innerHTML = `<p class="map-empty-state">No outings have a location yet — add a "Location:" line under the title in an outing's README.md and re-run the generator.</p>`;
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
  const hash = window.location.hash;
  const match = hash.match(/^#\/event\/(.+)$/);

  await loadEvents().catch(() => {
    els.trail.innerHTML = `<p class="empty-state">Couldn't load the log. Check that outing_data/excursion_details_js.json exists.</p>`;
  });

  if (match) {
    renderDetail(decodeURIComponent(match[1]));
  } else if (hash === "#/archive") {
    els.archiveSearch.value = archiveQuery;
    archiveYear = archiveYearMenu.render(archivedEvents());
    renderArchive();
    document.title = "Archive — Ich gehe draußen";
    showView("archive");
    window.scrollTo(0, 0);
  } else {
    const active = activeEvents();
    renderStats(active);
    renderFeatured(active);
    renderYearMenu(active);
    renderTrail(getFilteredEvents());
    applyViewMode();
    document.title = "Ich gehe draußen — a log of going out";
    showView("home");
  }
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
