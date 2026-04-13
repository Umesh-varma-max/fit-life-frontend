// ──────────────────────────────────────────────────
// auth-guard.js — Route Protection
// Include AFTER config.js on every protected page.
// ──────────────────────────────────────────────────

(function () {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  const user = localStorage.getItem(CONFIG.USER_KEY);

  const isTokenValid = (() => {
    if (!token) return false;

    try {
      const parts = token.split('.');
      if (parts.length < 2) return false;
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded));
      if (!payload?.exp) return true;
      return (payload.exp * 1000) > Date.now();
    } catch (_) {
      return false;
    }
  })();

  if (!token || !user || !isTokenValid) {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    localStorage.removeItem(CONFIG.PROFILE_CACHE_KEY);
    localStorage.removeItem(CONFIG.AI_CHAT_HISTORY_KEY);
    localStorage.removeItem(CONFIG.WORKOUT_PLAN_CACHE_KEY);
    localStorage.removeItem(CONFIG.DASHBOARD_CACHE_KEY);
    localStorage.removeItem(CONFIG.RECOMMENDATIONS_CACHE_KEY);
    window.location.replace('index.html?login=1');
  }
})();
