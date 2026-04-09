let workoutResponse = {};
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
let sessionId = null;
let sessionCompleted = false;

document.addEventListener('DOMContentLoaded', () => {
  bindWorkoutControls();
  loadWorkoutPlan();
});

function bindWorkoutControls() {
  document.getElementById('start-session-btn')?.addEventListener('click', handleStartSession);
  document.getElementById('pause-session-btn')?.addEventListener('click', togglePauseSession);
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
    weeklyPlan = Array.isArray(workoutResponse.plan) ? workoutResponse.plan : [];
    todayPlan = workoutResponse.today_plan || deriveTodayPlan(weeklyPlan);

    renderGoalHero(workoutResponse);
    renderWorkoutStats(buildWorkoutStats(workoutResponse, todayPlan, weeklyPlan));
    renderTodayPlan(todayPlan);
    renderWeeklyPlan(weeklyPlan);

    if (workoutResponse.active_session) {
      hydrateActiveSession(workoutResponse.active_session);
    } else {
      hydrateEmptySession();
      tryRestoreActiveSession();
    }
  } catch (error) {
    console.error('Failed to load workout plan:', error.payload || error);
    renderWorkoutError(error);
  }
}

function renderLoadingState() {
  setText('goal-label', 'Loading your workout goal...');
  setText('goal-badge', 'Goal Plan');
  setText('goal-summary', 'Building a workout from your latest profile, BMI, body-fat, and activity data.');
  setText('goal-eta', 'Goal ETA --');
  setText('goal-bmi-category', 'BMI --');
  setText('goal-bfp-category', 'BFP --');
  setText('today-plan-title', 'Loading today\'s plan...');
  setText('today-plan-meta', 'Fetching your guided workout session.');
  setText('today-plan-badge', 'Today');
  document.getElementById('exercises-container').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">Load</div>
      <div class="empty-state-title">Loading workout experience...</div>
      <p class="empty-state-text">Preparing your hero, exercise cards, stats, and session controls.</p>
    </div>
  `;
}

function renderWorkoutError(error) {
  const message = error?.status >= 500
    ? 'Workout service temporarily unavailable'
    : (error?.message || 'Could not load workout plan');

  setText('goal-label', 'Workout unavailable');
  setText('goal-summary', 'We could not load your latest workout plan right now. Please retry in a moment.');
  setText('today-plan-title', 'Workout unavailable');
  setText('today-plan-meta', 'Retry once the backend responds again.');
  document.getElementById('exercises-container').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">Warn</div>
      <div class="empty-state-title">${escapeHtml(message)}</div>
      <p class="empty-state-text">The workout service is temporarily unavailable. Your profile is still safe.</p>
      <button id="retry-workout-btn" class="btn btn-primary mt-2">Retry</button>
    </div>
  `;
  document.getElementById('weekly-plan-container').innerHTML = '';
  document.getElementById('retry-workout-btn')?.addEventListener('click', () => loadWorkoutPlan(false));
  hydrateEmptySession();
}

function renderGoalHero(response) {
  const goalLabel = response.goal_label || formatEnumLabel(response.goal || 'fit life plan');
  const goalBadge = response.goal_badge || goalLabel.toUpperCase();
  const goalWeeks = response.goal_eta_weeks ? `${response.goal_eta_weeks} week goal window` : 'Adaptive goal window';
  const bmiText = response.bmi_category || (response.bmi ? `BMI ${Number(response.bmi).toFixed(1)}` : 'BMI --');
  const bfpText = response.body_fat_category
    ? `BFP ${response.body_fat_category}`
    : (response.body_fat_percentage != null ? `BFP ${response.body_fat_percentage}%` : 'BFP --');

  const summaryParts = [];
  if (response.model_summary) summaryParts.push(response.model_summary);
  if (response.goal_confidence != null) summaryParts.push(`${Math.round(Number(response.goal_confidence) * 100)}% match confidence`);
  if (response.target_weight_kg != null) summaryParts.push(`Target ${response.target_weight_kg} kg`);
  if (response.target_bmi != null) summaryParts.push(`BMI goal ${response.target_bmi}`);
  if (response.target_body_fat_percentage != null) summaryParts.push(`BFP goal ${response.target_body_fat_percentage}%`);

  setText('goal-label', goalLabel);
  setText('goal-badge', goalBadge);
  setText('goal-summary', summaryParts.join(' | ') || 'This workout adapts to your current goal, body composition, and profile inputs.');
  setText('goal-eta', goalWeeks);
  setText('goal-bmi-category', bmiText);
  setText('goal-bfp-category', bfpText);

  const heroImage = document.getElementById('goal-hero-image');
  const fallback = document.getElementById('goal-hero-fallback');
  const heroImageUrl = normalizeMediaUrl(response.hero_image_url || '');

  if (heroImage && fallback) {
    if (heroImageUrl) {
      heroImage.src = heroImageUrl;
      heroImage.alt = `${goalLabel} workout banner`;
      heroImage.classList.remove('hidden');
      fallback.classList.add('hidden');
    } else {
      heroImage.removeAttribute('src');
      heroImage.classList.add('hidden');
      fallback.classList.remove('hidden');
    }
  }
}

function buildWorkoutStats(response, todayPlanItem, weeklyPlanItems) {
  if (response.workout_stats) {
    return {
      exercise_count: Number(response.workout_stats.exercise_count || 0),
      minutes: Number(response.workout_stats.minutes || 0),
      calories: Number(response.workout_stats.calories || 0)
    };
  }

  return {
    exercise_count: countExercises(todayPlanItem || weeklyPlanItems),
    minutes: Number(response.total_duration_min || 0),
    calories: Number(response.total_estimated_calories_burn || 0)
  };
}

function renderWorkoutStats(stats) {
  setText('stats-exercises', stats.exercise_count || 0);
  setText('stats-minutes', stats.minutes || 0);
  setText('stats-calories', stats.calories || 0);
}

function deriveTodayPlan(planItems) {
  if (!Array.isArray(planItems) || !planItems.length) return null;

  const todayName = getDayName();
  const directMatch = planItems.find((item) => item.day === todayName && Array.isArray(item.exercises) && item.exercises.length);
  if (directMatch) return directMatch;

  return planItems.find((item) => Array.isArray(item.exercises) && item.exercises.length) || planItems[0] || null;
}

function countExercises(planInput) {
  if (Array.isArray(planInput)) {
    return planInput.reduce((sum, item) => sum + ((item.exercises || []).length), 0);
  }
  return Array.isArray(planInput?.exercises) ? planInput.exercises.length : 0;
}

function renderTodayPlan(planItem) {
  const badgeText = planItem?.day === getDayName() ? 'Today' : (planItem?.day || 'Plan');
  setText('today-plan-badge', badgeText);

  if (!planItem || !Array.isArray(planItem.exercises) || !planItem.exercises.length) {
    setText('today-plan-title', 'No workout scheduled');
    setText('today-plan-meta', 'Save or update your health profile to generate a new guided session.');
    document.getElementById('exercises-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Rest</div>
        <div class="empty-state-title">No exercises available</div>
        <p class="empty-state-text">We could not find a workout for today. Update your profile or check your weekly plan below.</p>
      </div>
    `;
    updateSessionControls();
    return;
  }

  const minutes = Number(
    planItem.total_duration_min ||
    planItem.exercises.reduce((sum, item) => sum + Number(item.estimated_duration_min || item.duration_min || 0), 0)
  );
  const calories = Number(
    planItem.total_estimated_calories_burn ||
    planItem.exercises.reduce((sum, item) => sum + Number(item.estimated_calories_burn || 0), 0)
  );

  setText('today-plan-title', `${planItem.plan_name || 'Today\'s Workout'}${planItem.day ? ` - ${planItem.day}` : ''}`);
  setText('today-plan-meta', `${planItem.exercises.length} exercises | ${minutes} min | ${calories} kcal`);

  document.getElementById('exercises-container').innerHTML = planItem.exercises
    .map((exercise, index) => renderExerciseCard(exercise, index))
    .join('');

  highlightExerciseCards();
  updateSessionControls();
}

function renderExerciseCard(exercise, index) {
  const mediaMarkup = renderExerciseMedia(exercise);
  const detailBits = [];
  if (exercise.sets) detailBits.push(`${exercise.sets} sets`);
  if (exercise.reps) detailBits.push(`${exercise.reps} reps`);
  if (exercise.duration_seconds) detailBits.push(`${exercise.duration_seconds} sec`);
  if (exercise.rest_seconds) detailBits.push(`${exercise.rest_seconds} sec rest`);
  if (exercise.estimated_calories_burn) detailBits.push(`${exercise.estimated_calories_burn} kcal`);

  return `
    <article class="card exercise-card animate-fade-in-up ${index === currentExerciseIndex ? 'exercise-card-active' : ''}" id="exercise-card-${index}" style="animation-delay:${index * 0.05}s;">
      <div class="card-body exercise-card-body">
        <div class="exercise-visual">${mediaMarkup}</div>
        <div class="exercise-copy">
          <div class="exercise-name">${escapeHtml(exercise.name || 'Exercise')}</div>
          <div class="exercise-meta">${escapeHtml(detailBits.join(' | ') || `${exercise.estimated_duration_min || exercise.duration_min || 0} min`)}</div>
          <div class="exercise-posture-box">
            <div class="exercise-posture-label">${escapeHtml(exercise.muscle_group || 'Movement focus')}</div>
            <div class="exercise-posture-title">${escapeHtml(exercise.description || 'Controlled movement with strong posture.')}</div>
            <div class="exercise-posture-cues">${escapeHtml(buildInstructionSummary(exercise))}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderExerciseMedia(exercise) {
  const mediaUrl = resolveExerciseMedia(exercise);
  if (mediaUrl) {
    return `<img src="${mediaUrl}" alt="${escapeHtml(exercise.name || 'Exercise')}" class="exercise-media">`;
  }

  return `
    <div class="exercise-media-fallback">
      <div class="exercise-media-fallback-icon">FIT</div>
      <div class="exercise-media-fallback-title">${escapeHtml(exercise.name || 'Exercise')}</div>
      <div class="exercise-media-fallback-copy">${escapeHtml(exercise.description || 'Demo not available')}</div>
      <div class="exercise-media-fallback-meta">${escapeHtml(buildInstructionSummary(exercise))}</div>
    </div>
  `;
}

function renderWeeklyPlan(planItems) {
  const container = document.getElementById('weekly-plan-container');
  if (!container) return;

  if (!Array.isArray(planItems) || !planItems.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Week</div>
        <div class="empty-state-title">No weekly plan available</div>
        <p class="empty-state-text">Once your workout plan is generated, your weekly structure will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = planItems.map((planItem) => {
    const previewExercises = (planItem.exercises || []).slice(0, 3);
    return `
      <div class="workout-week-card ${planItem.day === getDayName() ? 'workout-week-card-today' : ''}">
        <div class="workout-week-head">
          <div>
            <div class="weekly-plan-title">${escapeHtml(planItem.day || '--')}</div>
            <div class="weekly-plan-meta">${escapeHtml(planItem.plan_name || 'Workout plan')}</div>
          </div>
          <span class="badge ${planItem.day === getDayName() ? 'badge-accent' : 'badge-info'}">${planItem.day === getDayName() ? 'Today' : 'Planned'}</span>
        </div>
        <div class="workout-week-summary">${(planItem.exercises || []).length} exercises | ${Number(planItem.total_duration_min || 0)} min | ${Number(planItem.total_estimated_calories_burn || 0)} kcal</div>
        <div class="weekly-plan-list">
          ${previewExercises.map((exercise) => `
            <div class="weekly-plan-item">
              <div class="weekly-plan-visual">${renderExerciseMedia(exercise)}</div>
              <div class="weekly-plan-copy">
                <div class="weekly-plan-exercise-title">${escapeHtml(exercise.name || 'Exercise')}</div>
                <div class="weekly-plan-exercise-meta">${escapeHtml(buildCompactExerciseMeta(exercise))}</div>
                <div class="weekly-plan-posture">${escapeHtml(exercise.muscle_group || 'Workout focus')}</div>
                <div class="weekly-plan-cues">${escapeHtml(exercise.description || buildInstructionSummary(exercise))}</div>
              </div>
            </div>
          `).join('')}
          ${previewExercises.length ? '' : `
            <div class="empty-state">
              <div class="empty-state-title">Recovery day</div>
              <p class="empty-state-text">No exercises listed for this day.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function hydrateEmptySession() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  timerRemaining = 0;
  timerMode = 'exercise';
  sessionId = null;
  sessionCompleted = false;
  currentExerciseIndex = 0;
  completedExercises = [];
  totalDurationSeconds = 0;
  totalCaloriesBurned = 0;

  document.getElementById('completion-summary')?.classList.add('hidden');
  document.getElementById('timer-section')?.classList.add('hidden');
  updateTimerPanel();
  highlightExerciseCards();
  updateSessionControls();
}

async function tryRestoreActiveSession() {
  try {
    const activeSession = await workoutAPI.getActiveSession();
    if (activeSession) {
      hydrateActiveSession(activeSession);
    }
  } catch (error) {
    if (error?.status !== 404) {
      console.error('Failed to restore active workout session:', error.payload || error);
    }
  }
}

function hydrateActiveSession(session) {
  sessionId = session.id || session.session_id || sessionId;
  sessionCompleted = false;
  currentExerciseIndex = Number(session.current_exercise_index || 0);
  completedExercises = Array.isArray(session.completed_exercises)
    ? session.completed_exercises.map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean)
    : [];
  totalDurationSeconds = Number(session.total_duration_seconds || 0);
  totalCaloriesBurned = Number(session.total_calories_burned || 0);
  timerMode = 'exercise';
  timerRemaining = resolveSessionTimerSeed(session);

  document.getElementById('timer-section')?.classList.remove('hidden');
  document.getElementById('completion-summary')?.classList.add('hidden');
  updateTimerPanel();
  highlightExerciseCards();
  updateSessionControls();
}

function resolveSessionTimerSeed(session) {
  const currentExercise = session.current_exercise || getCurrentExercise();
  return currentExercise ? getExerciseSeconds(currentExercise) : 0;
}

async function handleStartSession() {
  if (!todayPlan?.exercises?.length) {
    showToast('No workout is scheduled for today.', 'warning');
    return;
  }

  if (!sessionId) {
    try {
      const response = await workoutAPI.startSession({ day: todayPlan.day || getDayName() });
      hydrateActiveSession(response.active_session || response.session || response);
      showToast('Workout session started', 'success');
    } catch (error) {
      console.error('Failed to start workout session:', error.payload || error);
      showToast(error.message || 'Could not start workout session', 'error');
      return;
    }
  }

  if (!getCurrentExercise()) {
    renderCompletionSummary();
    return;
  }

  if (!timerRemaining) {
    timerMode = 'exercise';
    timerRemaining = getExerciseSeconds(getCurrentExercise());
  }

  startTimerLoop();
}

function startTimerLoop() {
  clearInterval(timerInterval);
  timerRunning = true;
  document.getElementById('timer-section')?.classList.remove('hidden');
  document.getElementById('completion-summary')?.classList.add('hidden');
  updateSessionControls();
  updateTimerPanel();

  timerInterval = setInterval(() => {
    timerRemaining = Math.max(0, timerRemaining - 1);
    totalDurationSeconds += 1;
    updateTimerPanel();

    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning = false;

      const exercise = getCurrentExercise();
      if (!exercise) {
        renderCompletionSummary();
        return;
      }

      if (timerMode === 'exercise' && Number(exercise.rest_seconds || 0) > 0) {
        timerMode = 'rest';
        timerRemaining = Number(exercise.rest_seconds || 0);
        startTimerLoop();
      } else {
        showToast(`${exercise.name || 'Exercise'} timer complete`, 'success');
        updateSessionControls();
      }
    }
  }, 1000);
}

function togglePauseSession() {
  if (!sessionId && !timerRunning) {
    showToast('Start a workout before pausing it.', 'warning');
    return;
  }

  if (timerRunning) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    updateSessionControls();
    showToast('Workout paused', 'info');
    return;
  }

  if (getCurrentExercise()) {
    startTimerLoop();
    showToast('Workout resumed', 'success');
  }
}

async function completeCurrentExercise() {
  const exercise = getCurrentExercise();
  if (!exercise) return;

  if (!sessionId) {
    await handleStartSession();
    if (!sessionId) return;
  }

  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;

  const caloriesEarned = Number(exercise.estimated_calories_burn || 0);
  totalCaloriesBurned += caloriesEarned;

  try {
    const response = await workoutAPI.completeExercise(sessionId, {
      duration_seconds: getExerciseSeconds(exercise),
      calories_burned: caloriesEarned
    });

    completedExercises.push(exercise.name || `Exercise ${currentExerciseIndex + 1}`);
    currentExerciseIndex += 1;
    timerMode = 'exercise';
    timerRemaining = getCurrentExercise() ? getExerciseSeconds(getCurrentExercise()) : 0;

    const returnedSession = response.active_session || response.session || response;
    if (returnedSession && typeof returnedSession === 'object') {
      sessionId = returnedSession.id || returnedSession.session_id || sessionId;
      totalDurationSeconds = Number(returnedSession.total_duration_seconds || totalDurationSeconds);
      totalCaloriesBurned = Number(returnedSession.total_calories_burned || totalCaloriesBurned);
    }

    if (!getCurrentExercise()) {
      await completeWholeWorkout();
      return;
    }

    updateTimerPanel();
    highlightExerciseCards();
    updateSessionControls();
    showToast(`${exercise.name || 'Exercise'} completed`, 'success');
  } catch (error) {
    console.error('Failed to complete exercise:', error.payload || error);
    showToast(error.message || 'Could not complete this exercise', 'error');
  }
}

async function completeWholeWorkout() {
  if (!sessionId) {
    renderCompletionSummary();
    return;
  }

  try {
    await workoutAPI.completeSession(sessionId, {
      total_duration_seconds: totalDurationSeconds,
      total_calories_burned: totalCaloriesBurned,
      log_date: new Date().toISOString().slice(0, 10)
    });
  } catch (error) {
    console.error('Failed to complete workout session:', error.payload || error);
  }

  sessionCompleted = true;
  renderCompletionSummary();
  updateSessionControls();
  showToast('Workout complete!', 'success');

  try {
    await loadWorkoutPlan(false);
  } catch {
    // The completion summary is already visible, so the user still sees success.
  }
}

async function resetWorkoutSession(showToastMessage = true) {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;

  if (sessionId) {
    try {
      await workoutAPI.resetSession(sessionId);
    } catch (error) {
      console.error('Failed to reset workout session:', error.payload || error);
      showToast(error.message || 'Could not reset workout session', 'error');
      return;
    }
  }

  hydrateEmptySession();
  if (showToastMessage) {
    showToast('Workout reset', 'success');
  }
}

function renderCompletionSummary() {
  document.getElementById('completion-summary')?.classList.remove('hidden');
  setText('complete-goal', workoutResponse.goal_label || formatEnumLabel(workoutResponse.goal || 'Workout'));
  setText('complete-exercises', completedExercises.length);
  setText('complete-minutes', Math.round(totalDurationSeconds / 60));
  setText('complete-calories', Math.round(totalCaloriesBurned));
  document.getElementById('timer-section')?.classList.add('hidden');
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
    setText('active-exercise-name', sessionCompleted ? 'Workout complete' : 'Ready to start');
    setText('active-exercise-meta', sessionCompleted
      ? 'You finished every exercise in today\'s session.'
      : 'Start your workout to begin the guided timer and progress flow.'
    );
    setText('timer-display', '00:00');
    setText('next-exercise-name', '--');
    setText('next-exercise-meta', '--');
    document.getElementById('active-media-block').innerHTML = renderExerciseMedia({
      name: sessionCompleted ? 'Workout Complete' : 'Ready Session',
      description: sessionCompleted ? 'Recovery, hydration, and mobility time.' : 'Your active exercise media will appear here once the session starts.'
    });
    return;
  }

  setText('active-exercise-name', exercise.name || 'Exercise');
  setText('active-exercise-meta', buildCompactExerciseMeta(exercise));
  setText('timer-display', formatTimer(timerRemaining || getExerciseSeconds(exercise)));
  setText('next-exercise-name', nextExercise?.name || 'Finish line');
  setText('next-exercise-meta', nextExercise ? buildCompactExerciseMeta(nextExercise) : 'Complete this exercise to finish the workout');
  document.getElementById('active-media-block').innerHTML = renderExerciseMedia(exercise);
}

function updateSessionControls() {
  const hasWorkout = !!todayPlan?.exercises?.length;
  const hasExercise = !!getCurrentExercise();

  const startBtn = document.getElementById('start-session-btn');
  const pauseBtn = document.getElementById('pause-session-btn');
  const completeBtn = document.getElementById('complete-current-btn');
  const resetBtn = document.getElementById('reset-session-btn');

  if (startBtn) {
    startBtn.disabled = !hasWorkout || sessionCompleted;
    startBtn.textContent = sessionId
      ? (timerRunning ? 'Running' : 'Resume')
      : 'Start Workout';
  }

  if (pauseBtn) {
    pauseBtn.classList.toggle('hidden', !sessionId || !hasExercise);
    pauseBtn.disabled = !sessionId || !hasExercise;
    pauseBtn.textContent = timerRunning ? 'Pause' : 'Resume Timer';
  }

  if (completeBtn) {
    completeBtn.classList.toggle('hidden', !sessionId || !hasExercise);
    completeBtn.disabled = !sessionId || !hasExercise;
  }

  if (resetBtn) {
    resetBtn.classList.toggle('hidden', !sessionId && !completedExercises.length && !timerRunning);
    resetBtn.disabled = !sessionId && !completedExercises.length && !timerRunning;
  }
}

function getCurrentExercise() {
  if (!todayPlan?.exercises?.length) return null;
  return todayPlan.exercises[currentExerciseIndex] || null;
}

function getNextExercise() {
  if (!todayPlan?.exercises?.length) return null;
  return todayPlan.exercises[currentExerciseIndex + 1] || null;
}

function highlightExerciseCards() {
  document.querySelectorAll('[id^="exercise-card-"]').forEach((card, index) => {
    card.classList.toggle('completed', index < completedExercises.length);
    card.classList.toggle('exercise-card-active', index === currentExerciseIndex && !!getCurrentExercise());
  });
}

function getExerciseSeconds(exercise) {
  const durationSeconds = Number(exercise.duration_seconds || 0);
  if (durationSeconds > 0) return durationSeconds;

  const estimatedMinutes = Number(exercise.estimated_duration_min || exercise.duration_min || 0);
  return Math.max(30, estimatedMinutes * 60 || 60);
}

function resolveExerciseMedia(exercise) {
  const media = exercise?.demo_media_url || exercise?.image_url || exercise?.video_url || '';
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

function buildCompactExerciseMeta(exercise) {
  const parts = [];
  if (exercise.sets) parts.push(`${exercise.sets} sets`);
  if (exercise.reps) parts.push(`${exercise.reps} reps`);
  if (exercise.duration_seconds) parts.push(`${exercise.duration_seconds} sec`);
  else if (exercise.estimated_duration_min || exercise.duration_min) parts.push(`${exercise.estimated_duration_min || exercise.duration_min} min`);
  if (exercise.rest_seconds) parts.push(`${exercise.rest_seconds} sec rest`);
  if (exercise.estimated_calories_burn) parts.push(`${exercise.estimated_calories_burn} kcal`);
  return parts.join(' | ') || 'Guided movement';
}

function buildInstructionSummary(exercise) {
  const parts = [];
  if (Array.isArray(exercise.instructions) && exercise.instructions.length) {
    parts.push(exercise.instructions.slice(0, 2).join(' '));
  }
  if (Array.isArray(exercise.exercise_tips) && exercise.exercise_tips.length) {
    parts.push(exercise.exercise_tips.slice(0, 2).join(' '));
  }
  return parts.join(' ') || 'Stay controlled, breathe steadily, and keep your movement range clean.';
}

function formatTimer(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

window.addEventListener('beforeunload', () => clearInterval(timerInterval));
