// ──────────────────────────────────────────────────
// sidebar.js — Shared Sidebar, Topbar, Logout, User Info
// ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  loadUserInfo();
  mountScannerShortcut();
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

function mountScannerShortcut() {
  const topbarRight = document.querySelector('.topbar-right');
  if (!topbarRight || document.getElementById('scanner-shortcut-btn')) return;

  const link = document.createElement('a');
  link.id = 'scanner-shortcut-btn';
  link.href = 'food-scanner.html';
  link.className = 'scanner-shortcut-btn';
  link.setAttribute('aria-label', 'Open food scanner');
  link.setAttribute('data-tooltip', 'Food Scanner');
  link.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3"></rect>
      <path d="M9 4v4"></path>
      <path d="M15 4v4"></path>
      <path d="M4 9h4"></path>
      <path d="M16 9h4"></path>
      <path d="M9 20v-4"></path>
      <path d="M15 20v-4"></path>
      <circle cx="12" cy="12" r="3.5"></circle>
    </svg>
  `;

  topbarRight.insertBefore(link, topbarRight.firstChild);
}
