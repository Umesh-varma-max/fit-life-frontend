let currentWorkoutData = null;
let currentSession = null;
let currentExercises = [];
let currentExerciseIndex = 0;
let timerInterval = null;
let timerSeconds = 0;

document.addEventListener('DOMContentLoaded', async () => {
  initTimerControls();
  initSessionControls();
  await loadWorkoutPlan();
});

async function loadWorkoutPlan() {
  setWorkoutLoadingState(true);

  try {
    const [planData, activeSessionData] = await Promise.all([
      workoutAPI.getPlan(),
      workoutAPI.getActiveSession()
    ]);

    currentWorkoutData = normalizeWorkoutData(planData);
    currentSession = normalizeActiveSession(activeSessionData || planData?.active_session || null);

    cacheWorkoutPlan(currentWorkoutData);
    renderWorkoutScreen();
  } catch (error) {
    console.error('Failed to load workout plan:', error);

    const cachedPlan = getCachedWorkoutPlan();
    if (cachedPlan) {
      currentWorkoutData = normalizeWorkoutData(cachedPlan);
      currentSession = normalizeActiveSession(cachedPlan.active_session || null);
      renderWorkoutScreen();
      showToast('Using last saved workout plan', 'warning');
      return;
    }

    showWorkoutEmptyState(error);
  } finally {
    setWorkoutLoadingState(false);
  }
}

function normalizeWorkoutData(data) {
  const raw = data || {};
  const profile = getCachedProfile() || {};
  const todayPlan = normalizePlanDay(raw.today_plan || null);
  const weeklyPlan = Array.isArray(raw.plan) ? raw.plan.map(normalizePlanDay) : [];
  const workoutStats = raw.workout_stats || {};

  return {
    goal_label: raw.goal_label || profile.goal_label || formatEnumLabel(profile.fitness_goal || 'maintenance'),
    goal_badge: raw.goal_badge || (profile.goal_label || formatEnumLabel(profile.fitness_goal || 'maintenance')).toUpperCase(),
    hero_image_url: resolveExerciseMediaUrl(raw.hero_image_url || ''),
    goal_eta_weeks: raw.goal_eta_weeks || 0,
    bmi_category: raw.bmi_category || getBMICategory(profile.bmi || 0).label || 'Unknown',
    body_fat_category: raw.body_fat_category || profile.body_fat_category || profile.bfp_case || 'Unknown',
    workout_stats: {
      exercise_count: Number(workoutStats.exercise_count || todayPlan.exercises.length || 0),
      minutes: Number(workoutStats.minutes || todayPlan.total_duration_min || 0),
      calories: Number(workoutStats.calories || todayPlan.total_estimated_calories_burn || 0)
    },
    today_plan: todayPlan,
    plan: weeklyPlan,
    active_session: raw.active_session || null
  };
}

function normalizePlanDay(plan) {
  const day = plan || {};
  const exercises = Array.isArray(day.exercises) ? day.exercises.map(normalizeExercise) : [];

  return {
    day: day.day || day.day_of_week || getDayName(),
    plan_name: day.plan_name || day.goal_label || `${getDayName()} Plan`,
    exercises,
    total_duration_min: Number(day.total_duration_min || exercises.reduce((sum, exercise) => sum + (exercise.duration_min || 0), 0)),
    total_estimated_calories_burn: Number(day.total_estimated_calories_burn || exercises.reduce((sum, exercise) => sum + (exercise.estimated_calories_burn || 0), 0))
  };
}

function normalizeExercise(exercise) {
  const item = exercise || {};
  const mediaUrl = resolveExerciseMediaUrl(item.gif_url || item.image_url || item.video_url || item.demo_media_url || '');

  return {
    name: item.name || 'Exercise',
    sets: Number(item.sets || 0),
    reps: Number(item.reps || 0),
    duration_seconds: Number(item.duration_seconds || 0),
    rest_seconds: Number(item.rest_seconds || 0),
    duration_min: Number(item.duration_min || Math.max(1, Math.round((item.duration_seconds || 0) / 60))),
    muscle_group: item.muscle_group || '',
    description: item.description || '',
    instructions: Array.isArray(item.instructions) ? item.instructions : [],
    exercise_tips: Array.isArray(item.exercise_tips) ? item.exercise_tips : [],
    body_parts: Array.isArray(item.body_parts) ? item.body_parts : [],
    target_muscles: Array.isArray(item.target_muscles) ? item.target_muscles : [],
    secondary_muscles: Array.isArray(item.secondary_muscles) ? item.secondary_muscles : [],
    equipments: Array.isArray(item.equipments) ? item.equipments : [],
    gif_url: resolveExerciseMediaUrl(item.gif_url || ''),
    image_url: resolveExerciseMediaUrl(item.image_url || ''),
    video_url: resolveExerciseMediaUrl(item.video_url || ''),
    demo_media_url: resolveExerciseMediaUrl(item.demo_media_url || ''),
    has_demo_media: Boolean(item.has_demo_media && mediaUrl),
    media_fallback_text: item.media_fallback_text || '',
    media_url: mediaUrl,
    estimated_calories_burn: Number(item.estimated_calories_burn || 0)
  };
}

function normalizeActiveSession(payload) {
  if (!payload) return null;
  const session = payload.active_session || payload.session || payload;
  if (!session || typeof session !== 'object') return null;

  return {
    id: session.id || session.session_id || null,
    current_exercise_index: Number(session.current_exercise_index || 0),
    current_exercise: session.current_exercise ? normalizeExercise(session.current_exercise) : null,
    completed_exercises: Array.isArray(session.completed_exercises) ? session.completed_exercises : [],
    total_duration_seconds: Number(session.total_duration_seconds || 0),
    total_calories_burned: Number(session.total_calories_burned || 0)
  };
}

function renderWorkoutScreen() {
  const data = currentWorkoutData;
  if (!data) return;

  currentExercises = data.today_plan?.exercises || [];
  currentExerciseIndex = currentSession?.current_exercise_index || 0;

  renderHero(data);
  renderWorkoutSummary(data);
  renderTodayPlan(data.today_plan);
  renderWeeklyPlan(data.plan || []);
  renderSessionState();
}

function renderHero(data) {
  setText('hero-goal-badge', data.goal_badge || data.goal_label || 'Workout');
  setText('hero-title', data.goal_label || 'Workout at home');
  setText('hero-subtitle', buildHeroSubtitle(data));
  setText('hero-bmi-meta', `BMI ${data.bmi_category || 'Unknown'}`);
  setText('hero-bfp-meta', `BFP ${data.body_fat_category || 'Unknown'}`);
  setText('hero-timeframe-meta', data.goal_eta_weeks ? `${data.goal_eta_weeks} week goal window` : 'Goal window adapting');
  setText('workout-goal', data.goal_label || '--');
  setText('plan-tier', data.goal_badge || data.goal_label || '--');
  setText('target-timeline', data.goal_eta_weeks ? `${data.goal_eta_weeks} weeks` : '--');
  setText('profile-trigger', `${data.bmi_category || 'Unknown'} BMI • ${data.body_fat_category || 'Unknown'} body fat`);

  const heroImage = document.getElementById('hero-image');
  if (heroImage) {
    if (data.hero_image_url) {
      heroImage.src = data.hero_image_url;
      heroImage.classList.remove('hidden');
    } else {
      heroImage.removeAttribute('src');
      heroImage.classList.add('hidden');
    }
  }
}

function buildHeroSubtitle(data) {
  const parts = [];
  if (data.goal_label) parts.push(`${data.goal_label} plan`);
  if (data.bmi_category) parts.push(`${String(data.bmi_category).toLowerCase()} BMI`);
  if (data.body_fat_category) parts.push(`${String(data.body_fat_category).toLowerCase()} body-fat status`);
  if (data.goal_eta_weeks) parts.push(`${data.goal_eta_weeks} week target`);
  return `Adaptive workouts now follow your ${parts.join(', ')}.`;
}

function renderWorkoutSummary(data) {
  setText('weekly-exercise-count', String(data.workout_stats.exercise_count || 0));
  setText('weekly-duration', `${data.workout_stats.minutes || 0} min`);
  setText('weekly-burn', `${data.workout_stats.calories || 0} kcal`);
  setText('weekly-plan-source', data.active_session ? 'Live Session' : 'Plan');
}

function renderTodayPlan(todayPlan) {
  const container = document.getElementById('exercises-container');
  if (!container) return;

  const exercises = todayPlan?.exercises || [];
  if (!exercises.length) {
    container.innerHTML = `
      <div class="card animate-fade-in-up">
        <div class="card-body" style="text-align: center; padding: 60px 24px;">
          <div style="font-size: 3rem; margin-bottom: 16px;">Rest</div>
          <h3 style="color: var(--text); margin-bottom: 8px;">No workout for today</h3>
          <p class="text-muted" style="max-width: 420px; margin: 0 auto; line-height: 1.6;">
            Today's plan is empty. Update your profile or check the weekly schedule below for the next session.
          </p>
        </div>
      </div>
    `;
    const sessionCard = document.getElementById('session-card');
    if (sessionCard) sessionCard.style.display = 'none';
    return;
  }

  const sessionCard = document.getElementById('session-card');
  if (sessionCard) sessionCard.style.display = '';

  container.innerHTML = `
    <div class="card mb-3 animate-fade-in-up">
      <div class="card-body workout-day-summary">
        <div class="workout-day-summary-copy">
          <div class="workout-day-summary-title">${escapeHtml(todayPlan.plan_name || 'Workout Activity')}</div>
          <div class="text-muted workout-day-summary-meta">${exercises.length} exercises • ${todayPlan.total_duration_min || 0} min • ${todayPlan.total_estimated_calories_burn || 0} kcal burn</div>
        </div>
        <span class="badge badge-accent">Today</span>
      </div>
    </div>
    ${exercises.map((exercise, index) => renderExerciseCard(exercise, index)).join('')}
  `;

  container.querySelectorAll('.start-timer-btn').forEach((button) => {
    button.addEventListener('click', () => startExerciseFlow(Number(button.dataset.index)));
  });

  container.querySelectorAll('.complete-btn').forEach((button) => {
    button.addEventListener('click', () => completeExerciseFlow(Number(button.dataset.index)));
  });
}

function renderExerciseCard(exercise, index) {
  const subtitle = exercise.sets > 0
    ? `${exercise.sets} sets | ${exercise.duration_seconds || Math.round((exercise.duration_min || 0) * 60)} sec`
    : `${exercise.duration_min || 0} min`;

  const details = [
    exercise.muscle_group,
    exercise.description
  ].filter(Boolean);

  return `
    <div class="card mb-2 hover-lift animate-fade-in-up exercise-card" id="ex-card-${index}" style="animation-delay: ${index * 0.06}s;">
      <div class="card-body exercise-card-body">
        <div class="exercise-check" id="ex-check-${index}"></div>
        <div class="exercise-visual">${renderExerciseMedia(exercise)}</div>
        <div class="exercise-copy">
          <div class="exercise-name">${escapeHtml(exercise.name)}</div>
          <div class="text-muted exercise-meta">${escapeHtml(subtitle)}</div>
          ${details.length ? `<div class="text-muted exercise-meta">${escapeHtml(details.join(' • '))}</div>` : ''}
          ${renderExerciseMetaBlock(exercise)}
        </div>
        <div class="exercise-actions">
          <button class="btn btn-outline btn-sm start-timer-btn" data-index="${index}">Timer</button>
          <button class="btn btn-primary btn-sm complete-btn" data-index="${index}">Complete</button>
        </div>
      </div>
    </div>
  `;
}

function renderExerciseMetaBlock(exercise) {
  const cues = [
    ...(exercise.instructions || []).slice(0, 2),
    ...(exercise.exercise_tips || []).slice(0, 1)
  ];
  const chips = [
    ...(exercise.body_parts || []).slice(0, 2),
    ...(exercise.target_muscles || []).slice(0, 2),
    ...(exercise.equipments || []).slice(0, 2)
  ];

  return `
    <div class="exercise-posture-box">
      <div class="exercise-posture-label">Workout Details</div>
      <div class="exercise-posture-title">${escapeHtml(exercise.description || exercise.muscle_group || 'Focused movement')}</div>
      ${cues.length ? `<div class="text-muted exercise-posture-cues">${cues.map(escapeHtml).join(' ')}</div>` : ''}
      ${chips.length ? `<div class="exercise-inline-meta">${chips.map((chip) => `<span class="badge badge-info">${escapeHtml(formatEnumLabel(chip))}</span>`).join('')}</div>` : ''}
    </div>
  `;
}

function renderExerciseMedia(exercise) {
  const mediaUrl = exercise.gif_url || exercise.image_url || exercise.video_url || exercise.demo_media_url || '';
  const hasMedia = Boolean(exercise.has_demo_media && mediaUrl);

  if (hasMedia && (exercise.gif_url || exercise.image_url || exercise.demo_media_url)) {
    return `<img src="${escapeAttribute(mediaUrl)}" alt="${escapeAttribute(exercise.name)} demo" class="scanner-preview-image">`;
  }

  if (hasMedia && exercise.video_url) {
    return `<video class="scanner-preview-image" src="${escapeAttribute(exercise.video_url)}" muted autoplay loop playsinline></video>`;
  }

  return renderMediaFallback(exercise);
}

function renderMediaFallback(exercise) {
  const fallbackCopy = exercise.media_fallback_text || exercise.description || 'Demo not available for this movement yet.';
  const tags = [
    exercise.muscle_group,
    ...(exercise.target_muscles || []).slice(0, 2),
    ...(exercise.equipments || []).slice(0, 2)
  ].filter(Boolean);

  return `
    <div class="exercise-media-fallback">
      <div class="exercise-media-fallback-icon">${getWorkoutPoseMarkup(exercise.name)}</div>
      <div class="exercise-media-fallback-title">Demo not available</div>
      <div class="exercise-media-fallback-copy">${escapeHtml(fallbackCopy)}</div>
      ${tags.length ? `<div class="exercise-inline-meta">${tags.map((chip) => `<span class="badge badge-info">${escapeHtml(formatEnumLabel(chip))}</span>`).join('')}</div>` : ''}
    </div>
  `;
}

function renderWeeklyPlan(plans) {
  const container = document.getElementById('weekly-plan-container');
  if (!container) return;

  if (!plans.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 32px 24px;">
        <div class="empty-state-icon">Week</div>
        <div class="empty-state-title">No weekly workout plan yet</div>
        <p class="empty-state-text">Save your health profile to generate a workout schedule.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = plans.map((plan, index) => `
    <div class="card mb-2 hover-lift animate-fade-in-up" style="animation-delay: ${index * 0.05}s;">
      <div class="card-body weekly-plan-card-body">
        <div class="weekly-plan-head">
          <div class="weekly-plan-head-copy">
            <div class="weekly-plan-title">${escapeHtml(plan.day)} • ${escapeHtml(plan.plan_name || `${plan.day} Workout`)}</div>
            <div class="text-muted weekly-plan-meta">${plan.exercises.length} exercises • ${plan.total_duration_min || 0} min • ${plan.total_estimated_calories_burn || 0} kcal</div>
          </div>
          <span class="badge ${plan.day === getDayName() ? 'badge-accent' : 'badge-info'}">${plan.day === getDayName() ? 'Today' : 'Planned'}</span>
        </div>
        <div class="weekly-plan-list">
          ${plan.exercises.length ? plan.exercises.map((exercise) => `
            <div class="weekly-plan-item">
              <div class="weekly-plan-visual">${renderExerciseMedia(exercise)}</div>
              <div class="weekly-plan-copy">
                <div class="weekly-plan-exercise-title">${escapeHtml(exercise.name)}</div>
                <div class="text-muted weekly-plan-exercise-meta">${escapeHtml(buildWeeklyExerciseMeta(exercise))}</div>
                <div class="weekly-plan-posture">${escapeHtml(exercise.description || exercise.muscle_group || 'Workout movement')}</div>
                <div class="text-muted weekly-plan-cues">${(exercise.instructions || []).slice(0, 2).map(escapeHtml).join(' ')}</div>
              </div>
            </div>
          `).join('') : '<p class="text-muted recommendation-rest-copy">Rest Day</p>'}
        </div>
      </div>
    </div>
  `).join('');
}

function buildWeeklyExerciseMeta(exercise) {
  const parts = [];
  if (exercise.sets) parts.push(`${exercise.sets} sets`);
  if (exercise.reps) parts.push(`${exercise.reps} reps`);
  if (exercise.duration_seconds) parts.push(`${exercise.duration_seconds}s`);
  else if (exercise.duration_min) parts.push(`${exercise.duration_min} min`);
  if (exercise.rest_seconds) parts.push(`${exercise.rest_seconds}s rest`);
  if (exercise.estimated_calories_burn) parts.push(`${exercise.estimated_calories_burn} kcal`);
  return parts.join(' • ');
}

function renderSessionState() {
  const session = currentSession;
  const completedIds = new Set((session?.completed_exercises || []).map(getCompletedExerciseKey));
  const completedCount = session?.completed_exercises?.length || 0;
  const totalCount = currentExercises.length;

  setText('session-progress', `${completedCount} / ${totalCount}`);
  const percent = totalCount ? percentage(completedCount, totalCount) : 0;
  const bar = document.getElementById('session-bar');
  if (bar) bar.style.width = `${percent}%`;
  setText('session-burn', `${Math.round((session?.total_calories_burned || 0))} kcal`);
  setText('session-duration', `${Math.round((session?.total_duration_seconds || 0) / 60)} min`);

  currentExercises.forEach((exercise, index) => {
    const card = document.getElementById(`ex-card-${index}`);
    const check = document.getElementById(`ex-check-${index}`);
    if (!card || !check) return;

    card.classList.remove('completed');
    card.style.opacity = '';
    check.style.background = '';
    check.style.borderColor = '';
    check.style.color = '';
    check.innerHTML = '';

    const key = getCompletedExerciseKey(exercise);
    const isDone = completedIds.has(key) || index < (((session?.current_exercise_index || 0) && !session?.current_exercise) ? session.current_exercise_index : -1);

    if (isDone) {
      card.classList.add('completed');
      card.style.opacity = '0.72';
      check.style.background = 'var(--accent)';
      check.style.borderColor = 'var(--accent)';
      check.style.color = '#fff';
      check.innerHTML = '✓';
    }
  });

  const finishBtn = document.getElementById('finish-workout-btn');
  if (finishBtn) {
    finishBtn.style.display = session ? 'inline-flex' : 'none';
  }

  const activeExercise = session?.current_exercise || currentExercises[currentExerciseIndex] || null;
  const timerMedia = document.getElementById('timer-media');
  if (timerMedia && activeExercise) {
    timerMedia.innerHTML = renderExerciseMedia(activeExercise);
  }
}

async function startExerciseFlow(index) {
  const exercise = currentExercises[index];
  if (!exercise) return;

  if (!currentSession?.id) {
    try {
      const started = await workoutAPI.startSession({ day: currentWorkoutData?.today_plan?.day || getDayName() });
      currentSession = normalizeActiveSession(started);
    } catch (error) {
      showToast(error.message || 'Could not start workout session', 'error');
      return;
    }
  }

  currentExerciseIndex = index;
  timerSeconds = 0;
  updateTimerDisplay();
  setText('timer-exercise-name', `${exercise.name} • ${exercise.rest_seconds || 0}s rest`);
  const timerMedia = document.getElementById('timer-media');
  if (timerMedia) timerMedia.innerHTML = renderExerciseMedia(exercise);
  document.getElementById('timer-card').style.display = 'block';
  document.getElementById('timer-start').style.display = 'inline-flex';
  document.getElementById('timer-pause').style.display = 'none';
  document.getElementById('timer-start').textContent = 'Start';
  document.getElementById('timer-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function completeExerciseFlow(index) {
  const exercise = currentExercises[index];
  if (!exercise) return;

  if (!currentSession?.id) {
    await startExerciseFlow(index);
    if (!currentSession?.id) return;
  }

  const durationSeconds = Math.max(timerSeconds || exercise.duration_seconds || (exercise.duration_min * 60) || 60, 1);
  const caloriesBurned = exercise.estimated_calories_burn || estimateExerciseCalories(exercise, durationSeconds);

  try {
    const response = await workoutAPI.completeExercise(currentSession.id, {
      duration_seconds: durationSeconds,
      calories_burned: caloriesBurned
    });

    currentSession = normalizeActiveSession(response) || {
      ...currentSession,
      current_exercise_index: index + 1,
      completed_exercises: [...(currentSession.completed_exercises || []), exercise.name],
      total_duration_seconds: (currentSession.total_duration_seconds || 0) + durationSeconds,
      total_calories_burned: (currentSession.total_calories_burned || 0) + caloriesBurned
    };

    clearInterval(timerInterval);
    timerSeconds = 0;
    updateTimerDisplay();
    document.getElementById('timer-card').style.display = 'none';
    renderSessionState();
    showToast(`${exercise.name} completed`, 'success');
  } catch (error) {
    showToast(error.message || 'Could not complete exercise', 'error');
  }
}

function estimateExerciseCalories(exercise, durationSeconds) {
  const durationMinutes = durationSeconds / 60;
  const perMinute = exercise.estimated_calories_burn && exercise.duration_min
    ? (exercise.estimated_calories_burn / exercise.duration_min)
    : 6;
  return Math.max(1, Math.round(durationMinutes * perMinute));
}

function initTimerControls() {
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resetBtn = document.getElementById('timer-reset');
  const doneBtn = document.getElementById('timer-done');

  startBtn?.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = setInterval(tickTimer, 1000);
    startBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';
  });

  pauseBtn?.addEventListener('click', () => {
    clearInterval(timerInterval);
    pauseBtn.style.display = 'none';
    if (startBtn) {
      startBtn.style.display = 'inline-flex';
      startBtn.textContent = 'Resume';
    }
  });

  resetBtn?.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerSeconds = 0;
    updateTimerDisplay();
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (startBtn) {
      startBtn.style.display = 'inline-flex';
      startBtn.textContent = 'Start';
    }
  });

  doneBtn?.addEventListener('click', () => {
    completeExerciseFlow(currentExerciseIndex);
  });
}

function initSessionControls() {
  document.getElementById('finish-workout-btn')?.addEventListener('click', finishWholeWorkout);
  document.getElementById('reset-session-btn')?.addEventListener('click', resetWholeWorkout);
}

async function finishWholeWorkout() {
  if (!currentSession?.id) {
    showToast('Start a workout session first', 'warning');
    return;
  }

  try {
    await workoutAPI.completeSession(currentSession.id, {
      total_duration_seconds: currentSession.total_duration_seconds || 0,
      total_calories_burned: currentSession.total_calories_burned || 0,
      log_date: todayDate()
    });
    showToast('Workout complete! Great job!', 'success');
    currentSession = null;
    await loadWorkoutPlan();
  } catch (error) {
    showToast(error.message || 'Could not complete workout', 'error');
  }
}

async function resetWholeWorkout() {
  clearInterval(timerInterval);
  timerSeconds = 0;
  updateTimerDisplay();
  document.getElementById('timer-card').style.display = 'none';

  if (currentSession?.id) {
    try {
      await workoutAPI.resetSession(currentSession.id);
    } catch (error) {
      showToast(error.message || 'Could not reset workout', 'error');
      return;
    }
  }

  currentSession = null;
  const timerMedia = document.getElementById('timer-media');
  if (timerMedia) timerMedia.innerHTML = '';
  await loadWorkoutPlan();
  showToast('Workout reset', 'info');
}

function tickTimer() {
  timerSeconds += 1;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function setWorkoutLoadingState(isLoading) {
  if (!isLoading) return;
  const container = document.getElementById('exercises-container');
  if (container) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 60px 24px;">
        <div class="empty-state-icon">Plan</div>
        <div class="empty-state-title">Loading today's workout...</div>
        <p class="empty-state-text">Fetching your profile-driven workout plan and active session state.</p>
      </div>
    `;
  }
}

function showWorkoutEmptyState(error) {
  const container = document.getElementById('exercises-container');
  if (container) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 60px 24px;">
        <div class="empty-state-icon">Workout</div>
        <div class="empty-state-title">Failed to load workout plan</div>
        <p class="empty-state-text">${escapeHtml(error.message || 'Please try again in a moment.')}</p>
      </div>
    `;
  }
}

function getCompletedExerciseKey(item) {
  if (typeof item === 'string') return item;
  return item?.name || '';
}

function resolveExerciseMediaUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  if (value.startsWith('/')) return `${getBackendOrigin()}${value}`;
  return `${getBackendOrigin()}/${value.replace(/^\/+/, '')}`;
}

function getBackendOrigin() {
  return String(CONFIG.API_BASE || '').replace(/\/api\/?$/, '');
}

function getWorkoutPoseMarkup(name) {
  const lower = /squat|lunge|leg|walk|jog|hike|cycling|bike|cardio|jump|step/i.test(name);
  const push = /press|push|dip/i.test(name);
  const pull = /pull|row|curl|deadlift/i.test(name);
  const accent = lower ? '#00b4d8' : push ? '#00d4aa' : pull ? '#ff8a65' : '#7c5cfc';
  const arms = push ? 'M38 28 L18 36 M38 28 L58 36' : pull ? 'M38 28 L20 22 M38 28 L56 22' : 'M38 28 L20 32 M38 28 L56 32';
  const legs = lower ? 'M38 42 L24 60 M38 42 L50 58 M24 60 L18 68 M50 58 L56 68' : 'M38 42 L30 62 M38 42 L48 62';

  return `
    <svg width="88" height="88" viewBox="0 0 76 76" fill="none" aria-hidden="true">
      <circle cx="38" cy="14" r="7" fill="${accent}" opacity="0.95"></circle>
      <path d="M38 22 L38 42" stroke="${accent}" stroke-width="5" stroke-linecap="round"></path>
      <path d="${arms}" stroke="${accent}" stroke-width="5" stroke-linecap="round"></path>
      <path d="${legs}" stroke="${accent}" stroke-width="5" stroke-linecap="round"></path>
    </svg>
  `;
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

function escapeAttribute(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
