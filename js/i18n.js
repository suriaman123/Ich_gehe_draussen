// i18n.js
// English / German interface text. Only the site's own labels are translated —
// outing titles, README notes and file names stay exactly as you wrote them.
//
// HOW IT WORKS
//   - Static text in index.html carries data-i18n="key" (the element's text)
//     or data-i18n-attr="aria-label:key; title:key2" (attributes).
//   - Text built by app.js calls t("key", { name: value }) instead.
//   - The chosen language is remembered in localStorage; the first visit
//     follows the browser's language (German browsers get German).
//
// TO ADD OR CHANGE A STRING: edit it in BOTH `en` and `de` below.
// TO ADD A LANGUAGE: add another block, a LOCALES entry, and a button in the header.

(function () {
  const STORAGE_KEY = "amanoutside-lang";

  const LOCALES = { en: "en-GB", de: "de-DE" }; // for date formatting

  const STRINGS = {
    en: {
      meta_desc: "A log of getting outside — outings, photos, and notes from the trail.",
      title_home: "Ich gehe draußen — a log of going out",
      title_archive: "Archive — Ich gehe draußen",
      skip_link: "Skip to content",

      theme_group: "Choose a visual theme",
      theme_signal: "Signal theme (dark)",
      theme_editorial: "Editorial theme (light)",
      theme_adventure: "Adventure theme (warm)",
      lang_group: "Language",

      hero_eyebrow: "a practice of leaving the house",
      hero_title: "The Trail",
      hero_sub: "Every outing, logged. Photos, notes, and the occasional video — arranged in the order they happened.",
      stat_outings: "Outings",
      stat_since: "Since",
      stat_latest: "Latest",

      highlights: "Highlights",
      highlight_prev: "Previous highlight",
      highlight_next: "Next highlight",
      highlight_track: "Highlighted outings, scrollable",

      full_log: "Full log",
      year_log: "{year} log",
      filter_year_log: "Filter the log by year",
      filter_year_archive: "Filter the archive by year",
      filter_year_title: "Filter by year",
      years: "Years",
      all_years: "All years",
      search_placeholder: "Search outings…",
      search_aria: "Search outings by title or location",
      search_clear: "Clear search",
      view_group: "Choose how the log is displayed",
      view_trail: "Trail",
      view_grid: "Grid",
      view_map: "Map",
      random_aria: "Open a random outing",
      random_title: "Surprise me",
      archive_aria: "Open the archive",
      archive_title: "Archive",
      loading_trail: "Loading the trail…",

      back_trail: "Back to the trail",
      back_archive: "Back to the archive",
      archive_eyebrow: "put away, not forgotten",
      archive_heading: "The Archive",
      archive_search_placeholder: "Search the archive…",
      archive_search_aria: "Search archived outings by title or location",
      archive_count_one: "1 outing tucked away from the main trail.",
      archive_count_many: "{n} outings tucked away from the main trail.",
      archive_count_filtered: "{n} of {total} archived outings.",

      no_match: "No outings match “{q}”.",
      none_archived_year: "Nothing archived in {year}.",
      archive_empty: "Nothing in the archive yet — set \"archived\": true on an outing in excursion_details_js.json.",
      none_year: "No outings logged in {year}.",
      none_yet: "No outings logged yet — run the generator after adding your first one.",
      load_error: "Couldn't load the log. Check that outing_data/excursion_details_js.json exists.",

      notes_loading: "Loading notes…",
      notes_none: "No notes yet for this one.",
      notes_error: "Notes couldn't be loaded.",
      attachments: "Attachments",
      opens_new_tab: "(opens in a new tab)",
      moments: "Moments",
      photo_label: "Photo, {i} of {n}, from {title}",
      video_label: "Video, {i} of {n}, from {title}",
      view_item: "View {label}",
      play_item: "Play {label}",

      pager_aria: "More outings",
      pager_older: "← Older",
      pager_newer: "Newer →",
      empty_msg: "Hm — couldn't find that outing. It might have been renamed or removed.",
      empty_link: "Back to the trail →",

      lightbox_aria: "Media viewer",
      close: "Close",
      previous: "Previous",
      next: "Next",
      open_original: "Open original ↗",

      map_count: "{n} outings here · scroll for more",
      map_empty: "No outings have a location yet — add a \"Location:\" line under the title in an outing's README.md and re-run the generator.",

      footer: "Built by Aman · one outing at a time.",
    },

    de: {
      meta_desc: "Ein Logbuch über das Draußensein — Ausflüge, Fotos und Notizen vom Weg.",
      title_home: "Ich gehe draußen — ein Logbuch des Rausgehens",
      title_archive: "Archiv — Ich gehe draußen",
      skip_link: "Zum Inhalt springen",

      theme_group: "Visuelles Design wählen",
      theme_signal: "Signal-Design (dunkel)",
      theme_editorial: "Editorial-Design (hell)",
      theme_adventure: "Adventure-Design (warm)",
      lang_group: "Sprache",

      hero_eyebrow: "die Kunst, das Haus zu verlassen",
      hero_title: "Der Pfad",
      hero_sub: "Jeder Ausflug, festgehalten. Fotos, Notizen und gelegentlich ein Video — in der Reihenfolge, in der sie passiert sind.",
      stat_outings: "Ausflüge",
      stat_since: "Seit",
      stat_latest: "Zuletzt",

      highlights: "Highlights",
      highlight_prev: "Vorheriges Highlight",
      highlight_next: "Nächstes Highlight",
      highlight_track: "Hervorgehobene Ausflüge, scrollbar",

      full_log: "Alle Ausflüge",
      year_log: "Ausflüge {year}",
      filter_year_log: "Ausflüge nach Jahr filtern",
      filter_year_archive: "Archiv nach Jahr filtern",
      filter_year_title: "Nach Jahr filtern",
      years: "Jahre",
      all_years: "Alle Jahre",
      search_placeholder: "Ausflüge suchen…",
      search_aria: "Ausflüge nach Titel oder Ort durchsuchen",
      search_clear: "Suche löschen",
      view_group: "Darstellung wählen",
      view_trail: "Pfad",
      view_grid: "Raster",
      view_map: "Karte",
      random_aria: "Zufälligen Ausflug öffnen",
      random_title: "Überrasch mich",
      archive_aria: "Archiv öffnen",
      archive_title: "Archiv",
      loading_trail: "Pfad wird geladen…",

      back_trail: "Zurück zum Pfad",
      back_archive: "Zurück zum Archiv",
      archive_eyebrow: "weggelegt, nicht vergessen",
      archive_heading: "Das Archiv",
      archive_search_placeholder: "Archiv durchsuchen…",
      archive_search_aria: "Archivierte Ausflüge nach Titel oder Ort durchsuchen",
      archive_count_one: "1 Ausflug abseits des Hauptpfads.",
      archive_count_many: "{n} Ausflüge abseits des Hauptpfads.",
      archive_count_filtered: "{n} von {total} archivierten Ausflügen.",

      no_match: "Keine Ausflüge passend zu „{q}“.",
      none_archived_year: "Nichts archiviert in {year}.",
      archive_empty: "Noch nichts im Archiv — setze \"archived\": true bei einem Ausflug in excursion_details_js.json.",
      none_year: "Keine Ausflüge in {year} eingetragen.",
      none_yet: "Noch keine Ausflüge — starte den Generator, nachdem du den ersten hinzugefügt hast.",
      load_error: "Das Logbuch konnte nicht geladen werden. Prüfe, ob outing_data/excursion_details_js.json existiert.",

      notes_loading: "Notizen werden geladen…",
      notes_none: "Für diesen Ausflug gibt es noch keine Notizen.",
      notes_error: "Notizen konnten nicht geladen werden.",
      attachments: "Anhänge",
      opens_new_tab: "(öffnet in neuem Tab)",
      moments: "Momente",
      photo_label: "Foto {i} von {n}, aus {title}",
      video_label: "Video {i} von {n}, aus {title}",
      view_item: "{label} ansehen",
      play_item: "{label} abspielen",

      pager_aria: "Weitere Ausflüge",
      pager_older: "← Älter",
      pager_newer: "Neuer →",
      empty_msg: "Hm — diesen Ausflug gibt es nicht. Vielleicht wurde er umbenannt oder entfernt.",
      empty_link: "Zurück zum Pfad →",

      lightbox_aria: "Medienansicht",
      close: "Schließen",
      previous: "Zurück",
      next: "Weiter",
      open_original: "Original öffnen ↗",

      map_count: "{n} Ausflüge hier · scrollen für mehr",
      map_empty: "Noch hat kein Ausflug einen Ort — füge unter dem Titel in der README.md eines Ausflugs eine Zeile „Location:“ hinzu und starte den Generator erneut.",

      footer: "Gebaut von Aman · ein Ausflug nach dem anderen.",
    },
  };

  function detectLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && STRINGS[saved]) return saved;
    } catch (e) {
      /* localStorage unavailable — fall through to the browser language */
    }
    return (navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
  }

  let lang = detectLanguage();

  /** Looks up a string for the current language (falls back to English,
   *  then to the key itself) and fills in {placeholders}. */
  function t(key, vars) {
    let s = STRINGS[lang][key];
    if (s === undefined) s = STRINGS.en[key];
    if (s === undefined) return key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        s = s.split(`{${name}}`).join(value);
      }
    }
    return s;
  }

  /** Fills every static element marked with data-i18n / data-i18n-attr. */
  function applyStatic() {
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t("meta_desc"));
  }

  function setLanguage(next) {
    if (!STRINGS[next] || next === lang) return;
    lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* private browsing etc. — the choice just won't persist */
    }
    applyStatic();
    // app.js sets this so the dynamic parts (cards, dates, menus) re-render too.
    if (typeof window.onLanguageChange === "function") window.onLanguageChange();
  }

  window.t = t;
  window.getLocale = () => LOCALES[lang];

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
  });

  applyStatic();
})();
