// ──────────────────────────────────────────────────
// auth-guard.js — Route Protection
// Include AFTER config.js on every protected page.
// ──────────────────────────────────────────────────

(function () {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  const currentPath = `${window.location.pathname.split('/').pop() || 'dashboard.html'}${window.location.search || ''}${window.location.hash || ''}`;

  if (!token) {
    window.location.replace('index.html?login=1');
    return;
  }

  sessionStorage.setItem('fitlife_last_app_page', currentPath);
})();
