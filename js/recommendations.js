// ──────────────────────────────────────────────────
// recommendations.js — AI Diet & Workout Recommendations
// ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadRecommendations();
  initRefresh();
});

// ─── Refresh Button ──────────────────────────────
function initRefresh() {
  const btn = document.getElementById('refresh-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      loadRecommendations();
      showToast('Refreshing recommendations...', 'info');
    });
  }
}

// ─── Load Recommendations ────────────────────────
async function loadRecommendations() {
  try {
    const data = await recommendAPI.get();
    const r = data.recommendations;
    renderBMIBanner(r);
    renderDietPlan(r.diet_plan);
    renderWorkoutPlan(r.workout_plan);
    renderWeeklyTips(r.weekly_tips);
    renderGeneratedAt(r.generated_at);
  } catch (err) {
    if (err.status === 404) {
      showToast('Please complete your health profile first', 'warning');
      setTimeout(() => window.location.href = 'profile.html', 1500);
      return;
    }
    showToast('Failed to load recommendations', 'error');
    console.error(err);
  }
}

// ─── BMI Banner ──────────────────────────────────
function renderBMIBanner(r) {
  const title = document.getElementById('bmi-cat-title');
  const desc = document.getElementById('bmi-cat-desc');
  const calTarget = document.getElementById('cal-target');

  if (title) title.textContent = `Body Category: ${r.bmi_category || 'Unknown'}`;
  if (desc) desc.textContent = getBMICategoryDescription(r.bmi_category);
  if (calTarget) calTarget.textContent = `${formatNumber(r.daily_calories || 0)} kcal/day`;
}

function getBMICategoryDescription(cat) {
  const map = {
    'Underweight': 'Focus on nutrient-dense meals to gain healthy weight',
    'Normal': 'Great job! Maintain your balanced diet and active lifestyle',
    'Overweight': 'Slight calorie deficit with regular exercise recommended',
    'Obese': 'Consult a doctor and follow a structured plan for safe weight loss',
  };
  return map[cat] || 'Personalized recommendations based on your health profile';
}

// ─── Diet Plan ───────────────────────────────────
function renderDietPlan(plan) {
  const container = document.getElementById('diet-plan');
  if (!container || !plan) return;

  const meals = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'];
  const mealIcons = {
    breakfast: '🌅',
    morning_snack: '🍎',
    lunch: '☀️',
    afternoon_snack: '🥤',
    dinner: '🌙',
    snack: '🍎',
  };
  const mealLabels = {
    breakfast: 'Breakfast',
    morning_snack: 'Morning Snack',
    lunch: 'Lunch',
    afternoon_snack: 'Afternoon Snack',
    dinner: 'Dinner',
    snack: 'Snack',
  };

  let html = '<div class="diet-grid">';

  // Handle both object and directly-keyed formats
  for (const key of Object.keys(plan)) {
    const item = plan[key];
    const icon = mealIcons[key] || '🍽️';
    const label = mealLabels[key] || formatEnumLabel(key);

    // Handle structured { meal, kcal } or plain string
    let mealName, kcal;
    if (typeof item === 'object' && item !== null) {
      mealName = item.meal || item.name || '';
      kcal = item.kcal || item.calories || 0;
    } else {
      mealName = String(item);
      // Try to extract kcal from string like "Oats with banana (400 kcal)"
      const match = mealName.match(/\((\d+)\s*kcal\)/i);
      kcal = match ? parseInt(match[1]) : 0;
    }

    html += `
      <div class="diet-card card hover-lift">
        <div class="card-body" style="padding: 20px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 1.5rem;">${icon}</span>
            <div>
              <div style="font-weight: 600; color: var(--text);">${label}</div>
              ${kcal ? `<span class="badge badge-accent" style="margin-top: 4px;">${kcal} kcal</span>` : ''}
            </div>
          </div>
          <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">${escapeHtml(mealName)}</p>
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

// ─── Workout Plan ────────────────────────────────
function renderWorkoutPlan(plan) {
  const container = document.getElementById('workout-plan');
  if (!container || !plan) return;

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayDay = getDayName();

  // Map day abbreviations
  const dayMap = { Sun: 'Sun', Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat' };

  let html = '<div class="workout-week-grid">';

  for (const day of dayOrder) {
    const exercises = plan[day] || [];
    const isToday = todayDay === day;

    html += `
      <div class="workout-day-card card ${isToday ? 'card-today' : ''} hover-lift">
        <div class="card-body" style="padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-weight: 600; color: var(--text); font-size: 0.95rem;">${day}</span>
            ${isToday ? '<span class="badge badge-accent">Today</span>' : ''}
          </div>`;

    if (exercises.length === 0) {
      html += '<p class="text-muted" style="font-size: 0.85rem;">Rest Day 🧘</p>';
    } else {
      html += '<div class="exercise-list">';
      for (const ex of exercises) {
        // Handle structured { name, sets, reps, duration_min } or plain string
        if (typeof ex === 'object') {
          const name = ex.name || 'Exercise';
          const details = [];
          if (ex.sets) details.push(`${ex.sets} sets`);
          if (ex.reps) details.push(`${ex.reps} reps`);
          if (ex.duration_min) details.push(`${ex.duration_min} min`);
          html += `
            <div class="exercise-item">
              <div style="font-size: 0.85rem; color: var(--text);">${escapeHtml(name)}</div>
              ${details.length ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${details.join(' · ')}</div>` : ''}
            </div>`;
        } else {
          html += `
            <div class="exercise-item">
              <div style="font-size: 0.85rem; color: var(--text);">${escapeHtml(String(ex))}</div>
            </div>`;
        }
      }
      html += '</div>';
    }

    html += '</div></div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// ─── Weekly Tips ─────────────────────────────────
function renderWeeklyTips(tips) {
  const container = document.getElementById('weekly-tips');
  if (!container) return;

  if (!tips || (Array.isArray(tips) && tips.length === 0)) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💡</div>
        <div class="empty-state-title">No tips available</div>
        <p class="empty-state-text">Tips will appear once your profile is set up</p>
      </div>`;
    return;
  }

  // Handle array of strings or single string
  const tipsArr = Array.isArray(tips) ? tips : [tips];

  container.innerHTML = `
    <div class="tips-grid">
      ${tipsArr.map((tip, i) => `
        <div class="tip-item animate-fade-in-up" style="animation-delay: ${i * 0.1}s;">
          <span class="tip-icon">💡</span>
          <span class="tip-text">${escapeHtml(tip)}</span>
        </div>
      `).join('')}
    </div>`;
}

// ─── Generated At ────────────────────────────────
function renderGeneratedAt(ts) {
  const el = document.getElementById('generated-at');
  if (el && ts) {
    el.textContent = `Recommendations generated on ${formatDate(ts)}`;
  }
}

// ─── HTML Escape ─────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
