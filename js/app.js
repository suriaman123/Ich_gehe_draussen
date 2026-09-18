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
  trail: document.getElementById("trail"),
  featuredSection: document.getElementById("featured-section"),
  featuredTrack: document.getElementById("featured-track"),
  statCount: document.getElementById("stat-count"),
  statSince: document.getElementById("stat-since"),
  statLatest: document.getElementById("stat-latest"),
  backLink: document.getElementById("back-link"),
  logSearch: document.getElementById("log-search"),
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

function coverUrl(ev) {
  return encodePath(`${ev.folder}/${ev.cover}`);
}

function renderTrail(events) {
  if (!events.length) {
    els.trail.innerHTML = searchQuery
      ? `<p class="loading-state">No outings match "${searchQuery}".</p>`
      : `<p class="loading-state">No outings logged yet — run the generator after adding your first one.</p>`;
    return;
  }
  els.trail.innerHTML = "";
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
    els.trail.appendChild(node);
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

  els.detailCover.src = coverUrl(ev);
  els.detailCover.alt = ev.title;
  els.detailDate.textContent = formatDate(ev.date);
  els.detailTitle.textContent = ev.title;
  document.title = `${ev.title} — Ich gehe draußen`;

  els.detailReadme.innerHTML = "<p><em>Loading notes…</em></p>";
  try {
    const res = await fetch(encodePath(`${ev.folder}/README.md`));
    const md = res.ok ? await res.text() : "";
    els.detailReadme.innerHTML = md ? marked.parse(md) : "<p><em>No notes yet for this one.</em></p>";
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
    return { url, type, label };
  });

  els.mediaGrid.innerHTML = currentGallery
    .map(({ url, type, label }, i) => {
      if (type === "video") {
        return `<button class="media-item is-video" data-index="${i}" aria-label="Play ${label}"><video src="${url}" muted></video></button>`;
      }
      return `<button class="media-item" data-index="${i}" aria-label="View ${label}"><img src="${url}" alt="" loading="lazy"></button>`;
    })
    .join("");

  showView("detail");
  window.scrollTo(0, 0);
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
}

els.backLink.addEventListener("click", () => {
  window.location.hash = "#/";
});

/** ---- Search + view toggle for the Full log section ---- */
function getFilteredEvents() {
  if (!searchQuery) return EVENTS;
  const q = searchQuery.toLowerCase();
  return EVENTS.filter((ev) => ev.title.toLowerCase().includes(q));
}

els.logSearch.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderTrail(getFilteredEvents());
  if (viewMode === "map") renderMap(getFilteredEvents());
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

function renderMap(events) {
  const located = events.filter((ev) => ev.location);

  if (!located.length) {
    els.logMap.innerHTML = `<p class="map-empty-state">No outings have a location yet — add a location.txt to an outing's folder and re-run the generator.</p>`;
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

  const bounds = [];
  located.forEach((ev) => {
    const { lat, lng } = ev.location;
    bounds.push([lat, lng]);
    const marker = L.marker([lat, lng]);
    marker.bindPopup(
      `<a class="map-popup" href="#/event/${ev.slug}">
         <img src="${coverUrl(ev)}" alt="">
         <span class="trail-date">${formatDate(ev.date)}</span>
         <span class="trail-title">${ev.title}</span>
       </a>`
    );
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
  } else {
    renderStats(EVENTS);
    renderFeatured(EVENTS);
    renderTrail(getFilteredEvents());
    applyViewMode();
    document.title = "Ich gehe draußen — a log of going out";
    showView("home");
  }
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
