// ──────────────────────────────────────────────────
// auth-guard.js — Route Protection
// Include AFTER config.js on every protected page.
// ──────────────────────────────────────────────────

(function () {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  if (!token) {
    window.location.replace('index.html');
  }
})();
