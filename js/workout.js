let workoutPlanData = null;
let todayPlan = null;
let activeSession = null;
let currentExerciseIndex = 0;
let completedExercises = [];
let totalDurationSeconds = 0;
let totalCaloriesBurned = 0;
let timerInterval = null;
let timerRemaining = 0;
let timerPhase = 'exercise';
let sessionRunning = false;
let sessionStartedAt = 0;

document.addEventListener('DOMContentLoaded', () => {
  bindWorkoutControls();
  loadWorkoutPlan();
});

function bindWorkoutControls() {
  document.getElementById('start-session-btn')?.addEventListener('click', handleStartOrResume);
  document.getElementById('complete-current-btn')?.addEventListener('click', completeCurrentExercise);
  document.getElementById('reset-session-btn')?.addEventListener('click', resetWorkoutSession);
}

async function loadWorkoutPlan(showLoading = true) {
  if (showLoading) {
    renderLoadingState();
  }

  try {
    const data = await workoutAPI.getPlan();
    workoutPlanData = data;
    todayPlan = data.today_plan || inferTodayPlan(data.plan || []);

    renderGoalHero(data);
    renderWorkoutStats(data.workout_stats || {});
    renderTodayPlan(todayPlan);
    renderWeeklyPlan(data.plan || []);

    if (data.active_session) {
      hydrateActiveSession(data.active_session);
      renderSessionState();
      return;
    }

    try {
      const activeData = await workoutAPI.getActiveSession();
      const session = activeData.active_session || activeData.session || activeData;
      if (session && (session.id || session.session_id)) {
        hydrateActiveSession(session);
        renderSessionState();
        return;
      }
    } catch (error) {
      if (error.status !== 404) {
        console.error('Failed to fetch active workout session:', error);
      }
    }

    clearSessionState();
    renderSessionState();
  } catch (error) {
    console.error('Failed to load workout plan:', error);
    renderWorkoutError(error.message || 'Failed to load your workout plan.');
  }
}

function renderLoadingState() {
  document.getElementById('goal-label').textContent = 'Refreshing your workout plan...';
  document.getElementById('goal-summary').textContent = 'Using your latest profile to rebuild goal, BMI, and body-fat aware workouts.';
  document.getElementById('today-plan-title').textContent = 'Loading today\'s workout...';
  document.getElementById('today-plan-meta').textContent = 'Fetching updated exercises from the backend.';
  document.getElementById('exercises-container').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">Load</div>
      <div class="empty-state-title">Refreshing workout plan...</div>
      <p class="empty-state-text">Your new workout will reflect the latest profile changes.</p>
    </div>
  `;
}

function renderWorkoutError(message) {
  document.getElementById('exercises-container').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">Warn</div>
      <div class="empty-state-title">Could not load workout plan</div>
      <p class="empty-state-text">${escapeHtml(message)}</p>
    </div>
  `;
}

function renderGoalHero(data) {
  const goalLabel = data.goal_label || formatEnumLabel(data.goal || 'maintenance');
  const goalBadge = data.goal_badge || goalLabel;
  const etaWeeks = Number(data.goal_eta_weeks || 0);
  const bmiCategory = data.bmi_category || 'Unknown';
  const bodyFatCategory = data.body_fat_category || 'Unknown';
  const goalSummary = buildGoalSummary(goalLabel, bmiCategory, bodyFatCategory, etaWeeks);

  setText('goal-label', goalLabel);
  setText('goal-badge', goalBadge);
  setText('goal-eta', etaWeeks > 0 ? `${etaWeeks} week goal window` : 'Goal ETA pending');
  setText('goal-bmi-category', `BMI ${bmiCategory}`);
  setText('goal-bfp-category', `BFP ${bodyFatCategory}`);
  setText('goal-summary', goalSummary);

  const heroImage = document.getElementById('goal-hero-image');
  const fallback = document.getElementById('goal-hero-fallback');
  const heroUrl = normalizeMediaUrl(data.hero_image_url || '');
  if (heroImage && heroUrl) {
    heroImage.src = heroUrl;
    heroImage.classList.remove('hidden');
    fallback?.classList.add('hidden');
  } else {
    heroImage?.classList.add('hidden');
    fallback?.classList.remove('hidden');
  }
}

function buildGoalSummary(goalLabel, bmiCategory, bodyFatCategory, etaWeeks) {
  const timeline = etaWeeks > 0 ? `${etaWeeks} week target` : 'adaptive timeline';
  return `Adaptive workouts now follow your ${goalLabel} plan, ${bmiCategory} BMI, ${bodyFatCategory.toLowerCase()} body-fat status, and ${timeline}.`;
}

function renderWorkoutStats(stats) {
  setText('stats-exercises', stats.exercise_count || 0);
  setText('stats-minutes', stats.minutes || 0);
  setText('stats-calories', stats.calories || 0);
}

function renderTodayPlan(plan) {
  if (!plan || !Array.isArray(plan.exercises) || !plan.exercises.length) {
    setText('today-plan-title', 'Recovery day');
    setText('today-plan-meta', 'No workout is scheduled for today. Your next active day will appear in the weekly plan below.');
    document.getElementById('exercises-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Rest</div>
        <div class="empty-state-title">No exercises for today</div>
        <p class="empty-state-text">You can recover today and check the weekly plan for the next active session.</p>
      </div>
    `;
    return;
  }

  setText('today-plan-title', plan.plan_name || 'Today\'s Workout');
  setText('today-plan-meta', `${plan.exercises.length} exercises · ${plan.total_duration_min || 0} min · ${plan.total_estimated_calories_burn || 0} kcal`);

  document.getElementById('exercises-container').innerHTML = plan.exercises.map((exercise, index) => renderExerciseCard(exercise, index)).join('');
}

function renderExerciseCard(exercise, index) {
  const mediaUrl = resolveExerciseMedia(exercise);
  const description = exercise.description || 'Use controlled posture and smooth breathing throughout the exercise.';
  const meta = buildExerciseMeta(exercise);

  return `
    <article class="card exercise-card animate-fade-in-up" id="exercise-card-${index}" style="animation-delay:${index * 0.06}s;">
      <div class="card-body exercise-card-body">
        <div class="exercise-visual">
          ${mediaUrl ? `<img src="${mediaUrl}" alt="${escapeHtml(exercise.name || 'Exercise')}" class="exercise-media">` : renderExerciseFallback(exercise)}
        </div>
        <div class="exercise-copy">
          <div class="exercise-name">${escapeHtml(exercise.name || 'Exercise')}</div>
          <div class="exercise-meta">${meta}</div>
          <div class="exercise-posture-box">
            <div class="exercise-posture-label">${escapeHtml(exercise.muscle_group || 'Movement')}</div>
            <div class="exercise-posture-title">${escapeHtml(description)}</div>
            <div class="exercise-posture-cues">${escapeHtml(buildInstructionSnippet(exercise))}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderExerciseFallback(exercise) {
  const description = escapeHtml(exercise.description || 'Demo not available');
  const posture = escapeHtml(buildInstructionSnippet(exercise));
  return `
    <div class="exercise-media-fallback">
      <div class="exercise-media-fallback-icon">FIT</div>
      <div class="exercise-media-fallback-title">${escapeHtml(exercise.name || 'Exercise')}</div>
      <div class="exercise-media-fallback-copy">${description}</div>
      <div class="exercise-media-fallback-meta">${posture}</div>
    </div>
  `;
}

function buildInstructionSnippet(exercise) {
  const instructions = Array.isArray(exercise.instructions) ? exercise.instructions : [];
  const tips = Array.isArray(exercise.exercise_tips) ? exercise.exercise_tips : [];
  return instructions[0] || tips[0] || 'Keep a stable posture and move with control.';
}

function buildExerciseMeta(exercise) {
  const parts = [];
  if (exercise.sets) parts.push(`${exercise.sets} sets`);
  if (exercise.reps) parts.push(`${exercise.reps} reps`);
  if (exercise.duration_seconds) {
    parts.push(`${exercise.duration_seconds} sec`);
  } else if (exercise.duration_min) {
    parts.push(`${exercise.duration_min} min`);
  }
  if (exercise.rest_seconds) parts.push(`${exercise.rest_seconds} sec rest`);
  parts.push(`${exercise.estimated_calories_burn || 0} kcal`);
  return parts.join(' · ');
}

function renderWeeklyPlan(plans) {
  const container = document.getElementById('weekly-plan-container');
  if (!container) return;

  if (!plans.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Week</div>
        <div class="empty-state-title">No weekly plan available</div>
        <p class="empty-state-text">Save your health profile to generate a goal-based weekly workout plan.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = plans.map((plan) => `
    <div class="workout-week-card ${plan.day === getDayName() ? 'workout-week-card-today' : ''}">
      <div class="workout-week-head">
        <div>
          <div class="weekly-plan-title">${escapeHtml(plan.day || '--')}</div>
          <div class="weekly-plan-meta">${escapeHtml(plan.focus_area || plan.plan_name || 'Workout focus')}</div>
        </div>
        <span class="badge ${plan.day === getDayName() ? 'badge-accent' : 'badge-info'}">${plan.day === getDayName() ? 'Today' : 'Planned'}</span>
      </div>
      <div class="workout-week-summary">${(plan.exercises || []).length} exercises · ${plan.total_duration_min || 0} min · ${plan.total_estimated_calories_burn || 0} kcal</div>
      <div class="weekly-plan-list">
        ${(plan.exercises || []).map((exercise) => `
          <div class="weekly-plan-item">
            <div class="weekly-plan-visual">
              ${resolveExerciseMedia(exercise)
                ? `<img src="${resolveExerciseMedia(exercise)}" alt="${escapeHtml(exercise.name || 'Exercise')}" class="exercise-media">`
                : renderExerciseFallback(exercise)}
            </div>
            <div class="weekly-plan-copy">
              <div class="weekly-plan-exercise-title">${escapeHtml(exercise.name || 'Exercise')}</div>
              <div class="weekly-plan-exercise-meta">${buildExerciseMeta(exercise)}</div>
              <div class="weekly-plan-posture">${escapeHtml(exercise.muscle_group || 'Full body')}</div>
              <div class="weekly-plan-cues">${escapeHtml(buildInstructionSnippet(exercise))}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

async function handleStartOrResume() {
  if (!todayPlan || !todayPlan.exercises || !todayPlan.exercises.length) {
    showToast('No workout is scheduled for today.', 'warning');
    return;
  }

  if (!activeSession) {
    try {
      const response = await workoutAPI.startSession({ day: todayPlan.day || getDayName() });
      const session = response.active_session || response.session || response;
      hydrateActiveSession(session);
      showToast('Workout session started', 'success');
    } catch (error) {
      console.error('Failed to start workout session:', error);
      showToast(error.message || 'Could not start workout session', 'error');
      return;
    }
  }

  startCurrentTimer();
}

function hydrateActiveSession(session) {
  activeSession = {
    ...session,
    id: session.id || session.session_id
  };
  currentExerciseIndex = Number(session.current_exercise_index || 0);
  completedExercises = Array.isArray(session.completed_exercises) ? [...session.completed_exercises] : [];
  totalDurationSeconds = Number(session.total_duration_seconds || 0);
  totalCaloriesBurned = Number(session.total_calories_burned || 0);

  if (session.current_exercise) {
    const idx = findExerciseIndex(session.current_exercise);
    if (idx >= 0) currentExerciseIndex = idx;
  }
}

function clearSessionState() {
  stopTimer();
  activeSession = null;
  currentExerciseIndex = 0;
  completedExercises = [];
  totalDurationSeconds = 0;
  totalCaloriesBurned = 0;
  timerRemaining = 0;
  timerPhase = 'exercise';
  sessionRunning = false;
  sessionStartedAt = 0;
}

function renderSessionState() {
  const startButton = document.getElementById('start-session-btn');
  const completeButton = document.getElementById('complete-current-btn');
  const resetButton = document.getElementById('reset-session-btn');
  const timerSection = document.getElementById('timer-section');
  const completionSection = document.getElementById('completion-summary');

  completionSection?.classList.add('hidden');

  if (!todayPlan || !todayPlan.exercises || !todayPlan.exercises.length) {
    startButton.textContent = 'No Workout Today';
    startButton.disabled = true;
    completeButton.classList.add('hidden');
    resetButton.classList.add('hidden');
    timerSection.classList.add('hidden');
    return;
  }

  startButton.disabled = false;
  if (!activeSession) {
    startButton.textContent = 'Start Workout';
    completeButton.classList.add('hidden');
    resetButton.classList.add('hidden');
    timerSection.classList.add('hidden');
    highlightCompletedCards();
    return;
  }

  startButton.textContent = sessionRunning ? 'Session Running' : 'Resume Workout';
  completeButton.classList.remove('hidden');
  resetButton.classList.remove('hidden');
  timerSection.classList.remove('hidden');
  updateActiveExercisePanel();
  highlightCompletedCards();
}

function updateActiveExercisePanel() {
  const exercise = getCurrentExercise();
  const nextExercise = getNextExercise();
  const completedCount = completedExercises.length;

  setText('completed-count', `${completedCount} completed`);
  setText('duration-so-far', `${Math.round(totalDurationSeconds)} sec`);
  setText('calories-so-far', `${Math.round(totalCaloriesBurned)} kcal`);

  if (!exercise) {
    setText('active-exercise-name', 'Workout complete');
    setText('active-exercise-meta', 'No active exercise remaining.');
    setText('next-exercise-name', '--');
    setText('next-exercise-meta', '--');
    document.getElementById('active-media-block').innerHTML = renderExerciseFallback({ name: 'Workout Complete', description: 'Great job finishing today\'s session.' });
    return;
  }

  setText('active-exercise-name', exercise.name || 'Exercise');
  setText('active-exercise-meta', buildExerciseMeta(exercise));
  setText('next-exercise-name', nextExercise?.name || 'Last exercise');
  setText('next-exercise-meta', nextExercise ? buildExerciseMeta(nextExercise) : 'Complete this exercise to finish the workout');
  renderActiveExerciseMedia(exercise);

  if (!timerRemaining) {
    setTimerForPhase(timerPhase, getPhaseDuration(exercise, timerPhase));
  }
}

function renderActiveExerciseMedia(exercise) {
  const mediaBlock = document.getElementById('active-media-block');
  if (!mediaBlock) return;

  const mediaUrl = resolveExerciseMedia(exercise);
  if (mediaUrl) {
    mediaBlock.innerHTML = `<img src="${mediaUrl}" alt="${escapeHtml(exercise.name || 'Exercise')}" class="exercise-media">`;
    return;
  }

  mediaBlock.innerHTML = renderExerciseFallback(exercise);
}

function highlightCompletedCards() {
  document.querySelectorAll('[id^="exercise-card-"]').forEach((card, index) => {
    card.classList.toggle('completed', index < completedExercises.length);
    card.classList.toggle('exercise-card-active', activeSession && index === currentExerciseIndex);
  });
}

function getCurrentExercise() {
  return todayPlan?.exercises?.[currentExerciseIndex] || activeSession?.current_exercise || null;
}

function getNextExercise() {
  return todayPlan?.exercises?.[currentExerciseIndex + 1] || null;
}

function findExerciseIndex(exercise) {
  if (!exercise || !todayPlan?.exercises?.length) return -1;
  return todayPlan.exercises.findIndex((item) => item.name === exercise.name);
}

function startCurrentTimer() {
  const exercise = getCurrentExercise();
  if (!exercise) return;

  if (!timerRemaining) {
    timerPhase = 'exercise';
    setTimerForPhase(timerPhase, getPhaseDuration(exercise, timerPhase));
  }

  sessionRunning = true;
  sessionStartedAt = Date.now();
  document.getElementById('start-session-btn').textContent = 'Session Running';
  document.getElementById('session-status-badge').textContent = timerPhase === 'rest' ? 'Rest Time' : 'Exercise Time';

  stopTimer();
  timerInterval = setInterval(() => {
    timerRemaining = Math.max(0, timerRemaining - 1);
    totalDurationSeconds += 1;
    updateTimerDisplay();
    setText('duration-so-far', `${Math.round(totalDurationSeconds)} sec`);

    if (timerRemaining <= 0) {
      handleTimerPhaseComplete();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  sessionRunning = false;
}

function setTimerForPhase(phase, seconds) {
  timerPhase = phase;
  timerRemaining = Math.max(0, Number(seconds || 0));
  setText('timer-phase-label', phase === 'rest' ? 'Rest Time' : 'Exercise Time');
  setText('session-status-badge', phase === 'rest' ? 'Rest Time' : 'Exercise Time');
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;
  setText('timer-display', `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
}

function getPhaseDuration(exercise, phase) {
  if (!exercise) return 0;
  if (phase === 'rest') return Number(exercise.rest_seconds || 0);
  return Number(exercise.duration_seconds || (Number(exercise.duration_min || 0) * 60) || 30);
}

async function handleTimerPhaseComplete() {
  stopTimer();

  if (timerPhase === 'rest') {
    timerPhase = 'exercise';
    setTimerForPhase('exercise', getPhaseDuration(getCurrentExercise(), 'exercise'));
    startCurrentTimer();
    return;
  }

  await completeCurrentExercise();
}

async function completeCurrentExercise() {
  const exercise = getCurrentExercise();
  if (!activeSession || !activeSession.id || !exercise) return;

  stopTimer();
  const duration = getPhaseDuration(exercise, 'exercise');
  const calories = Number(exercise.estimated_calories_burn || 0);

  try {
    await workoutAPI.completeExercise(activeSession.id, {
      duration_seconds: duration,
      calories_burned: calories
    });
  } catch (error) {
    console.error('Failed to complete exercise:', error);
    showToast(error.message || 'Could not mark the exercise complete', 'error');
    return;
  }

  completedExercises.push(exercise.name || `Exercise ${currentExerciseIndex + 1}`);
  totalCaloriesBurned += calories;
  currentExerciseIndex += 1;

  if (!getCurrentExercise()) {
    await finishWorkoutSession();
    return;
  }

  setTimerForPhase('rest', getPhaseDuration(exercise, 'rest'));
  renderSessionState();
  updateActiveExercisePanel();
  showToast(`${exercise.name || 'Exercise'} completed`, 'success');

  if (timerRemaining > 0) {
    startCurrentTimer();
  } else {
    timerPhase = 'exercise';
    setTimerForPhase('exercise', getPhaseDuration(getCurrentExercise(), 'exercise'));
  }
}

async function finishWorkoutSession() {
  if (!activeSession || !activeSession.id) return;

  try {
    await workoutAPI.completeSession(activeSession.id, {
      total_duration_seconds: Math.round(totalDurationSeconds),
      total_calories_burned: Math.round(totalCaloriesBurned),
      log_date: todayDate()
    });
    showToast('Workout complete!', 'success');
    renderCompletionSummary();
    clearSessionState();
    await loadWorkoutPlan(false);
    try {
      await activityAPI.getDay(todayDate());
    } catch {
      // Activity refresh is optional for this page.
    }
  } catch (error) {
    console.error('Failed to complete workout session:', error);
    showToast(error.message || 'Could not complete workout session', 'error');
  }
}

function renderCompletionSummary() {
  const section = document.getElementById('completion-summary');
  section?.classList.remove('hidden');
  setText('complete-goal', workoutPlanData?.goal_label || '--');
  setText('complete-exercises', completedExercises.length);
  setText('complete-minutes', Math.round(totalDurationSeconds / 60));
  setText('complete-calories', Math.round(totalCaloriesBurned));
}

async function resetWorkoutSession() {
  if (!activeSession || !activeSession.id) return;

  try {
    await workoutAPI.resetSession(activeSession.id);
    showToast('Workout reset successfully', 'success');
    clearSessionState();
    renderSessionState();
    await loadWorkoutPlan(false);
  } catch (error) {
    console.error('Failed to reset workout session:', error);
    showToast(error.message || 'Could not reset workout session', 'error');
  }
}

function inferTodayPlan(plans) {
  return plans.find((item) => item.day === getDayName()) || null;
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

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

window.addEventListener('beforeunload', stopTimer);
