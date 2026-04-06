// ──────────────────────────────────────────────────
// sidebar.js — Shared Sidebar, Topbar, Logout, User Info
// ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  loadUserInfo();
  mountScannerShortcut();
  mountMobileBottomNav();
});

function setupSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const navLinks = document.querySelectorAll('.sidebar .nav-link');

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
  };

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
      document.body.classList.toggle('sidebar-open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 769) closeSidebar();
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 769) closeSidebar();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSidebar();
  });

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

function mountMobileBottomNav() {
  if (document.querySelector('.mobile-bottom-nav')) return;

  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  const navItems = [
    { href: 'dashboard.html', label: 'Home', icon: 'M3 12h7V3H3zm11-9v7h7V3zm0 18h7v-7h-7zM3 21h7v-7H3z' },
    { href: 'tracker.html', label: 'Track', icon: 'M12 20V10M18 20V4M6 20v-4' },
    { href: 'food-scanner.html', label: 'Scan', icon: 'M4 9h4M16 9h4M9 4v4M15 4v4M9 20v-4M15 20v-4M4 15h4M16 15h4M7 7h10v10H7z' },
    { href: 'workout.html', label: 'Workout', icon: 'M14.4 14.4 9.6 9.6M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767-1.768a2 2 0 1 1-2.829-2.829l-1.767-1.767a2 2 0 1 1-2.829-2.829L4.869 7.697a2 2 0 1 1 2.828-2.829l1.768 1.768a2 2 0 1 1 2.828 2.829l1.768 1.767a2 2 0 1 1 2.828 2.829l1.768 1.767a2 2 0 0 1 0 2.828z' },
    { href: 'recommendations.html', label: 'AI', icon: 'M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z' }
  ];

  const nav = document.createElement('nav');
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Mobile navigation');
  nav.innerHTML = navItems.map((item) => {
    const active = currentPage === item.href ? ' active' : '';
    return `
      <a href="${item.href}" class="mobile-bottom-link${active}" aria-label="${item.label}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="${item.icon}"></path>
        </svg>
        <span>${item.label}</span>
      </a>
    `;
  }).join('');

  document.body.appendChild(nav);
}
