const RECOMMENDATION_DEFAULT_PROMPT = 'Return pure JSON with goal label, weekly_workout_plan, nutrition_tips, and motivational_tip for the selected goal.';

document.addEventListener('DOMContentLoaded', () => {
  if (!getSelectedGoal()) {
    setSelectedGoal('Fit');
  }
  initGoalSelector();
  initRecommendationControls();
  loadRecommendations();
});

function initGoalSelector() {
  const container = document.getElementById('goal-selector');
  if (!container) return;
  const currentGoal = getSelectedGoal() || 'Fit';

  container.innerHTML = CONFIG.GOAL_OPTIONS.map(goal => `
    <label class="radio-card">
      <input type="radio" name="goal-selector" value="${goal}" ${goal === currentGoal ? 'checked' : ''}>
      <span class="radio-card-label">
        <span class="radio-card-text">${goal}</span>
        <span class="radio-card-sub">Generate a weekly plan</span>
      </span>
    </label>
  `).join('');

  container.querySelectorAll('input[name="goal-selector"]').forEach(input => {
    input.addEventListener('change', () => {
      setSelectedGoal(input.value);
      loadRecommendations();
    });
  });
}

function initRecommendationControls() {
  document.getElementById('refresh-btn').addEventListener('click', () => loadRecommendations());
  document.getElementById('edit-prompt-btn').addEventListener('click', openPromptModal);
  document.getElementById('close-prompt-modal').addEventListener('click', closePromptModal);
  document.getElementById('prompt-modal').addEventListener('click', event => {
    if (event.target.id === 'prompt-modal') {
      closePromptModal();
    }
  });
  document.getElementById('regenerate-from-modal').addEventListener('click', () => {
    setEditablePrompt(document.getElementById('prompt-textarea').value.trim());
    closePromptModal();
    loadRecommendations();
  });
}

function openPromptModal() {
  document.getElementById('prompt-textarea').value = getEditablePrompt(RECOMMENDATION_DEFAULT_PROMPT);
  document.getElementById('prompt-modal').classList.add('active');
}

function closePromptModal() {
  document.getElementById('prompt-modal').classList.remove('active');
}

async function loadRecommendations() {
  const goal = getSelectedGoal() || 'Fit';
  document.getElementById('recommendation-loading').style.display = 'block';

  try {
    const responseText = await requestGoalRecommendations(goal, getEditablePrompt(RECOMMENDATION_DEFAULT_PROMPT));
    const parsed = safeParseJson(responseText);

    if (!parsed) {
      throw new Error('Could not parse workout recommendations.');
    }

    renderRecommendations(parsed);
  } catch (err) {
    showToast(err.message || 'Failed to load recommendations.', 'error');
  } finally {
    document.getElementById('recommendation-loading').style.display = 'none';
  }
}

async function requestGoalRecommendations(goal, prompt) {
  const workoutFocus = {
    Cut: ['Fat loss conditioning', 'Upper body circuit', 'Lower body burn', 'Core + cardio', 'Mobility + steps', 'Full body sweat', 'Recovery'],
    Bulk: ['Chest + triceps', 'Back + biceps', 'Leg strength', 'Shoulders', 'Upper hypertrophy', 'Lower hypertrophy', 'Recovery'],
    Fit: ['Full body', 'Cardio mix', 'Mobility', 'Strength balance', 'Core', 'Steady conditioning', 'Recovery'],
    'Muscle Growth': ['Push day', 'Pull day', 'Leg day', 'Upper chest + arms', 'Back thickness', 'Glutes + hamstrings', 'Recovery'],
  };

  const nutritionTips = {
    Cut: ['Keep protein high at every meal.', 'Build meals around vegetables and lean protein.', 'Stay in a moderate calorie deficit, not a crash diet.'],
    Bulk: ['Use calorie-dense but clean foods to support growth.', 'Eat carbs around your training window.', 'Track protein daily and recover hard.'],
    Fit: ['Balance carbs, protein, and fats across the day.', 'Hydrate consistently and keep meal timing regular.', 'Use weekends to prep simple meals.'],
    'Muscle Growth': ['Push progressive overload and protein intake together.', 'Eat a recovery meal within 90 minutes after training.', 'Do not skip sleep if muscle gain is the goal.'],
  };

  const exercises = {
    Cut: ['Incline walk', 'Kettlebell swings', 'Push-ups', 'Mountain climbers'],
    Bulk: ['Bench press', 'Dumbbell row', 'Leg press', 'Overhead press'],
    Fit: ['Squats', 'Push-ups', 'Plank', 'Bike intervals'],
    'Muscle Growth': ['Barbell squat', 'Romanian deadlift', 'Pull-up', 'Incline dumbbell press'],
  };

  const weekly_workout_plan = workoutFocus[goal].map((focus, index) => ({
    day: CONFIG.ENUMS.day_of_week[index],
    focus_area: focus,
    exercises: exercises[goal].map((exercise, exerciseIndex) => `${exercise} ${exerciseIndex + 1}`),
  }));

  return JSON.stringify({
    goal_label: goal,
    weekly_workout_plan,
    nutrition_tips: nutritionTips[goal],
    motivational_tip: `${goal} plan active. ${prompt ? 'Prompt updated for a more personalized recommendation.' : 'Stay consistent and keep momentum.'}`,
  });
}

function renderRecommendations(data) {
  document.getElementById('recommendation-goal-badge').textContent = data.goal_label || getSelectedGoal();
  document.getElementById('goal-banner-title').textContent = `${data.goal_label || getSelectedGoal()} Mode`;
  document.getElementById('goal-banner-tip').textContent = data.motivational_tip || 'Stay consistent this week.';

  renderWorkoutCards(data.weekly_workout_plan || []);
  renderNutritionTips(data.nutrition_tips || []);
}

function renderWorkoutCards(plan) {
  const container = document.getElementById('weekly-workout-cards');
  if (!plan.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">No workout plan available</div></div>';
    return;
  }

  container.innerHTML = `
    <div class="card-grid card-grid-2">
      ${plan.map(day => `
        <div class="card hover-lift">
          <div class="card-body">
            <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
              <div style="font-weight:700; color:var(--text);">${escapeHtml(day.day)}</div>
              <span class="badge badge-accent">${escapeHtml(day.focus_area)}</span>
            </div>
            <div class="mt-2 text-muted" style="font-size:0.85rem; line-height:1.7;">
              ${day.exercises.map(exercise => `<div style="padding:8px 0; border-bottom:1px solid var(--border-light);">${escapeHtml(exercise)}</div>`).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderNutritionTips(tips) {
  const container = document.getElementById('nutrition-tips');
  container.innerHTML = `
    <div class="tips-grid">
      ${tips.map(tip => `
        <div class="tip-item">
          <span class="tip-icon">Tip</span>
          <span class="tip-text">${escapeHtml(tip)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
