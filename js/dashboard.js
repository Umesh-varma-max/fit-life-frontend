let calorieRingChart = null;
let weeklyBarChart = null;

document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  loadUserInfo();
  mountScannerShortcut();
  mountMobileBottomNav();
  loadDashboard();
});

function setupSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const navLinks = document.querySelectorAll('.sidebar .nav-link');

  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    document.body.classList.remove('sidebar-open');
  };

  hamburger?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
  });

  overlay?.addEventListener('click', closeSidebar);

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

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
      await authAPI.logout();
    } catch (_) {
      // Ignore logout errors.
    }
    clearStoredSession();
    window.location.replace('index.html');
  });
}

function loadUserInfo() {
  const user = getUser();
  if (!user) return;

  setText('user-name', user.full_name || 'User');
  setText('user-email', user.email || '');
  setText('user-avatar', (user.full_name || 'U').charAt(0).toUpperCase());
  setText('greeting', `${getGreeting()}, ${(user.full_name || 'User').split(' ')[0]}!`);
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

async function loadDashboard() {
  const cached = readTimedCache(CONFIG.DASHBOARD_CACHE_KEY);
  if (cached?.data) {
    const dashboard = cached.data?.dashboard || cached.data || {};
    renderStats(dashboard);
    renderCalorieRing(dashboard);
    renderWeeklyChart(dashboard.weekly_chart || {});
    renderQuote(dashboard);
  }

  try {
    const data = await dashboardAPI.get();
    const dashboard = data?.dashboard || data || {};
    renderStats(dashboard);
    renderCalorieRing(dashboard);
    renderWeeklyChart(dashboard.weekly_chart || {});
    renderQuote(dashboard);
  } catch (error) {
    if (error.status === 404) {
      showToast('Please complete your health profile first', 'warning');
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 1500);
      return;
    }

    console.error('Dashboard request failed:', error.payload || error);
    if (!cached?.data) {
      renderStats({});
      renderCalorieRing({});
      renderWeeklyChart({});
      renderQuote({});
      showToast('Failed to load dashboard data', 'error');
    }
  }
}

function renderStats(dashboard) {
  const bmiValue = dashboard?.bmi ? parseFloat(dashboard.bmi).toFixed(1) : '--';
  const bmiCategory = dashboard?.bmi_category || '--';
  const bmiBadgeClass = dashboard?.bmi ? getBMICategory(dashboard.bmi).class : 'info';

  setText('bmi-value', bmiValue);
  const bmiBadge = document.getElementById('bmi-badge');
  if (bmiBadge) {
    bmiBadge.textContent = bmiCategory;
    bmiBadge.className = `badge badge-${bmiBadgeClass}`;
  }

  setText('cal-in-value', formatNumber(dashboard?.today_calories_in || 0));
  setText('cal-goal', formatNumber(dashboard?.daily_calorie_goal || 0));
  setText('cal-progress-pct', `${dashboard?.goal_progress_pct || 0}%`);
  setText('streak-value', dashboard?.workout_streak || 0);

  const waterToday = dashboard?.water_today_ml || 0;
  const waterGoal = dashboard?.water_goal_ml || CONFIG.WATER_GOAL_ML;
  setText('water-value', `${(waterToday / 1000).toFixed(1)}L`);
  setText('water-ml', `${waterToday} ml`);
  setText('water-goal', `${waterGoal} ml`);

  const waterBar = document.getElementById('water-bar');
  if (waterBar) {
    waterBar.style.width = `${percentage(waterToday, waterGoal)}%`;
  }
}

function renderCalorieRing(dashboard) {
  const ctx = document.getElementById('calorie-ring-chart');
  if (!ctx) return;

  const consumed = dashboard?.today_calories_in || 0;
  const goal = dashboard?.daily_calorie_goal || 2000;
  const remaining = Math.max(goal - consumed, 0);

  if (calorieRingChart) calorieRingChart.destroy();

  calorieRingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Consumed', 'Remaining'],
      datasets: [{
        data: [consumed, remaining],
        backgroundColor: [CONFIG.CHART_COLORS.primary, 'rgba(160,160,176,0.15)'],
        borderWidth: 0,
        borderRadius: 6
      }]
    },
    options: {
      cutout: '75%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctxInfo) => `${ctxInfo.label}: ${ctxInfo.parsed} kcal`
          }
        }
      }
    }
  });
}

function renderWeeklyChart(weeklyChart) {
  const ctx = document.getElementById('weekly-chart');
  if (!ctx) return;

  if (weeklyBarChart) weeklyBarChart.destroy();

  const labels = Array.isArray(weeklyChart?.labels) && weeklyChart.labels.length
    ? weeklyChart.labels
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const caloriesIn = Array.isArray(weeklyChart?.calories_in) ? weeklyChart.calories_in : [0, 0, 0, 0, 0, 0, 0];
  const caloriesOut = Array.isArray(weeklyChart?.calories_out) ? weeklyChart.calories_out : [0, 0, 0, 0, 0, 0, 0];

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  weeklyBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Calories In',
          data: caloriesIn,
          backgroundColor: CONFIG.CHART_COLORS.primary,
          borderRadius: 6,
          barPercentage: 0.6
        },
        {
          label: 'Calories Out',
          data: caloriesOut,
          backgroundColor: CONFIG.CHART_COLORS.secondary,
          borderRadius: 6,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { size: 12, family: "'Sora', sans-serif" },
            color: isDark ? '#e8eaf6' : '#1a1a2e'
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 12, family: "'Sora', sans-serif" }, color: isDark ? '#8888aa' : '#6b7280' }
        },
        y: {
          grid: { color: gridColor },
          ticks: { font: { size: 11 }, color: isDark ? '#8888aa' : '#6b7280' },
          beginAtZero: true
        }
      }
    }
  });
}

function renderQuote(dashboard) {
  setText('quote-text', dashboard?.motivational_quote ? `"${dashboard.motivational_quote}"` : '"Every rep brings you closer to your goal!"');
  setText('tip-text', dashboard?.this_week_tip ? `Tip: ${dashboard.this_week_tip}` : 'Tip: Small consistent actions beat perfect days.');
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}
