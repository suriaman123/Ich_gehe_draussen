// theme.js
// Handles the three visual themes: signal / editorial / adventure.
// The chosen theme is remembered in localStorage so it persists between visits.

(function () {
  const STORAGE_KEY = "amanoutside-theme";
  const root = document.documentElement;
  const dots = document.querySelectorAll(".theme-dot");

  function applyTheme(name) {
    root.setAttribute("data-theme", name);
    dots.forEach((dot) => {
      const isActive = dot.dataset.themeChoice === name;
      dot.setAttribute("aria-pressed", String(isActive));
    });
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch (e) {
      // localStorage unavailable (private browsing, etc) — theme just won't persist
    }
  }

  // Restore saved theme, if any
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  if (saved) applyTheme(saved);

  dots.forEach((dot) => {
    dot.addEventListener("click", () => applyTheme(dot.dataset.themeChoice));
  });
})();
