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
  detailCover: document.getElementById("detail-cover"),
  detailDate: document.getElementById("detail-date"),
  detailTitle: document.getElementById("detail-title"),
  detailReadme: document.getElementById("detail-readme"),
  mediaGrid: document.getElementById("media-grid"),
  mediaLabel: document.getElementById("detail-media-label"),
  lightbox: document.getElementById("lightbox"),
  lightboxContent: document.getElementById("lightbox-content"),
  lightboxClose: document.getElementById("lightbox-close"),
};

let EVENTS = [];

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
    els.trail.innerHTML = `<p class="loading-state">No outings logged yet — run the generator after adding your first one.</p>`;
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
  els.mediaGrid.innerHTML = media
    .map((file, i) => {
      const url = encodePath(`${ev.folder}/${file}`);
      if (isVideo(file)) {
        return `<button class="media-item is-video" data-url="${url}" data-type="video" aria-label="Play video, ${i + 1} of ${total}, from ${ev.title}"><video src="${url}" muted></video></button>`;
      }
      return `<button class="media-item" data-url="${url}" data-type="image" aria-label="View photo, ${i + 1} of ${total}, from ${ev.title}"><img src="${url}" alt="" loading="lazy"></button>`;
    })
    .join("");

  showView("detail");
  window.scrollTo(0, 0);
}

/** ---- Lightbox ---- */
let lightboxTrigger = null; // the thumbnail that opened the lightbox, so focus can return to it

document.addEventListener("click", (e) => {
  const item = e.target.closest(".media-item");
  if (!item) return;
  const { url, type } = item.dataset;
  const label = item.getAttribute("aria-label") || "";
  lightboxTrigger = item;
  els.lightboxContent.innerHTML =
    type === "video"
      ? `<video src="${url}" controls autoplay aria-label="${label}"></video>`
      : `<img src="${url}" alt="${label}">`;
  els.lightbox.hidden = false;
  // Move focus into the overlay so keyboard/screen-reader users land
  // somewhere sensible rather than staying "under" the now-hidden page.
  els.lightboxClose.focus();
});

function closeLightbox() {
  els.lightbox.hidden = true;
  els.lightboxContent.innerHTML = "";
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
  if (e.key === "Escape" && !els.lightbox.hidden) closeLightbox();
});

// Basic focus trap: while the lightbox is open, Tab should cycle only
// between elements inside it (the close button and, for videos, the
// native player controls) rather than escaping into the hidden page.
els.lightbox.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const focusable = els.lightbox.querySelectorAll(
    "button, video, [href], [tabindex]:not([tabindex='-1'])"
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
    renderTrail(EVENTS);
    document.title = "Ich gehe draußen — a log of going out";
    showView("home");
  }
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
