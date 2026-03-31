// ──────────────────────────────────────────────────
// sidebar.js — Shared Sidebar, Topbar, Logout, User Info
// ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  loadUserInfo();
});

function setupSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await authAPI.logout(); } catch (_) {}
      localStorage.removeItem(CONFIG.TOKEN_KEY);
      localStorage.removeItem(CONFIG.USER_KEY);
      window.location.href = 'index.html';
    });
  }
}

function loadUserInfo() {
  const user = getUser();
  if (!user) return;

  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');
  const greetEl = document.getElementById('greeting');

  if (nameEl) nameEl.textContent = user.full_name || 'User';
  if (emailEl) emailEl.textContent = user.email || '';
  if (avatarEl) avatarEl.textContent = (user.full_name || 'U').charAt(0).toUpperCase();
  if (greetEl) greetEl.textContent = `${getGreeting()}, ${(user.full_name || 'User').split(' ')[0]}!`;
}
