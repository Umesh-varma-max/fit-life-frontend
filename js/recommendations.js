// recommendations.js - AI Diet & Workout Recommendations

document.addEventListener('DOMContentLoaded', () => {
  loadRecommendations();
  initRefresh();
});

function initRefresh() {
  const btn = document.getElementById('refresh-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      loadRecommendations();
      showToast('Refreshing recommendations...', 'info');
    });
  }
}

async function loadRecommendations() {
  try {
    const data = await recommendAPI.get();
    const recommendations = data.recommendations;
    renderBMIBanner(recommendations);
    renderDietPlan(recommendations.diet_plan);
    renderWorkoutPlan(recommendations.workout_plan);
    renderWeeklyTips(recommendations.weekly_tips);
    renderGeneratedAt(recommendations.generated_at);
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

function renderBMIBanner(recommendations) {
  const title = document.getElementById('bmi-cat-title');
  const desc = document.getElementById('bmi-cat-desc');
  const calTarget = document.getElementById('cal-target');

  if (title) title.textContent = `Body Category: ${recommendations.bmi_category || 'Unknown'}`;
  if (desc) desc.textContent = getBMICategoryDescription(recommendations.bmi_category);
  if (calTarget) calTarget.textContent = `${formatNumber(recommendations.daily_calories || 0)} kcal/day`;
}

function getBMICategoryDescription(category) {
  const map = {
    Underweight: 'Focus on nutrient-dense meals to gain healthy weight',
    Normal: 'Great job! Maintain your balanced diet and active lifestyle',
    Overweight: 'Slight calorie deficit with regular exercise recommended',
    Obese: 'Consult a doctor and follow a structured plan for safe weight loss'
  };

  return map[category] || 'Personalized recommendations based on your health profile';
}

function renderDietPlan(plan) {
  const container = document.getElementById('diet-plan');
  if (!container || !plan) return;

  const mealIcons = {
    breakfast: 'Sun',
    morning_snack: 'Apple',
    lunch: 'Meal',
    afternoon_snack: 'Snack',
    dinner: 'Moon',
    snack: 'Snack'
  };

  const mealLabels = {
    breakfast: 'Breakfast',
    morning_snack: 'Morning Snack',
    lunch: 'Lunch',
    afternoon_snack: 'Afternoon Snack',
    dinner: 'Dinner',
    snack: 'Snack'
  };

  let html = '<div class="diet-grid">';

  Object.keys(plan).forEach((key) => {
    const item = plan[key];
    const label = mealLabels[key] || formatEnumLabel(key);
    const icon = mealIcons[key] || 'Meal';

    let mealName;
    let calories;

    if (typeof item === 'object' && item !== null) {
      mealName = item.meal || item.name || '';
      calories = item.kcal || item.calories || 0;
    } else {
      mealName = String(item || '');
      const match = mealName.match(/\((\d+)\s*kcal\)/i);
      calories = match ? parseInt(match[1], 10) : 0;
    }

    html += `
      <div class="diet-card card hover-lift">
        <div class="card-body diet-card-body">
          <div class="diet-card-head">
            <span class="diet-card-icon">${icon}</span>
            <div class="diet-card-copy">
              <div class="diet-card-title">${label}</div>
              ${calories ? `<span class="badge badge-accent diet-card-badge">${calories} kcal</span>` : ''}
            </div>
          </div>
          <p class="diet-card-text">${escapeHtml(mealName)}</p>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderWorkoutPlan(plan) {
  const container = document.getElementById('workout-plan');
  if (!container || !plan) return;

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayDay = getDayName();
  let html = '<div class="workout-week-grid">';

  dayOrder.forEach((day) => {
    const exercises = plan[day] || [];
    const isToday = day === todayDay;

    html += `
      <div class="workout-day-card card ${isToday ? 'card-today' : ''} hover-lift">
        <div class="card-body recommendation-day-body">
          <div class="recommendation-day-head">
            <span class="recommendation-day-label">${day}</span>
            ${isToday ? '<span class="badge badge-accent">Today</span>' : ''}
          </div>
    `;

    if (!exercises.length) {
      html += '<p class="text-muted recommendation-rest-copy">Rest Day</p>';
    } else {
      html += '<div class="exercise-list">';

      exercises.forEach((exercise) => {
        if (typeof exercise === 'object' && exercise !== null) {
          const parts = [];
          if (exercise.sets) parts.push(`${exercise.sets} sets`);
          if (exercise.reps) parts.push(`${exercise.reps} reps`);
          if (exercise.duration_min) parts.push(`${exercise.duration_min} min`);

          html += `
            <div class="exercise-item">
              <div class="recommendation-exercise-name">${escapeHtml(exercise.name || 'Exercise')}</div>
              ${parts.length ? `<div class="recommendation-exercise-meta">${parts.join(' · ')}</div>` : ''}
            </div>
          `;
        } else {
          html += `
            <div class="exercise-item">
              <div class="recommendation-exercise-name">${escapeHtml(String(exercise))}</div>
            </div>
          `;
        }
      });

      html += '</div>';
    }

    html += '</div></div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderWeeklyTips(tips) {
  const container = document.getElementById('weekly-tips');
  if (!container) return;

  if (!tips || (Array.isArray(tips) && !tips.length)) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Tip</div>
        <div class="empty-state-title">No tips available</div>
        <p class="empty-state-text">Tips will appear once your profile is set up</p>
      </div>
    `;
    return;
  }

  const list = Array.isArray(tips) ? tips : [tips];
  container.innerHTML = `
    <div class="tips-grid">
      ${list.map((tip, index) => `
        <div class="tip-item animate-fade-in-up" style="animation-delay: ${index * 0.1}s;">
          <span class="tip-icon">Tip</span>
          <span class="tip-text">${escapeHtml(tip)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderGeneratedAt(timestamp) {
  const el = document.getElementById('generated-at');
  if (el && timestamp) {
    el.textContent = `Recommendations generated on ${formatDate(timestamp)}`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
