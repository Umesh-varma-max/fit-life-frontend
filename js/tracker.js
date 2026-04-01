let trackerDate = todayDate();

document.addEventListener('DOMContentLoaded', () => {
  initTrackerDate();
  initTrackerTabs();
  renderTracker();
});

function initTrackerDate() {
  const input = document.getElementById('tracker-date');
  if (!input) return;

  input.value = trackerDate;
  input.addEventListener('change', () => {
    trackerDate = input.value || todayDate();
    renderTracker();
  });
}

function initTrackerTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(item => item.classList.remove('active'));
      contents.forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`content-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

function renderTracker() {
  const meals = readStorageJson(CONFIG.MEALS_LOG_KEY, []).filter(item => item.date === trackerDate);
  const workouts = readStorageJson(CONFIG.WORKOUT_LOG_KEY, []).filter(item => item.date === trackerDate);

  const totalCaloriesIn = meals.reduce((sum, item) => sum + Number(item.calories || 0), 0);
  const totalCaloriesOut = workouts.reduce((sum, item) => sum + Number(item.estimated_calories_burn || item.calories_out || 0), 0);

  document.getElementById('sum-cal-in').textContent = formatNumber(totalCaloriesIn);
  document.getElementById('sum-cal-out').textContent = formatNumber(totalCaloriesOut);
  document.getElementById('sum-meals').textContent = meals.length;
  document.getElementById('sum-workouts').textContent = workouts.length;
  document.getElementById('meals-count').textContent = meals.length;
  document.getElementById('workouts-count').textContent = workouts.length;

  renderMeals(meals);
  renderWorkouts(workouts);
}

function renderMeals(meals) {
  const container = document.getElementById('meals-list');
  if (!container) return;

  if (!meals.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Meal</div>
        <div class="empty-state-title">No meals logged</div>
        <p class="empty-state-text">Meals added from Food Scanner will appear here with calories, macros, and time.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = meals.map(meal => `
    <div class="log-item animate-fade-in-up">
      <div class="log-item-icon">Meal</div>
      <div class="log-item-info">
        <div class="log-item-title">${escapeHtml(meal.name || meal.description || 'Meal')}</div>
        <div class="log-item-meta">${meal.calories} kcal - P ${meal.protein_g || 0}g - C ${meal.carbs_g || 0}g - F ${meal.fat_g || 0}g</div>
        <div class="log-item-meta">${capitalize(meal.meal_time || 'meal')} - ${new Date(meal.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  `).join('');
}

function renderWorkouts(workouts) {
  const container = document.getElementById('workout-list');
  if (!container) return;

  if (!workouts.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Workout</div>
        <div class="empty-state-title">No workouts logged</div>
        <p class="empty-state-text">Completed workout exercises will appear here with sets, reps, duration, and burn estimate.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = workouts.map(workout => `
    <div class="log-item animate-fade-in-up">
      <div class="log-item-icon">Fit</div>
      <div class="log-item-info">
        <div class="log-item-title">${escapeHtml(workout.exercise_name || 'Workout')}</div>
        <div class="log-item-meta">${workout.sets || 0} sets - ${workout.reps || 0} reps - ${Math.round((workout.duration_seconds || 0) / 60)} min</div>
        <div class="log-item-meta">${workout.goal} - ${workout.muscle_group || 'Full Body'} - ${workout.estimated_calories_burn || 0} kcal - ${formatDate(workout.date)}</div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
