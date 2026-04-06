// workout.js - Goal-based weekly workout view with posture guidance

let exercises = [];
let completedCount = 0;
let timerInterval = null;
let timerSeconds = 0;
let currentExerciseName = '';

document.addEventListener('DOMContentLoaded', () => {
  loadWorkoutPlan();
  initTimer();
});

async function loadWorkoutPlan() {
  try {
    const data = await workoutAPI.getPlan();
    const plans = data.plan || [];
    const today = getDayName();

    renderWeeklySummary(data);
    renderWeeklyPlan(plans);

    const todayPlan = plans.find(plan => plan.day === today);
    if (todayPlan && todayPlan.exercises && todayPlan.exercises.length > 0) {
      exercises = todayPlan.exercises;
      renderExercises(todayPlan);
      updateSessionProgress();
    } else {
      showRestDay();
    }
  } catch (err) {
    if (err.status === 404) {
      showRestDay();
      return;
    }
    console.error('Failed to load workout plan:', err);
    showEmptyState('exercises-container', 'Workout', 'Failed to load', 'Could not fetch your workout plan');
  }
}

function renderWeeklySummary(data) {
  const goal = document.getElementById('workout-goal');
  const duration = document.getElementById('weekly-duration');
  const burn = document.getElementById('weekly-burn');
  const days = document.getElementById('weekly-days');
  const source = document.getElementById('weekly-plan-source');

  if (goal) goal.textContent = formatEnumLabel(data.goal || data.template_key || data.source || 'plan');
  if (duration) duration.textContent = `${data.total_duration_min || 0} min`;
  if (burn) burn.textContent = `${data.total_estimated_calories_burn || 0} kcal`;
  if (days) days.textContent = `${data.active_days || 0} / ${data.total_days || 7}`;
  if (source) source.textContent = data.source === 'custom' ? 'Custom Plan' : 'Goal Plan';
}

function renderExercises(todayPlan) {
  const container = document.getElementById('exercises-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card mb-3 animate-fade-in-up">
      <div class="card-body" style="display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: center;">
        <div>
          <div style="font-size: 1.1rem; font-weight: 700; color: var(--text);">${escapeHtml(todayPlan.plan_name || "Today's Workout")}</div>
          <div class="text-muted" style="font-size: 0.85rem; margin-top: 4px;">${todayPlan.exercises.length} exercises · ${todayPlan.total_duration_min || 0} min · ${todayPlan.total_estimated_calories_burn || 0} kcal burn</div>
        </div>
        <span class="badge badge-accent">Today</span>
      </div>
    </div>
    ${exercises.map((exercise, index) => renderExerciseCard(exercise, index)).join('')}
  `;

  container.querySelectorAll('.start-timer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      startExerciseTimer(btn.dataset.name);
    });
  });

  container.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      completeExercise(parseInt(btn.dataset.index, 10), btn.dataset.name, parseInt(btn.dataset.duration, 10) || 0);
    });
  });
}

function renderExerciseCard(exercise, index) {
  const details = [];
  if (exercise.sets) details.push(`${exercise.sets} sets`);
  if (exercise.reps) details.push(`${exercise.reps} reps`);
  details.push(`${exercise.estimated_duration_min || exercise.duration_min || 0} min`);
  details.push(`${exercise.estimated_calories_burn || 0} kcal`);

  return `
    <div class="card mb-2 hover-lift animate-fade-in-up exercise-card" id="ex-card-${index}" style="animation-delay: ${index * 0.08}s;">
      <div class="card-body" style="display: flex; align-items: stretch; gap: 16px; padding: 20px 24px; flex-wrap: wrap;">
        <div class="exercise-check" id="ex-check-${index}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; transition: var(--transition);"></div>
        <div style="width: 120px; min-height: 120px; border-radius: 18px; border: 1px solid var(--border); background: linear-gradient(180deg, rgba(0,212,170,0.12), rgba(0,180,216,0.04)); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${getWorkoutPoseMarkup(exercise.name)}
        </div>
        <div style="flex: 1; min-width: 260px;">
          <div style="font-weight: 700; color: var(--text); font-size: 1rem;">${escapeHtml(exercise.name || 'Exercise')}</div>
          <div class="text-muted" style="font-size: 0.85rem; margin-top: 4px;">${details.join(' · ')}</div>
          <div style="margin-top: 12px; padding: 12px 14px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border);">
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Posture</div>
            <div style="font-weight: 600; color: var(--text);">${escapeHtml(exercise.posture || 'Controlled neutral posture')}</div>
            <div class="text-muted" style="font-size: 0.85rem; margin-top: 8px; line-height: 1.55;">${Array.isArray(exercise.posture_cues) ? exercise.posture_cues.map(escapeHtml).join(' ') : ''}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: flex-start;">
          <button class="btn btn-outline btn-sm start-timer-btn" data-index="${index}" data-name="${escapeHtml(exercise.name || 'Exercise')}">Timer</button>
          <button class="btn btn-primary btn-sm complete-btn" data-index="${index}" data-name="${escapeHtml(exercise.name || 'Exercise')}" data-duration="${exercise.duration_min || exercise.estimated_duration_min || 0}">Done</button>
        </div>
      </div>
    </div>
  `;
}

function renderWeeklyPlan(plans) {
  const container = document.getElementById('weekly-plan-container');
  if (!container) return;

  container.innerHTML = plans.map((plan, index) => `
    <div class="card mb-2 hover-lift animate-fade-in-up" style="animation-delay: ${index * 0.05}s;">
      <div class="card-body" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: center; margin-bottom: 16px;">
          <div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--text);">${escapeHtml(plan.day)} · ${escapeHtml(plan.plan_name || `${plan.day} Workout`)}</div>
            <div class="text-muted" style="font-size: 0.85rem; margin-top: 4px;">${plan.exercises.length} exercises · ${plan.total_duration_min || 0} min · ${plan.total_estimated_calories_burn || 0} kcal burn</div>
          </div>
          <span class="badge ${plan.day === getDayName() ? 'badge-accent' : 'badge-outline'}">${plan.day === getDayName() ? 'Today' : 'Planned'}</span>
        </div>
        <div style="display: grid; gap: 12px;">
          ${plan.exercises.map(exercise => `
            <div style="display: grid; grid-template-columns: 108px 1fr; gap: 14px; padding: 14px; border-radius: 16px; border: 1px solid var(--border); background: var(--surface-2);">
              <div style="border-radius: 14px; background: linear-gradient(180deg, rgba(0,212,170,0.14), rgba(0,180,216,0.05)); display: flex; align-items: center; justify-content: center; min-height: 108px;">
                ${getWorkoutPoseMarkup(exercise.name)}
              </div>
              <div>
                <div style="font-weight: 700; color: var(--text);">${escapeHtml(exercise.name)}</div>
                <div class="text-muted" style="font-size: 0.85rem; margin-top: 4px;">${buildExerciseMeta(exercise)}</div>
                <div style="margin-top: 10px; font-size: 0.9rem; color: var(--text);">${escapeHtml(exercise.posture || 'Controlled neutral posture')}</div>
                <div class="text-muted" style="margin-top: 6px; line-height: 1.55; font-size: 0.85rem;">${Array.isArray(exercise.posture_cues) ? exercise.posture_cues.map(escapeHtml).join(' ') : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function buildExerciseMeta(exercise) {
  const parts = [];
  if (exercise.sets) parts.push(`${exercise.sets} sets`);
  if (exercise.reps) parts.push(`${exercise.reps} reps`);
  parts.push(`${exercise.estimated_duration_min || exercise.duration_min || 0} min`);
  parts.push(`${exercise.estimated_calories_burn || 0} kcal`);
  return parts.join(' · ');
}

async function completeExercise(index, name, durationMin) {
  const card = document.getElementById(`ex-card-${index}`);
  const check = document.getElementById(`ex-check-${index}`);

  if (card && card.classList.contains('completed')) return;

  if (check) {
    check.style.background = 'var(--accent)';
    check.style.borderColor = 'var(--accent)';
    check.innerHTML = '✓';
    check.style.color = '#fff';
  }
  if (card) {
    card.classList.add('completed');
    card.style.opacity = '0.72';
  }

  completedCount++;
  updateSessionProgress();

  try {
    await workoutAPI.logTimer({
      exercise_name: name,
      duration_seconds: (durationMin || 1) * 60,
      log_date: todayDate(),
    });
  } catch (err) {
    console.error('Failed to log exercise:', err);
  }

  showToast(`${name} completed`, 'success');

  if (completedCount >= exercises.length) {
    document.getElementById('finish-workout-btn').style.display = 'inline-flex';
  }
}

function updateSessionProgress() {
  const total = exercises.length;
  const progress = document.getElementById('session-progress');
  const bar = document.getElementById('session-bar');
  const finishBtn = document.getElementById('finish-workout-btn');

  if (progress) progress.textContent = `${completedCount} / ${total}`;
  if (bar) bar.style.width = `${percentage(completedCount, total)}%`;
  if (finishBtn) {
    finishBtn.style.display = completedCount > 0 ? 'inline-flex' : 'none';
    finishBtn.onclick = () => {
      showToast('Workout session complete! Great job!', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);
    };
  }
}

function initTimer() {
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resetBtn = document.getElementById('timer-reset');
  const doneBtn = document.getElementById('timer-done');

  startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-flex';
    timerInterval = setInterval(tickTimer, 1000);
  });

  pauseBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    pauseBtn.style.display = 'none';
    startBtn.style.display = 'inline-flex';
    startBtn.textContent = 'Resume';
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerSeconds = 0;
    updateTimerDisplay();
    pauseBtn.style.display = 'none';
    startBtn.style.display = 'inline-flex';
    startBtn.textContent = 'Start';
  });

  doneBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    document.getElementById('timer-card').style.display = 'none';

    const index = exercises.findIndex(exercise => {
      const exerciseName = typeof exercise === 'object' ? exercise.name : String(exercise);
      return exerciseName === currentExerciseName;
    });

    if (index >= 0) {
      const duration = exercises[index].duration_min || exercises[index].estimated_duration_min || Math.ceil(timerSeconds / 60);
      completeExercise(index, currentExerciseName, duration);
    }

    timerSeconds = 0;
    updateTimerDisplay();
  });
}

function startExerciseTimer(name) {
  currentExerciseName = name;
  document.getElementById('timer-card').style.display = 'block';
  document.getElementById('timer-exercise-name').textContent = name;
  timerSeconds = 0;
  updateTimerDisplay();
  document.getElementById('timer-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function tickTimer() {
  timerSeconds++;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  const min = Math.floor(timerSeconds / 60);
  const sec = timerSeconds % 60;
  display.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function showRestDay() {
  const container = document.getElementById('exercises-container');
  const sessionCard = document.getElementById('session-card');
  if (sessionCard) sessionCard.style.display = 'none';

  container.innerHTML = `
    <div class="card animate-fade-in-up">
      <div class="card-body" style="text-align: center; padding: 60px 24px;">
        <div style="font-size: 3rem; margin-bottom: 16px;">Rest</div>
        <h3 style="color: var(--text); margin-bottom: 8px;">Recovery Day</h3>
        <p class="text-muted" style="max-width: 420px; margin: 0 auto; line-height: 1.6;">
          No workout is scheduled for today. Use the weekly plan below to review the next active day and its posture cues.
        </p>
      </div>
    </div>
  `;
}

function getWorkoutPoseMarkup(name) {
  const lower = /squat|lunge|leg|walk|jog|hike|cycling|bike|cardio|jump/i.test(name);
  const push = /press|push|dip/i.test(name);
  const pull = /pull|row|curl|deadlift/i.test(name);
  const accent = lower ? '#00b4d8' : push ? '#00d4aa' : pull ? '#ff8a65' : '#7ccf7a';
  const arms = push ? 'M38 28 L18 36 M38 28 L58 36' : pull ? 'M38 28 L20 22 M38 28 L56 22' : 'M38 28 L20 32 M38 28 L56 32';
  const legs = lower ? 'M38 42 L24 60 M38 42 L50 58 M24 60 L18 68 M50 58 L56 68' : 'M38 42 L30 62 M38 42 L48 62';

  return `
    <svg width="76" height="76" viewBox="0 0 76 76" fill="none" aria-hidden="true">
      <circle cx="38" cy="14" r="7" fill="${accent}" opacity="0.95"/>
      <path d="M38 22 L38 42" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
      <path d="${arms}" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
      <path d="${legs}" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
    </svg>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
