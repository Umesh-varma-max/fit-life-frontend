const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 52;

const WORKOUT_LIBRARY = {
  Cut: {
    focus: 'Higher movement volume with short rest to support fat loss.',
    split: ['Cardio Core', 'Lower Body HIIT', 'Upper Body Circuit', 'Mobility Flow', 'Conditioning', 'Glutes and Core', 'Recovery Walk'],
  },
  Bulk: {
    focus: 'Strength-first split with extra volume and longer rest blocks.',
    split: ['Chest and Triceps', 'Back and Biceps', 'Leg Power', 'Shoulders and Core', 'Full Body Volume', 'Posterior Chain', 'Recovery Mobility'],
  },
  Fit: {
    focus: 'Balanced mix of endurance, strength, and mobility.',
    split: ['Full Body Strength', 'Cardio Intervals', 'Lower Body Control', 'Upper Body Tone', 'Core and Mobility', 'Hybrid Conditioning', 'Recovery Stretch'],
  },
  'Muscle Growth': {
    focus: 'Hypertrophy-focused sessions with steady tension and control.',
    split: ['Push Hypertrophy', 'Pull Hypertrophy', 'Leg Hypertrophy', 'Core and Stability', 'Upper Body Pump', 'Glutes and Hamstrings', 'Mobility Recovery'],
  },
};

const EXERCISE_LIBRARY = {
  push: [
    ['Push-Up', 'Chest', 'Keep your ribs tucked, shoulders away from ears, and lower in one straight line.'],
    ['Incline Press', 'Chest', 'Press evenly, keep wrists stacked, and control the lowering phase.'],
    ['Tricep Dip', 'Arms', 'Stay tall through the chest and bend only to a comfortable shoulder range.'],
    ['Shoulder Press', 'Shoulders', 'Brace your core and press straight overhead without arching your lower back.'],
  ],
  pull: [
    ['Bent-Over Row', 'Back', 'Hinge from the hips, keep your spine neutral, and pull elbows toward your ribs.'],
    ['Resistance Row', 'Back', 'Lead with the elbows and squeeze your shoulder blades at the back.'],
    ['Bicep Curl', 'Arms', 'Keep elbows close to your sides and avoid swinging the weight.'],
    ['Deadlift Reach', 'Back', 'Drive through your heels and keep the bar path close to the body.'],
  ],
  lower: [
    ['Bodyweight Squat', 'Legs', 'Sit back into your hips, keep your heels planted, and drive up through midfoot.'],
    ['Reverse Lunge', 'Legs', 'Step back softly and keep your front knee tracking over the toes.'],
    ['Glute Bridge', 'Glutes', 'Lift through the hips while keeping your ribs down and knees steady.'],
    ['Step-Up', 'Legs', 'Push through the lead leg and keep your torso tall at the top.'],
  ],
  core: [
    ['Forearm Plank', 'Core', 'Brace your abs, squeeze glutes, and keep your neck in line with the spine.'],
    ['Dead Bug', 'Core', 'Press your lower back into the floor as opposite limbs extend slowly.'],
    ['Mountain Climber', 'Core', 'Drive knees under the body without letting your hips bounce high.'],
    ['Russian Twist', 'Core', 'Rotate from the torso, not just the arms, and keep your chest lifted.'],
  ],
  cardio: [
    ['Jumping Jacks', 'Cardio', 'Stay light on your feet and keep a steady rhythm with soft knees.'],
    ['High Knees', 'Cardio', 'Stay tall, pump your arms, and land softly under your center of mass.'],
    ['Skater Hop', 'Cardio', 'Push side to side with control and let the landing leg absorb the load.'],
    ['Fast Feet', 'Cardio', 'Keep your chest up and move quickly with short, sharp ground contacts.'],
  ],
  mobility: [
    ['World Stretch', 'Mobility', 'Open the chest, keep hips square, and move through each rep with control.'],
    ['Cat-Cow Flow', 'Mobility', 'Move one segment at a time through the spine and match the breath.'],
    ['Hip Opener', 'Mobility', 'Stay upright and sink only as far as you can maintain a neutral pelvis.'],
    ['Thoracic Reach', 'Mobility', 'Rotate through the upper back while keeping the hips and knees steady.'],
  ],
};

let workoutState = {
  goal: getSelectedGoal() || 'Fit',
  plan: [],
  todayPlan: null,
  currentIndex: 0,
  phase: 'idle',
  timerId: null,
  remainingSeconds: 0,
  phaseDuration: 0,
  totalElapsedSeconds: 0,
  completedExercises: [],
  startedAt: null,
  isPaused: false,
  hasLoggedSession: false,
};

document.addEventListener('DOMContentLoaded', () => {
  initGoalSelector();
  initWorkoutControls();
  loadWorkoutExperience();
});

function initGoalSelector() {
  const container = document.getElementById('workout-goal-selector');
  if (!container) return;

  container.innerHTML = CONFIG.GOAL_OPTIONS.map(goal => `
    <button class="goal-card ${goal === workoutState.goal ? 'active' : ''}" type="button" data-goal="${escapeHtml(goal)}">
      <span class="goal-card-title">${escapeHtml(goal)}</span>
      <span class="goal-card-sub">${escapeHtml(WORKOUT_LIBRARY[goal].focus)}</span>
    </button>
  `).join('');

  container.querySelectorAll('[data-goal]').forEach(button => {
    button.addEventListener('click', () => {
      workoutState.goal = button.dataset.goal;
      setSelectedGoal(workoutState.goal);
      initGoalSelector();
      loadWorkoutExperience(true);
    });
  });
}

function initWorkoutControls() {
  const startBtn = document.getElementById('control-start');
  const pauseBtn = document.getElementById('control-pause');
  const skipBtn = document.getElementById('control-skip');
  const endBtn = document.getElementById('control-end');
  const refreshBtn = document.getElementById('regenerate-workout-btn');
  const restartBtn = document.getElementById('restart-session-btn');

  if (startBtn) startBtn.addEventListener('click', handleStartPauseResume);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
  if (skipBtn) skipBtn.addEventListener('click', skipCurrentPhase);
  if (endBtn) endBtn.addEventListener('click', finishWorkoutSession);
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadWorkoutExperience(true));
  if (restartBtn) restartBtn.addEventListener('click', () => loadWorkoutExperience(true));
}

async function loadWorkoutExperience(showToastMessage = false) {
  setWorkoutLoading(true);
  clearWorkoutError();
  resetSessionState();

  try {
    const prompt = buildWorkoutPrompt(workoutState.goal);
    const rawResponse = await requestWorkoutPlan(workoutState.goal, prompt);
    const parsed = safeParseJson(rawResponse);

    if (!parsed || !Array.isArray(parsed.weekly_plan) || parsed.weekly_plan.length === 0) {
      throw new Error('Workout plan response was empty.');
    }

    workoutState.plan = parsed.weekly_plan;
    workoutState.todayPlan = getTodayPlan(parsed.weekly_plan);

    renderWorkoutOverview(parsed);
    renderTodayPlan();
    renderWeeklyPlan();
    renderCurrentExercise();
    setWorkoutLoading(false);

    if (showToastMessage) {
      showToast(`Updated ${workoutState.goal} workout plan`, 'success');
    }
  } catch (error) {
    console.error('Workout load failed:', error);
    showWorkoutError(error.message || 'Unable to generate workout plan.');
    setWorkoutLoading(false);
  }
}

function setWorkoutLoading(isLoading) {
  const loading = document.getElementById('workout-loading');
  const session = document.getElementById('workout-session');
  const summary = document.getElementById('workout-summary-card');

  if (loading) loading.classList.toggle('hidden', !isLoading);
  if (session) session.classList.toggle('hidden', isLoading);
  if (summary && isLoading) summary.classList.add('hidden');
}

function showWorkoutError(message) {
  const errorCard = document.getElementById('workout-error');
  const errorText = document.getElementById('workout-error-text');
  const session = document.getElementById('workout-session');

  if (errorCard) errorCard.classList.remove('hidden');
  if (errorText) errorText.textContent = message;
  if (session) session.classList.add('hidden');
}

function clearWorkoutError() {
  const errorCard = document.getElementById('workout-error');
  if (errorCard) errorCard.classList.add('hidden');
}

function resetSessionState() {
  stopTimer();
  workoutState.currentIndex = 0;
  workoutState.phase = 'idle';
  workoutState.remainingSeconds = 0;
  workoutState.phaseDuration = 0;
  workoutState.totalElapsedSeconds = 0;
  workoutState.completedExercises = [];
  workoutState.startedAt = null;
  workoutState.isPaused = false;
  workoutState.hasLoggedSession = false;
  toggleSummary(false);
  updateControls();
  updateTimerUi(0, 1, 'Ready', 'Start when you are ready');
}

function renderWorkoutOverview(parsed) {
  const today = workoutState.todayPlan;
  const totalSeconds = workoutState.plan.reduce((sum, day) => sum + (day.total_duration_seconds || 0), 0);
  const totalCalories = workoutState.plan.reduce((sum, day) => sum + (day.estimated_calories_burn || 0), 0);

  setText('overview-goal', parsed.goal_label || workoutState.goal);
  setText('overview-focus', WORKOUT_LIBRARY[workoutState.goal].focus);
  setText('overview-days', String(workoutState.plan.length));
  setText('overview-minutes', `${Math.round(totalSeconds / 60)} min`);
  setText('overview-calories', `${totalCalories} kcal`);
  setText('goal-day-label', today ? today.day : 'Today');
  setText('workout-plan-status', 'Ready');
  setText('weekly-plan-count', `${workoutState.plan.length} days`);
}

function renderTodayPlan() {
  const todayPlan = workoutState.todayPlan;
  const list = document.getElementById('today-plan-list');

  if (!todayPlan || !list) return;

  setText('today-plan-title', `${todayPlan.day} - ${todayPlan.focus_area}`);
  setText('today-plan-summary', todayPlan.summary);
  setText('today-plan-duration', `${Math.round(todayPlan.total_duration_seconds / 60)} min`);
  setText('today-plan-burn', `${todayPlan.estimated_calories_burn} kcal`);

  list.innerHTML = todayPlan.exercises.map((exercise, index) => `
    <article class="exercise-list-card ${index === workoutState.currentIndex ? 'active' : ''} ${workoutState.completedExercises.includes(index) ? 'done' : ''}">
      <div class="exercise-list-index">${index + 1}</div>
      <div class="exercise-list-content">
        <div class="exercise-list-top">
          <strong>${escapeHtml(exercise.exercise_name)}</strong>
          <span class="badge badge-info">${escapeHtml(exercise.muscle_group)}</span>
        </div>
        <p>${escapeHtml(exercise.description)}</p>
        <div class="exercise-inline-meta">
          <span>${exercise.sets} sets</span>
          <span>${exercise.reps} reps</span>
          <span>${exercise.duration_seconds}s work</span>
          <span>${exercise.rest_duration_seconds}s rest</span>
          <span>${exercise.estimated_calories_burn} kcal</span>
        </div>
      </div>
    </article>
  `).join('');

  updateSessionProgress();
}

function renderWeeklyPlan() {
  const grid = document.getElementById('weekly-workout-grid');
  if (!grid) return;

  grid.innerHTML = workoutState.plan.map(day => `
    <article class="weekly-day-card ${day.day === getDayName() ? 'today' : ''}">
      <div class="weekly-day-head">
        <div>
          <h4>${escapeHtml(day.day)}</h4>
          <p>${escapeHtml(day.focus_area)}</p>
        </div>
        <span class="badge ${day.day === getDayName() ? 'badge-accent' : 'badge-info'}">${day.day === getDayName() ? 'Today' : 'Planned'}</span>
      </div>
      <div class="exercise-inline-meta">
        <span>${Math.round(day.total_duration_seconds / 60)} min</span>
        <span>${day.estimated_calories_burn} kcal</span>
      </div>
      <div class="weekly-exercise-stack">
        ${day.exercises.map(exercise => `
          <div class="weekly-exercise-item">
            <div class="mini-animation ${escapeHtml(exercise.animation)}">${getExerciseAnimationMarkup(exercise.animation)}</div>
            <div>
              <strong>${escapeHtml(exercise.exercise_name)}</strong>
              <p>${escapeHtml(exercise.description)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </article>
  `).join('');
}

function renderCurrentExercise() {
  const todayPlan = workoutState.todayPlan;
  if (!todayPlan || !todayPlan.exercises.length) return;

  const exercise = todayPlan.exercises[workoutState.currentIndex];
  if (!exercise) return;

  setText('exercise-muscle-group', exercise.muscle_group);
  setText('exercise-name', exercise.exercise_name);
  setText('exercise-description', exercise.description);
  setText('exercise-sets', String(exercise.sets));
  setText('exercise-reps', String(exercise.reps));
  setText('exercise-duration', `${exercise.duration_seconds}s`);
  setText('exercise-rest', `${exercise.rest_duration_seconds}s`);
  setText('session-badge', workoutState.phase === 'rest' ? 'Rest' : workoutState.phase === 'exercise' ? 'Training' : 'Ready');

  const animation = document.getElementById('exercise-animation');
  if (animation) {
    animation.className = `exercise-hero animation-${exercise.animation}`;
    animation.innerHTML = getExerciseAnimationMarkup(exercise.animation);
  }

  renderTodayPlan();
}

function updateSessionProgress() {
  const total = workoutState.todayPlan ? workoutState.todayPlan.exercises.length : 0;
  const done = workoutState.completedExercises.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  setText('session-progress-text', `${done} / ${total}`);
  const progressBar = document.getElementById('session-progress-bar');
  if (progressBar) progressBar.style.width = `${percent}%`;
}

function handleStartPauseResume() {
  if (!workoutState.todayPlan || !workoutState.todayPlan.exercises.length) {
    showToast('No exercises available for today', 'warning');
    return;
  }

  if (workoutState.phase === 'idle') {
    startExercisePhase();
    return;
  }

  if (workoutState.isPaused) {
    workoutState.isPaused = false;
    startTimerLoop();
    updateControls();
  }
}

function startExercisePhase() {
  const exercise = getCurrentExercise();
  if (!exercise) {
    finishWorkoutSession();
    return;
  }

  if (!workoutState.startedAt) {
    workoutState.startedAt = new Date().toISOString();
  }

  workoutState.phase = 'exercise';
  workoutState.phaseDuration = exercise.duration_seconds;
  workoutState.remainingSeconds = exercise.duration_seconds;
  workoutState.isPaused = false;

  renderCurrentExercise();
  updateTimerUi(workoutState.remainingSeconds, workoutState.phaseDuration, 'Exercise', `${exercise.exercise_name} in progress`);
  updateControls();
  startTimerLoop();
}

function startRestPhase() {
  const exercise = getCurrentExercise();
  if (!exercise) {
    finishWorkoutSession();
    return;
  }

  workoutState.phase = 'rest';
  workoutState.phaseDuration = exercise.rest_duration_seconds;
  workoutState.remainingSeconds = exercise.rest_duration_seconds;
  workoutState.isPaused = false;

  renderCurrentExercise();
  updateTimerUi(workoutState.remainingSeconds, workoutState.phaseDuration, 'Rest', 'Recover before the next movement');
  updateControls();
  startTimerLoop();
}

function pauseTimer() {
  if (!workoutState.timerId) return;
  stopTimer();
  workoutState.isPaused = true;
  updateControls();
}

function skipCurrentPhase() {
  if (workoutState.phase === 'exercise') {
    completeCurrentExercise();
    return;
  }

  if (workoutState.phase === 'rest') {
    advanceToNextExercise();
    return;
  }

  handleStartPauseResume();
}

function startTimerLoop() {
  stopTimer();

  workoutState.timerId = window.setInterval(() => {
    if (workoutState.remainingSeconds > 0) {
      workoutState.remainingSeconds -= 1;
      workoutState.totalElapsedSeconds += 1;
      updateTimerUi(
        workoutState.remainingSeconds,
        workoutState.phaseDuration,
        workoutState.phase === 'rest' ? 'Rest' : 'Exercise',
        workoutState.phase === 'rest' ? 'Catch your breath' : `${getCurrentExercise().exercise_name} in progress`
      );
      return;
    }

    playCompletionTone();
    if (workoutState.phase === 'exercise') {
      completeCurrentExercise();
    } else {
      advanceToNextExercise();
    }
  }, 1000);
}

function stopTimer() {
  if (workoutState.timerId) {
    clearInterval(workoutState.timerId);
    workoutState.timerId = null;
  }
}

function completeCurrentExercise() {
  stopTimer();
  const exercise = getCurrentExercise();
  if (!exercise) {
    finishWorkoutSession();
    return;
  }

  if (!workoutState.completedExercises.includes(workoutState.currentIndex)) {
    workoutState.completedExercises.push(workoutState.currentIndex);
  }

  renderTodayPlan();
  updateSessionProgress();

  if (exercise.rest_duration_seconds > 0 && workoutState.currentIndex < workoutState.todayPlan.exercises.length - 1) {
    startRestPhase();
  } else {
    advanceToNextExercise();
  }
}

function advanceToNextExercise() {
  stopTimer();
  workoutState.currentIndex += 1;

  if (!workoutState.todayPlan || workoutState.currentIndex >= workoutState.todayPlan.exercises.length) {
    finishWorkoutSession();
    return;
  }

  workoutState.phase = 'idle';
  workoutState.remainingSeconds = 0;
  workoutState.phaseDuration = 1;
  workoutState.isPaused = false;
  renderCurrentExercise();
  updateTimerUi(0, 1, 'Ready', 'Tap start for the next exercise');
  updateControls();
}

function finishWorkoutSession() {
  stopTimer();

  if (!workoutState.todayPlan) return;

  if (workoutState.hasLoggedSession) {
    toggleSummary(true);
    return;
  }

  const completedItems = workoutState.todayPlan.exercises.filter((_, index) => workoutState.completedExercises.includes(index));
  if (completedItems.length === 0) {
    showToast('Start the session to log your workout', 'warning');
    updateControls();
    return;
  }

  const logs = readStorageJson(CONFIG.WORKOUT_LOG_KEY, []);
  const timestamp = new Date().toISOString();
  const date = todayDate();

  completedItems.forEach(exercise => {
    logs.unshift({
      id: `${date}-${exercise.exercise_name}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      type: 'workout',
      exercise_name: exercise.exercise_name,
      sets: exercise.sets,
      reps: exercise.reps,
      duration_seconds: exercise.duration_seconds,
      estimated_calories_burn: exercise.estimated_calories_burn,
      goal: workoutState.goal,
      muscle_group: exercise.muscle_group,
      date,
      timestamp,
    });
  });

  writeStorageJson(CONFIG.WORKOUT_LOG_KEY, logs);
  workoutState.hasLoggedSession = true;

  setText('summary-time', `${Math.max(1, Math.round(workoutState.totalElapsedSeconds / 60))} min`);
  setText('summary-exercises', String(completedItems.length));
  setText('summary-burn', `${completedItems.reduce((sum, item) => sum + item.estimated_calories_burn, 0)} kcal`);
  toggleSummary(true);
  showToast('Workout logged to Activity Tracker', 'success');

  workoutState.phase = 'complete';
  updateControls();
}

function toggleSummary(show) {
  const summary = document.getElementById('workout-summary-card');
  if (summary) summary.classList.toggle('hidden', !show);
}

function updateControls() {
  const startBtn = document.getElementById('control-start');
  const pauseBtn = document.getElementById('control-pause');
  const skipBtn = document.getElementById('control-skip');
  const endBtn = document.getElementById('control-end');

  if (!startBtn || !pauseBtn || !skipBtn || !endBtn) return;

  startBtn.textContent = workoutState.phase === 'idle' ? 'Start' : workoutState.isPaused ? 'Resume' : 'Running';
  startBtn.disabled = workoutState.phase === 'exercise' && !workoutState.isPaused;
  pauseBtn.disabled = !(workoutState.phase === 'exercise' || workoutState.phase === 'rest') || workoutState.isPaused;
  skipBtn.disabled = workoutState.phase === 'complete';
  endBtn.disabled = workoutState.phase === 'idle' && workoutState.completedExercises.length === 0;
}

function updateTimerUi(remaining, total, phaseLabel, caption) {
  const safeTotal = total || 1;
  const progress = Math.max(0, Math.min(1, remaining / safeTotal));
  const strokeOffset = TIMER_RING_CIRCUMFERENCE * progress;
  const ring = document.getElementById('timer-ring-progress');

  if (ring) {
    ring.style.strokeDasharray = `${TIMER_RING_CIRCUMFERENCE}`;
    ring.style.strokeDashoffset = `${strokeOffset}`;
  }

  setText('timer-phase', phaseLabel);
  setText('timer-value', formatDuration(remaining));
  setText('timer-caption', caption);
  setText('rest-chip', `Rest: ${getCurrentExercise() ? getCurrentExercise().rest_duration_seconds : 0}s`);
}

function getCurrentExercise() {
  if (!workoutState.todayPlan) return null;
  return workoutState.todayPlan.exercises[workoutState.currentIndex] || null;
}

async function requestWorkoutPlan(goal, prompt) {
  const library = buildGoalWorkoutPlan(goal, prompt);
  return JSON.stringify(library);
}

function buildGoalWorkoutPlan(goal, prompt) {
  const goalConfig = WORKOUT_LIBRARY[goal] || WORKOUT_LIBRARY.Fit;
  const weeklyPlan = WEEK_DAYS.map((day, index) => {
    const focusArea = goalConfig.split[index];
    const exercises = buildExercisesForFocus(goal, focusArea, index);
    const totalDurationSeconds = exercises.reduce((sum, exercise) => sum + exercise.duration_seconds + exercise.rest_duration_seconds, 0);
    const estimatedCaloriesBurn = exercises.reduce((sum, exercise) => sum + exercise.estimated_calories_burn, 0);

    return {
      day,
      focus_area: focusArea,
      summary: `Structured ${goal.toLowerCase()} session for ${focusArea.toLowerCase()} with guided rest and posture cues.`,
      total_duration_seconds: totalDurationSeconds,
      estimated_calories_burn: estimatedCaloriesBurn,
      exercises,
    };
  });

  return {
    goal_label: goal,
    prompt_used: prompt,
    weekly_plan: weeklyPlan,
  };
}

function buildExercisesForFocus(goal, focusArea, dayIndex) {
  const lowered = focusArea.toLowerCase();
  const buckets = [];

  if (/push|chest|triceps|upper/.test(lowered)) buckets.push('push');
  if (/pull|back|biceps|posterior/.test(lowered)) buckets.push('pull');
  if (/leg|glute|lower/.test(lowered)) buckets.push('lower');
  if (/core|stability/.test(lowered)) buckets.push('core');
  if (/cardio|conditioning|hiit|walk/.test(lowered)) buckets.push('cardio');
  if (/mobility|recovery|stretch/.test(lowered)) buckets.push('mobility');
  if (buckets.length === 0) buckets.push('push', 'lower', 'core');

  const durationBase = goal === 'Cut' ? 40 : goal === 'Bulk' ? 55 : goal === 'Muscle Growth' ? 50 : 45;
  const restBase = goal === 'Cut' ? 20 : goal === 'Bulk' ? 45 : goal === 'Muscle Growth' ? 35 : 25;
  const setBase = goal === 'Bulk' || goal === 'Muscle Growth' ? 4 : 3;

  return buckets.map((bucket, idx) => {
    const pool = EXERCISE_LIBRARY[bucket];
    const item = pool[(dayIndex + idx) % pool.length];
    const duration = durationBase + idx * 10;
    const rest = restBase + idx * 5;
    const calories = Math.round(duration / 6) + (bucket === 'cardio' ? 10 : bucket === 'lower' ? 8 : 5);

    return {
      exercise_name: item[0],
      sets: setBase,
      reps: bucket === 'mobility' ? 8 : bucket === 'cardio' ? 20 : 12,
      duration_seconds: duration,
      rest_duration_seconds: rest,
      muscle_group: item[1],
      description: item[2],
      estimated_calories_burn: calories,
      animation: mapBucketToAnimation(bucket),
    };
  });
}

function mapBucketToAnimation(bucket) {
  const map = {
    push: 'push',
    pull: 'pull',
    lower: 'squat',
    core: 'plank',
    cardio: 'jump',
    mobility: 'stretch',
  };
  return map[bucket] || 'stretch';
}

function buildWorkoutPrompt(goal) {
  return [
    `Generate a ${goal} daily workout plan as JSON only.`,
    'Each exercise must include exercise_name, sets, reps, duration_seconds, rest_duration_seconds, muscle_group, description, and estimated_calories_burn.',
    'Return a 7-day weekly_plan with focus_area and summary for each day.',
  ].join(' ');
}

function getTodayPlan(plan) {
  const today = getDayName();
  return plan.find(day => day.day === today) || plan[0] || null;
}

function getDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function playCompletionTone() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.25);
  } catch (error) {
    console.warn('Audio cue unavailable:', error);
  }
}

function getExerciseAnimationMarkup(animation) {
  return `
    <svg viewBox="0 0 120 120" class="motion-figure motion-${escapeHtml(animation)}" aria-hidden="true">
      <circle cx="60" cy="18" r="10"></circle>
      <path class="motion-body" d="M60 28 L60 60"></path>
      <path class="motion-arm motion-arm-left" d="M60 38 L32 54"></path>
      <path class="motion-arm motion-arm-right" d="M60 38 L88 54"></path>
      <path class="motion-leg motion-leg-left" d="M60 60 L40 96"></path>
      <path class="motion-leg motion-leg-right" d="M60 60 L80 96"></path>
    </svg>
  `;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
