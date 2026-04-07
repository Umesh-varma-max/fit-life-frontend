// recommendations.js - Personalized recommendations with frontend fallback

document.addEventListener('DOMContentLoaded', () => {
  loadRecommendations();
  initRefresh();
});

function initRefresh() {
  const btn = document.getElementById('refresh-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    loadRecommendations();
    showToast('Refreshing recommendations...', 'info');
  });
}

async function loadRecommendations() {
  try {
    const data = await recommendAPI.get();
    const recommendations = normalizeRecommendations(data);

    renderBMIBanner(recommendations);
    renderDietPlan(recommendations.diet_plan);
    renderWorkoutPlan(recommendations.workout_plan);
    renderWeeklyTips(recommendations.weekly_tips);
    renderGeneratedAt(recommendations.generated_at);
  } catch (error) {
    const fallback = buildRecommendationFallback(getCachedProfile());

    renderBMIBanner(fallback);
    renderDietPlan(fallback.diet_plan);
    renderWorkoutPlan(fallback.workout_plan);
    renderWeeklyTips(fallback.weekly_tips);
    renderGeneratedAt(new Date().toISOString());

    showToast('Live recommendations failed, showing personalized fallback', 'warning');
    console.error(error);
  }
}

function normalizeRecommendations(data) {
  const raw = data?.recommendations || data || {};

  return {
    bmi_category: raw.bmi_category || raw.category || 'Unknown',
    daily_calories: raw.daily_calories || raw.calories || 0,
    diet_plan: normalizeDietPlan(raw.diet_plan || raw.meals || {}),
    workout_plan: normalizeWorkoutPlan(raw.workout_plan || raw.weekly_workout || {}),
    weekly_tips: Array.isArray(raw.weekly_tips) ? raw.weekly_tips : (raw.weekly_tips ? [raw.weekly_tips] : []),
    generated_at: raw.generated_at || new Date().toISOString()
  };
}

function normalizeDietPlan(plan) {
  return plan && typeof plan === 'object' ? plan : {};
}

function normalizeWorkoutPlan(plan) {
  if (Array.isArray(plan)) {
    return plan.reduce((acc, item) => {
      acc[item.day] = item.exercises || [];
      return acc;
    }, {});
  }

  return plan && typeof plan === 'object' ? plan : {};
}

function renderBMIBanner(recommendations) {
  const title = document.getElementById('bmi-cat-title');
  const desc = document.getElementById('bmi-cat-desc');
  const calTarget = document.getElementById('cal-target');

  if (title) title.textContent = `Body Category: ${recommendations.bmi_category || 'Unknown'}`;
  if (desc) desc.textContent = getBMICategoryDescription(recommendations.bmi_category);
  if (calTarget) calTarget.textContent = `${formatNumber(recommendations.daily_calories || 0)} kcal/day`;
}

function renderDietPlan(plan) {
  const container = document.getElementById('diet-plan');
  if (!container) return;

  const mealMeta = {
    breakfast: { label: 'Breakfast', icon: 'BK' },
    morning_snack: { label: 'Morning Snack', icon: 'MS' },
    lunch: { label: 'Lunch', icon: 'LU' },
    afternoon_snack: { label: 'Afternoon Snack', icon: 'AS' },
    dinner: { label: 'Dinner', icon: 'DN' },
    snack: { label: 'Snack', icon: 'SN' }
  };

  const entries = Object.entries(plan || {});

  if (!entries.length) {
    container.innerHTML = emptyCardMarkup('Meal', 'No diet plan available yet');
    return;
  }

  container.innerHTML = `
    <div class="diet-grid">
      ${entries.map(([key, item]) => {
        const meta = mealMeta[key] || { label: formatEnumLabel(key), icon: 'ML' };
        const meal = typeof item === 'object' && item !== null ? (item.meal || item.name || '') : String(item || '');
        const calories = typeof item === 'object' && item !== null ? (item.kcal || item.calories || 0) : extractCaloriesFromText(meal);

        return `
          <div class="diet-card card hover-lift">
            <div class="card-body diet-card-body">
              <div class="diet-card-head">
                <span class="diet-card-icon">${meta.icon}</span>
                <div class="diet-card-copy">
                  <div class="diet-card-title">${meta.label}</div>
                  ${calories ? `<span class="badge badge-accent diet-card-badge">${calories} kcal</span>` : ''}
                </div>
              </div>
              <p class="diet-card-text">${escapeHtml(meal)}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderWorkoutPlan(plan) {
  const container = document.getElementById('workout-plan');
  if (!container) return;

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = getDayName();

  container.innerHTML = `
    <div class="workout-week-grid">
      ${dayOrder.map((day) => {
        const exercises = plan[day] || [];
        return `
          <div class="workout-day-card card ${day === today ? 'card-today' : ''} hover-lift">
            <div class="card-body recommendation-day-body">
              <div class="recommendation-day-head">
                <span class="recommendation-day-label">${day}</span>
                ${day === today ? '<span class="badge badge-accent">Today</span>' : ''}
              </div>
              ${exercises.length ? `
                <div class="exercise-list">
                  ${exercises.map((exercise) => renderRecommendationExercise(exercise)).join('')}
                </div>
              ` : '<p class="text-muted recommendation-rest-copy">Rest Day</p>'}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderRecommendationExercise(exercise) {
  if (typeof exercise === 'string') {
    return `
      <div class="exercise-item">
        <div class="recommendation-exercise-name">${escapeHtml(exercise)}</div>
      </div>
    `;
  }

  const details = [];
  if (exercise.sets) details.push(`${exercise.sets} sets`);
  if (exercise.reps) details.push(`${exercise.reps} reps`);
  if (exercise.duration_min) details.push(`${exercise.duration_min} min`);

  return `
    <div class="exercise-item">
      <div class="recommendation-exercise-name">${escapeHtml(exercise.name || 'Exercise')}</div>
      ${details.length ? `<div class="recommendation-exercise-meta">${details.join(' · ')}</div>` : ''}
    </div>
  `;
}

function renderWeeklyTips(tips) {
  const container = document.getElementById('weekly-tips');
  if (!container) return;

  const list = Array.isArray(tips) ? tips : [];
  if (!list.length) {
    container.innerHTML = emptyCardMarkup('Tip', 'No tips available yet');
    return;
  }

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
  if (el) {
    el.textContent = `Recommendations generated on ${formatDate(timestamp || new Date().toISOString())}`;
  }
}

function buildRecommendationFallback(profile) {
  const goal = profile?.fitness_goal || 'maintenance';
  const goalLabel = formatEnumLabel(goal);
  const bmi = Number(profile?.bmi || 0);
  const bmiCategory = bmi ? getBMICategory(bmi).label : 'Unknown';
  const dailyCalories = profile?.daily_calories || getFallbackCalories(goal, bmi);

  return {
    bmi_category: bmiCategory,
    daily_calories: dailyCalories,
    diet_plan: getFallbackMeals(goal, dailyCalories),
    workout_plan: getFallbackWorkout(goal),
    weekly_tips: [
      `Target around ${dailyCalories} kcal with consistent protein intake.`,
      bmi >= 25 ? 'Choose lighter dinners and increase walking after meals.' : 'Spread meals evenly through the day to keep energy stable.',
      goal === 'muscle_gain' ? 'Prioritize protein in every meal and a post-workout snack.' : 'Keep hydration and sleep consistent to support recovery.'
    ],
    generated_at: new Date().toISOString(),
    goal_label: goalLabel
  };
}

function getFallbackMeals(goal, calories) {
  if (goal === 'weight_loss') {
    return {
      breakfast: { meal: 'Eggs or oats with fruit', kcal: Math.round(calories * 0.22) },
      lunch: { meal: 'Grilled chicken or dal, rice/roti, vegetables', kcal: Math.round(calories * 0.32) },
      snack: { meal: 'Curd, nuts, or fruit', kcal: Math.round(calories * 0.12) },
      dinner: { meal: 'Paneer or lean protein with vegetables', kcal: Math.round(calories * 0.24) }
    };
  }

  if (goal === 'muscle_gain') {
    return {
      breakfast: { meal: 'Oats, milk, banana, and eggs', kcal: Math.round(calories * 0.24) },
      lunch: { meal: 'Chicken or paneer, rice, dal, vegetables', kcal: Math.round(calories * 0.34) },
      snack: { meal: 'Peanut butter sandwich or fruit smoothie', kcal: Math.round(calories * 0.16) },
      dinner: { meal: 'Fish, paneer, or dal with carbs and vegetables', kcal: Math.round(calories * 0.26) }
    };
  }

  return {
    breakfast: { meal: 'Balanced breakfast with protein and fruit', kcal: Math.round(calories * 0.22) },
    lunch: { meal: 'Rice/roti, vegetables, and protein source', kcal: Math.round(calories * 0.32) },
    snack: { meal: 'Fruit, nuts, or curd', kcal: Math.round(calories * 0.14) },
    dinner: { meal: 'Light balanced meal with vegetables and protein', kcal: Math.round(calories * 0.24) }
  };
}

function getFallbackWorkout(goal) {
  const templates = {
    weight_loss: ['Brisk Walk', 'Bodyweight Squats', 'Cycling', 'Light Mobility'],
    muscle_gain: ['Push Ups', 'Squats', 'Rows', 'Core Work'],
    maintenance: ['Walk', 'Stretching', 'Mixed Cardio', 'Mobility']
  };

  const base = templates[goal] || templates.maintenance;

  return {
    Mon: [{ name: base[0], duration_min: 30 }, { name: base[1], sets: 3, reps: 12 }],
    Tue: [],
    Wed: [{ name: base[2], duration_min: 30 }, { name: base[3], duration_min: 15 }],
    Thu: [],
    Fri: [{ name: base[1], sets: 3, reps: 15 }, { name: base[0], duration_min: 20 }],
    Sat: [{ name: base[2], duration_min: 25 }],
    Sun: []
  };
}

function getFallbackCalories(goal, bmi) {
  if (goal === 'weight_loss') return bmi >= 25 ? 1800 : 2000;
  if (goal === 'muscle_gain') return 2500;
  return 2200;
}

function getBMICategoryDescription(category) {
  const map = {
    Underweight: 'Focus on nutrient-dense meals to gain healthy weight',
    Normal: 'Great job! Maintain your balanced diet and active lifestyle',
    Overweight: 'Slight calorie deficit with regular exercise recommended',
    Obese: 'Consult a doctor and follow a structured plan for safe weight loss',
    Unknown: 'Complete your profile for more precise recommendations'
  };

  return map[category] || map.Unknown;
}

function extractCaloriesFromText(text) {
  const match = String(text || '').match(/\((\d+)\s*kcal\)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function emptyCardMarkup(label, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${label}</div>
      <div class="empty-state-title">${escapeHtml(message)}</div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
