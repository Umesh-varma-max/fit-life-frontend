let workoutResponse = null;
let weeklyPlan = [];
let todayPlan = null;
let currentExerciseIndex = 0;
let completedExercises = [];
let totalDurationSeconds = 0;
let totalCaloriesBurned = 0;
let timerInterval = null;
let timerRemaining = 0;
let timerMode = 'exercise';
let timerRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  bindWorkoutControls();
  loadWorkoutPlan();
});

function bindWorkoutControls() {
  document.getElementById('start-session-btn')?.addEventListener('click', startCurrentExerciseTimer);
  document.getElementById('complete-current-btn')?.addEventListener('click', completeCurrentExercise);
  document.getElementById('reset-session-btn')?.addEventListener('click', resetWorkoutSession);
}

async function loadWorkoutPlan(showLoading = true) {
  if (showLoading) {
    renderLoadingState();
  }

  try {
    const response = await workoutAPI.getPlan();
    workoutResponse = response || {};
    weeklyPlan = response.plan || [];
    todayPlan = response.today_plan || deriveTodayPlan(weeklyPlan);

    renderGoalHero(response);
    renderWorkoutStats(buildWorkoutStats(response, todayPlan, weeklyPlan));
    renderTodayPlan(todayPlan);
    renderWeeklyPlan(weeklyPlan);
    resetWorkoutSession(false);
  } catch (error) {
    console.error('Failed to load workout plan:', error.payload || error);
    renderWorkoutError(error);
  }
}

function renderLoadingState() {
  setText('goal-label', 'Loading your workout plan...');
  setText('goal-summary', 'Fetching your current weekly workout from the backend.');
  setText('goal-badge', 'Workout');
  setText('goal-eta', 'Stable plan');
  setText('goal-bmi-category', 'Source loading');
  setText('goal-bfp-category', 'Plan loading');
  setText('today-plan-title', 'Loading today\'s workout...');
  setText('today-plan-meta', 'Preparing your current workout activity list.');
  document.getElementById('exercises-container').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">Load</div>
      <div class="empty-state-title">Loading workout plan...</div>
      <p class="empty-state-text">Your exercises, duration, and calories will appear here shortly.</p>
    </div>
  `;
}

function renderWorkoutError(error) {
  const message = error?.status === 500
    ? 'Workout service temporarily unavailable'
    : (error?.message || 'Could not load workout plan');

  document.getElementById('exercises-container').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">Warn</div>
      <div class="empty-state-title">${escapeHtml(message)}</div>
      <p class="empty-state-text">Please try again in a moment.</p>
      <button id="retry-workout-btn" class="btn btn-primary mt-2">Retry</button>
    </div>
  `;

  document.getElementById('retry-workout-btn')?.addEventListener('click', () => loadWorkoutPlan(false));
  setText('today-plan-title', 'Workout unavailable');
  setText('today-plan-meta', 'Retry once the service responds again.');
}

function renderGoalHero(response) {
  const goalLabel = formatEnumLabel(response.goal || response.template_key || 'maintenance');
  const sourceLabel = formatEnumLabel(response.source || 'backend');
  const activeDays = response.active_days || countActiveDays(weeklyPlan);
  const totalDays = response.total_days || (weeklyPlan.length || 7);

  setText('goal-label', goalLabel);
  setText('goal-badge', goalLabel.toUpperCase());
  setText('goal-summary', `${sourceLabel} workout plan with ${activeDays} active days across ${totalDays} days.`);
  setText('goal-eta', `${response.total_duration_min || 0} min total`);
  setText('goal-bmi-category', `Source ${sourceLabel}`);
  setText('goal-bfp-category', `${activeDays}/${totalDays} active days`);

  const heroImage = document.getElementById('goal-hero-image');
  const fallback = document.getElementById('goal-hero-fallback');
  heroImage?.classList.add('hidden');
  fallback?.classList.remove('hidden');
}

function buildWorkoutStats(response, todayPlanItem, weeklyPlanItems) {
  if (response.workout_stats) {
    return response.workout_stats;
  }

  return {
    exercise_count: countExercises(todayPlanItem || weeklyPlanItems),
    minutes: response.total_duration_min || 0,
    calories: response.total_estimated_calories_burn || 0
  };
}

function countExercises(planInput) {
  if (Array.isArray(planInput)) {
    return planInput.reduce((sum, item) => sum + ((item.exercises || []).length), 0);
  }
  return Array.isArray(planInput?.exercises) ? planInput.exercises.length : 0;
}

function countActiveDays(planItems) {
  return (planItems || []).filter((item) => Array.isArray(item.exercises) && item.exercises.length).length;
}

function deriveTodayPlan(planItems) {
  if (!Array.isArray(planItems) || !planItems.length) return null;

  const todayName = getDayName();
  const directMatch = planItems.find((item) => item.day === todayName && Array.isArray(item.exercises) && item.exercises.length);
  if (directMatch) return directMatch;

  return planItems.find((item) => Array.isArray(item.exercises) && item.exercises.length) || planItems[0] || null;
}

function renderWorkoutStats(stats) {
  setText('stats-exercises', stats.exercise_count || 0);
  setText('stats-minutes', stats.minutes || 0);
  setText('stats-calories', stats.calories || 0);
}

function renderTodayPlan(planItem) {
  if (!planItem || !Array.isArray(planItem.exercises) || !planItem.exercises.length) {
    setText('today-plan-title', 'No workout available');
    setText('today-plan-meta', 'There is no exercise list for today yet. Try updating your profile or check another day in the weekly plan.');
    document.getElementById('exercises-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Rest</div>
        <div class="empty-state-title">No exercises found</div>
        <p class="empty-state-text">We could not find a workout for today. The first available workout day will still appear below.</p>
      </div>
    `;
    return;
  }

  currentExerciseIndex = 0;
  const title = `${planItem.day || getDayName()} · ${planItem.plan_name || 'Workout Activity'}`;
  const minutes = planItem.total_duration_min || planItem.exercises.reduce((sum, item) => sum + Number(item.estimated_duration_min || item.duration_min || 0), 0);
  const calories = planItem.total_estimated_calories_burn || planItem.exercises.reduce((sum, item) => sum + Number(item.estimated_calories_burn || 0), 0);

  setText('today-plan-title', title);
  setText('today-plan-meta', `${planItem.exercises.length} exercises · ${minutes} min · ${calories} kcal`);
  document.getElementById('exercises-container').innerHTML = planItem.exercises.map((exercise, index) => renderExerciseCard(exercise, index)).join('');
  highlightExerciseCards();
}

function renderExerciseCard(exercise, index) {
  const mediaUrl = resolveExerciseMedia(exercise);
  const meta = buildExerciseMeta(exercise);
  const posture = exercise.posture || exercise.description || 'Controlled posture';
  const postureCues = Array.isArray(exercise.posture_cues) ? exercise.posture_cues.join(' ') : '';

  return `
    <article class="card exercise-card animate-fade-in-up ${index === currentExerciseIndex ? 'exercise-card-active' : ''}" id="exercise-card-${index}" style="animation-delay:${index * 0.06}s;">
      <div class="card-body exercise-card-body">
        <div class="exercise-visual">
          ${mediaUrl
            ? `<img src="${mediaUrl}" alt="${escapeHtml(exercise.name || 'Exercise')}" class="exercise-media">`
            : renderExerciseFallback(exercise)}
        </div>
        <div class="exercise-copy">
          <div class="exercise-name">${escapeHtml(exercise.name || 'Exercise')}</div>
          <div class="exercise-meta">${meta}</div>
          <div class="exercise-posture-box">
            <div class="exercise-posture-label">Posture</div>
            <div class="exercise-posture-title">${escapeHtml(posture)}</div>
            <div class="exercise-posture-cues">${escapeHtml(postureCues || 'Keep stable posture and controlled movement throughout the exercise.')}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderExerciseFallback(exercise) {
  return `
    <div class="exercise-media-fallback">
      <div class="exercise-media-fallback-icon">FIT</div>
      <div class="exercise-media-fallback-title">${escapeHtml(exercise.name || 'Exercise')}</div>
      <div class="exercise-media-fallback-copy">${escapeHtml(exercise.posture || exercise.description || 'Demo not available')}</div>
      <div class="exercise-media-fallback-meta">${escapeHtml(Array.isArray(exercise.posture_cues) ? exercise.posture_cues[0] : 'Follow the posture cue text beside this exercise.')}</div>
    </div>
  `;
}

function buildExerciseMeta(exercise) {
  const parts = [];
  if (exercise.sets) parts.push(`${exercise.sets} sets`);
  if (exercise.reps) parts.push(`${exercise.reps} reps`);
  parts.push(`${exercise.estimated_duration_min || exercise.duration_min || 0} min`);
  parts.push(`${exercise.estimated_calories_burn || 0} kcal`);
  return parts.join(' · ');
}

function renderWeeklyPlan(planItems) {
  const container = document.getElementById('weekly-plan-container');
  if (!container) return;

  if (!planItems.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Week</div>
        <div class="empty-state-title">No weekly goal plan</div>
        <p class="empty-state-text">Save your health profile to generate a workout plan.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = planItems.map((planItem) => `
    <div class="workout-week-card ${planItem.day === getDayName() ? 'workout-week-card-today' : ''}">
      <div class="workout-week-head">
        <div>
          <div class="weekly-plan-title">${escapeHtml(planItem.day || '--')}</div>
          <div class="weekly-plan-meta">${escapeHtml(planItem.plan_name || planItem.focus_area || 'Workout focus')}</div>
        </div>
        <span class="badge ${planItem.day === getDayName() ? 'badge-accent' : 'badge-info'}">${planItem.day === getDayName() ? 'Today' : 'Planned'}</span>
      </div>
      <div class="workout-week-summary">${(planItem.exercises || []).length} exercises · ${planItem.total_duration_min || 0} min · ${planItem.total_estimated_calories_burn || 0} kcal</div>
      <div class="weekly-plan-list">
        ${(planItem.exercises || []).map((exercise) => `
          <div class="weekly-plan-item">
            <div class="weekly-plan-visual">
              ${resolveExerciseMedia(exercise)
                ? `<img src="${resolveExerciseMedia(exercise)}" alt="${escapeHtml(exercise.name || 'Exercise')}" class="exercise-media">`
                : renderExerciseFallback(exercise)}
            </div>
            <div class="weekly-plan-copy">
              <div class="weekly-plan-exercise-title">${escapeHtml(exercise.name || 'Exercise')}</div>
              <div class="weekly-plan-exercise-meta">${buildExerciseMeta(exercise)}</div>
              <div class="weekly-plan-posture">${escapeHtml(exercise.posture || 'Controlled posture')}</div>
              <div class="weekly-plan-cues">${escapeHtml(Array.isArray(exercise.posture_cues) ? exercise.posture_cues.join(' ') : 'Follow the posture cues for safe movement.')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function startCurrentExerciseTimer() {
  if (!todayPlan || !todayPlan.exercises || !todayPlan.exercises.length) {
    showToast('No workout is scheduled right now.', 'warning');
    return;
  }

  const exercise = getCurrentExercise();
  if (!exercise) {
    renderCompletionSummary();
    return;
  }

  if (!timerRemaining) {
    timerMode = 'exercise';
    timerRemaining = getExerciseSeconds(exercise);
  }

  clearInterval(timerInterval);
  timerRunning = true;
  document.getElementById('timer-section')?.classList.remove('hidden');
  document.getElementById('complete-current-btn')?.classList.remove('hidden');
  document.getElementById('reset-session-btn')?.classList.remove('hidden');
  document.getElementById('start-session-btn').textContent = 'Resume';

  updateTimerPanel();

  timerInterval = setInterval(() => {
    timerRemaining = Math.max(0, timerRemaining - 1);
    totalDurationSeconds += 1;
    updateTimerPanel();

    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      if (timerMode === 'exercise' && Number(exercise.rest_seconds || 0) > 0) {
        timerMode = 'rest';
        timerRemaining = Number(exercise.rest_seconds || 0);
        startCurrentExerciseTimer();
      } else {
        showToast(`${exercise.name || 'Exercise'} timer complete`, 'success');
      }
    }
  }, 1000);
}

function completeCurrentExercise() {
  const exercise = getCurrentExercise();
  if (!exercise) return;

  clearInterval(timerInterval);
  timerRunning = false;
  totalCaloriesBurned += Number(exercise.estimated_calories_burn || 0);
  completedExercises.push(exercise.name || `Exercise ${currentExerciseIndex + 1}`);
  currentExerciseIndex += 1;
  timerMode = 'exercise';
  timerRemaining = 0;

  highlightExerciseCards();
  updateTimerPanel();

  if (!getCurrentExercise()) {
    renderCompletionSummary();
    showToast('Workout complete!', 'success');
    return;
  }

  showToast(`${exercise.name || 'Exercise'} completed`, 'success');
}

function resetWorkoutSession(showToastMessage = true) {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  currentExerciseIndex = 0;
  completedExercises = [];
  totalDurationSeconds = 0;
  totalCaloriesBurned = 0;
  timerRemaining = 0;
  timerMode = 'exercise';

  document.getElementById('completion-summary')?.classList.add('hidden');
  document.getElementById('timer-section')?.classList.add('hidden');
  document.getElementById('complete-current-btn')?.classList.add('hidden');
  document.getElementById('reset-session-btn')?.classList.add('hidden');

  const startBtn = document.getElementById('start-session-btn');
  if (startBtn) {
    startBtn.textContent = todayPlan?.exercises?.length ? 'Start Workout' : 'No Workout Today';
    startBtn.disabled = !(todayPlan?.exercises?.length);
  }

  updateTimerPanel();
  highlightExerciseCards();

  if (showToastMessage) {
    showToast('Workout reset', 'success');
  }
}

function updateTimerPanel() {
  const exercise = getCurrentExercise();
  const nextExercise = getNextExercise();

  setText('session-status-badge', timerMode === 'rest' ? 'Rest Time' : 'Exercise Time');
  setText('timer-phase-label', timerMode === 'rest' ? 'Rest Time' : 'Exercise Time');
  setText('completed-count', `${completedExercises.length} completed`);
  setText('duration-so-far', `${Math.round(totalDurationSeconds)} sec`);
  setText('calories-so-far', `${Math.round(totalCaloriesBurned)} kcal`);

  if (!exercise) {
    setText('active-exercise-name', 'Workout complete');
    setText('active-exercise-meta', 'You finished all planned exercises for this workout.');
    setText('timer-display', '00:00');
    setText('next-exercise-name', '--');
    setText('next-exercise-meta', '--');
    document.getElementById('active-media-block').innerHTML = renderExerciseFallback({ name: 'Workout Complete', posture: 'Recovery and hydration time' });
    return;
  }

  setText('active-exercise-name', exercise.name || 'Exercise');
  setText('active-exercise-meta', buildExerciseMeta(exercise));
  setText('timer-display', formatTimer(timerRemaining || getExerciseSeconds(exercise)));
  setText('next-exercise-name', nextExercise?.name || 'Last exercise');
  setText('next-exercise-meta', nextExercise ? buildExerciseMeta(nextExercise) : 'Finish this exercise to complete the workout');
  renderActiveMedia(exercise);
}

function renderActiveMedia(exercise) {
  const block = document.getElementById('active-media-block');
  if (!block) return;
  const mediaUrl = resolveExerciseMedia(exercise);
  block.innerHTML = mediaUrl
    ? `<img src="${mediaUrl}" alt="${escapeHtml(exercise.name || 'Exercise')}" class="exercise-media">`
    : renderExerciseFallback(exercise);
}

function renderCompletionSummary() {
  document.getElementById('completion-summary')?.classList.remove('hidden');
  setText('complete-goal', formatEnumLabel(workoutResponse?.goal || workoutResponse?.template_key || 'plan'));
  setText('complete-exercises', completedExercises.length);
  setText('complete-minutes', Math.round(totalDurationSeconds / 60));
  setText('complete-calories', Math.round(totalCaloriesBurned));
}

function getCurrentExercise() {
  return todayPlan?.exercises?.[currentExerciseIndex] || null;
}

function getNextExercise() {
  return todayPlan?.exercises?.[currentExerciseIndex + 1] || null;
}

function highlightExerciseCards() {
  document.querySelectorAll('[id^="exercise-card-"]').forEach((card, index) => {
    card.classList.toggle('completed', index < completedExercises.length);
    card.classList.toggle('exercise-card-active', index === currentExerciseIndex && !!getCurrentExercise());
  });
}

function getExerciseSeconds(exercise) {
  const fromEstimated = Number(exercise.estimated_duration_min || exercise.duration_min || 0) * 60;
  return Math.max(30, fromEstimated || 60);
}

function resolveExerciseMedia(exercise) {
  const media = exercise?.gif_url || exercise?.image_url || exercise?.video_url || exercise?.demo_media_url || '';
  return normalizeMediaUrl(media);
}

function normalizeMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || /^data:/i.test(url)) return url;
  if (url.startsWith('/')) {
    return `${CONFIG.API_BASE.replace(/\/api$/, '')}${url}`;
  }
  return url;
}

function formatTimer(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

window.addEventListener('beforeunload', () => clearInterval(timerInterval));
