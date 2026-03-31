// ──────────────────────────────────────────────────
// dashboard.js — Dashboard Data Fetch + Render
// ──────────────────────────────────────────────────

let calorieRingChart = null;
let weeklyBarChart = null;

document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  loadUserInfo();
  loadDashboard();
});

// ─── Sidebar Toggle (Mobile) ─────────────────────
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

// ─── Load User Info into Sidebar ─────────────────
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

// ─── Load Dashboard Data ─────────────────────────
async function loadDashboard() {
  try {
    const data = await dashboardAPI.get();
    const d = data.dashboard;
    renderStats(d);
    renderCalorieRing(d);
    renderWeeklyChart(d.weekly_chart);
    renderQuote(d);
  } catch (err) {
    if (err.status === 404) {
      showToast('Please complete your health profile first', 'warning');
      setTimeout(() => window.location.href = 'profile.html', 1500);
      return;
    }
    showToast('Failed to load dashboard data', 'error');
    console.error(err);
  }
}

// ─── Render Stat Cards ───────────────────────────
function renderStats(d) {
  // BMI
  const bmiVal = document.getElementById('bmi-value');
  const bmiBadge = document.getElementById('bmi-badge');
  if (bmiVal) bmiVal.textContent = d.bmi ? parseFloat(d.bmi).toFixed(1) : '--';
  if (bmiBadge && d.bmi_category) {
    const cat = getBMICategory(d.bmi);
    bmiBadge.textContent = d.bmi_category;
    bmiBadge.className = `badge badge-${cat.class}`;
  }

  // Calories
  const calIn = document.getElementById('cal-in-value');
  const calGoal = document.getElementById('cal-goal');
  const calPct = document.getElementById('cal-progress-pct');
  if (calIn) calIn.textContent = formatNumber(d.today_calories_in || 0);
  if (calGoal) calGoal.textContent = formatNumber(d.daily_calorie_goal || 0);
  if (calPct) calPct.textContent = `${d.goal_progress_pct || 0}%`;

  // Streak
  const streak = document.getElementById('streak-value');
  if (streak) streak.textContent = d.workout_streak || 0;

  // Water
  const waterVal = document.getElementById('water-value');
  const waterMl = document.getElementById('water-ml');
  const waterGoal = document.getElementById('water-goal');
  const waterBar = document.getElementById('water-bar');
  const wToday = d.water_today_ml || 0;
  const wGoal = d.water_goal_ml || CONFIG.WATER_GOAL_ML;
  if (waterVal) waterVal.textContent = `${(wToday / 1000).toFixed(1)}L`;
  if (waterMl) waterMl.textContent = `${wToday} ml`;
  if (waterGoal) waterGoal.textContent = `${wGoal} ml`;
  if (waterBar) waterBar.style.width = `${percentage(wToday, wGoal)}%`;
}

// ─── Calorie Ring (Doughnut) ─────────────────────
function renderCalorieRing(d) {
  const ctx = document.getElementById('calorie-ring-chart');
  if (!ctx) return;

  const consumed = d.today_calories_in || 0;
  const goal = d.daily_calorie_goal || 2000;
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
        borderRadius: 6,
      }],
    },
    options: {
      cutout: '75%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed} kcal`,
          },
        },
      },
    },
  });
}

// ─── Weekly Calorie Chart ────────────────────────
function renderWeeklyChart(wc) {
  const ctx = document.getElementById('weekly-chart');
  if (!ctx || !wc) return;

  if (weeklyBarChart) weeklyBarChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  weeklyBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: wc.labels || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [
        {
          label: 'Calories In',
          data: wc.calories_in || [],
          backgroundColor: CONFIG.CHART_COLORS.primary,
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          label: 'Calories Out',
          data: wc.calories_out || [],
          backgroundColor: CONFIG.CHART_COLORS.secondary,
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
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
            color: isDark ? '#e8eaf6' : '#1a1a2e',
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 12, family: "'Sora', sans-serif" }, color: isDark ? '#8888aa' : '#6b7280' },
        },
        y: {
          grid: { color: gridColor },
          ticks: { font: { size: 11 }, color: isDark ? '#8888aa' : '#6b7280' },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─── Quote + Tip ─────────────────────────────────
function renderQuote(d) {
  const quoteEl = document.getElementById('quote-text');
  const tipEl = document.getElementById('tip-text');
  if (quoteEl && d.motivational_quote) quoteEl.textContent = `"${d.motivational_quote}"`;
  if (tipEl && d.this_week_tip) tipEl.textContent = `💡 Tip: ${d.this_week_tip}`;
}
