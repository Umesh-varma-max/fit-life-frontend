// --------------------------------------------------
// tracker.js - Activity Logging (Meals/Workout/Water/Sleep)
// --------------------------------------------------

const SCANNED_MEAL_LOG_KEY = 'fitlife_scanned_meal_logs';

let currentDate = todayDate();
let waterTotal = 0;

document.addEventListener('DOMContentLoaded', () => {
  initDatePicker();
  initTabs();
  initMealForm();
  initWorkoutForm();
  initWaterControls();
  initSleepControls();
  loadDayLogs(currentDate);
});

// --------------------------------------------------
// Date Picker
// --------------------------------------------------
function initDatePicker() {
  const dateInput = document.getElementById('tracker-date');
  const prevBtn = document.getElementById('prev-day');
  const nextBtn = document.getElementById('next-day');
  const todayBtn = document.getElementById('today-btn');

  dateInput.value = currentDate;

  dateInput.addEventListener('change', () => {
    currentDate = dateInput.value;
    loadDayLogs(currentDate);
  });

  prevBtn.addEventListener('click', () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    currentDate = d.toISOString().split('T')[0];
    dateInput.value = currentDate;
    loadDayLogs(currentDate);
  });

  nextBtn.addEventListener('click', () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    currentDate = d.toISOString().split('T')[0];
    dateInput.value = currentDate;
    loadDayLogs(currentDate);
  });

  todayBtn.addEventListener('click', () => {
    currentDate = todayDate();
    dateInput.value = currentDate;
    loadDayLogs(currentDate);
  });
}

// --------------------------------------------------
// Tab Switching
// --------------------------------------------------
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  const params = new URLSearchParams(window.location.search);
  const activeTab = params.get('tab');
  if (activeTab) {
    tabs.forEach((t) => t.classList.remove('active'));
    contents.forEach((c) => c.classList.remove('active'));
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${activeTab}"]`);
    const tabContent = document.getElementById(`content-${activeTab}`);
    if (tabBtn) tabBtn.classList.add('active');
    if (tabContent) tabContent.classList.add('active');
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(`content-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });
}

// --------------------------------------------------
// Load Day Logs
// --------------------------------------------------
async function loadDayLogs(date) {
  try {
    const data = await activityAPI.getDay(date);
    renderDaySummary(data.summary);
    renderDayLogs(data.logs || []);
  } catch (err) {
    if (err.status === 404) {
      renderDaySummary({ calories_in: 0, calories_out: 0, water_ml: 0, sleep_hours: 0 });
      renderDayLogs([]);
      return;
    }
    console.error('Failed to load day logs:', err);
  }
}

// --------------------------------------------------
// Render Day Summary
// --------------------------------------------------
function renderDaySummary(summary) {
  const sumCalIn = document.getElementById('sum-cal-in');
  const sumCalOut = document.getElementById('sum-cal-out');
  const sumWater = document.getElementById('sum-water');
  const sumSleep = document.getElementById('sum-sleep');

  if (sumCalIn) sumCalIn.textContent = formatNumber(summary.calories_in || 0);
  if (sumCalOut) sumCalOut.textContent = formatNumber(summary.calories_out || 0);
  if (sumWater) sumWater.textContent = formatNumber(summary.water_ml || 0);
  if (sumSleep) sumSleep.textContent = (summary.sleep_hours || 0).toFixed(1);

  waterTotal = summary.water_ml || 0;
  updateWaterDisplay();
}

// --------------------------------------------------
// Render Day Logs
// --------------------------------------------------
function renderDayLogs(logs) {
  const mealLogs = mergeMealLogsWithScanned(logs.filter((log) => log.log_type === 'meal'));
  const workoutLogs = logs.filter((log) => log.log_type === 'workout');

  const mealsList = document.getElementById('meals-list');
  const mealsCount = document.getElementById('meals-count');
  if (mealsCount) mealsCount.textContent = mealLogs.length;

  if (mealLogs.length === 0) {
    mealsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Meal</div>
        <div class="empty-state-title">No meals logged</div>
        <p class="empty-state-text">Start logging your meals to track calorie intake</p>
      </div>`;
  } else {
    mealsList.innerHTML = mealLogs.map((log) => `
      <div class="log-item animate-fade-in-up">
        ${renderMealLogVisual(log)}
        <div class="log-item-info">
          <div class="log-item-title">${escapeHtml(log.description || 'Meal')}</div>
          <div class="log-item-meta">${buildMealMeta(log)}</div>
        </div>
      </div>
    `).join('');
  }

  const workoutList = document.getElementById('workout-list');
  const workoutsCount = document.getElementById('workouts-count');
  if (workoutsCount) workoutsCount.textContent = workoutLogs.length;

  if (workoutLogs.length === 0) {
    workoutList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Run</div>
        <div class="empty-state-title">No workouts logged</div>
        <p class="empty-state-text">Log your exercises to track calories burned</p>
      </div>`;
  } else {
    workoutList.innerHTML = workoutLogs.map((log) => `
      <div class="log-item animate-fade-in-up">
        <div class="log-item-icon">🏋️</div>
        <div class="log-item-info">
          <div class="log-item-title">${escapeHtml(log.description || 'Workout')}</div>
          <div class="log-item-meta">${log.duration_min || 0} min · ${log.calories_out || 0} kcal burned</div>
        </div>
      </div>
    `).join('');
  }
}

function buildMealMeta(log) {
  const parts = [`${log.calories_in || 0} kcal`];
  if (log.serving_estimate) {
    parts.push(escapeHtml(log.serving_estimate));
  }
  if (log.scanned_at) {
    parts.push(escapeHtml(log.scanned_at));
  }
  return parts.join(' · ');
}

function mergeMealLogsWithScanned(mealLogs) {
  const currentDayScans = getScannedMealLogs().filter((entry) => entry.log_date === currentDate);
  if (!currentDayScans.length) return mealLogs;

  const merged = [...mealLogs];
  const existingKeys = new Set(
    merged.map((log) => mealLogKey(log))
  );

  currentDayScans.forEach((entry) => {
    const key = mealLogKey(entry);
    if (existingKeys.has(key)) {
      const match = merged.find((log) => mealLogKey(log) === key);
      if (match && !match.image && entry.image) {
        match.image = entry.image;
      }
      if (match && !match.serving_estimate && entry.serving_estimate) {
        match.serving_estimate = entry.serving_estimate;
      }
      if (match && !match.scanned_at && entry.scanned_at) {
        match.scanned_at = entry.scanned_at;
      }
      return;
    }

    merged.unshift({
      ...entry,
      log_type: 'meal'
    });
    existingKeys.add(key);
  });

  return merged;
}

function mealLogKey(log) {
  return `${log.description || ''}|${Number(log.calories_in || 0)}|${log.log_date || currentDate}`;
}

function getScannedMealLogs() {
  try {
    return JSON.parse(localStorage.getItem(SCANNED_MEAL_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function renderMealLogVisual(log) {
  if (log.image) {
    return `<img src="${escapeHtml(log.image)}" alt="${escapeHtml(log.food_name || log.description || 'Meal')}" class="log-item-thumb">`;
  }

  return '<div class="log-item-icon">🍽️</div>';
}

// --------------------------------------------------
// Meal Form
// --------------------------------------------------
function initMealForm() {
  const btn = document.getElementById('log-meal-btn');
  btn.addEventListener('click', async () => {
    const desc = document.getElementById('meal-desc').value.trim();
    const cal = parseInt(document.getElementById('meal-calories').value, 10) || 0;

    if (!desc) {
      showToast('Please enter a food description', 'warning');
      return;
    }
    if (cal <= 0) {
      showToast('Please enter calories', 'warning');
      return;
    }

    setLoading('log-meal-btn', true);
    try {
      await activityAPI.log({
        log_type: 'meal',
        description: desc,
        calories_in: cal,
        log_date: currentDate
      });
      showToast('Meal logged successfully!', 'success');
      document.getElementById('meal-desc').value = '';
      document.getElementById('meal-calories').value = '';
      loadDayLogs(currentDate);
    } catch (err) {
      showToast(err.message || 'Failed to log meal', 'error');
    } finally {
      setLoading('log-meal-btn', false);
    }
  });
}

// --------------------------------------------------
// Workout Form
// --------------------------------------------------
function initWorkoutForm() {
  const btn = document.getElementById('log-workout-btn');
  btn.addEventListener('click', async () => {
    const desc = document.getElementById('wk-desc').value;
    const dur = parseInt(document.getElementById('wk-duration').value, 10) || 0;
    const cal = parseInt(document.getElementById('wk-calories').value, 10) || 0;

    if (!desc) {
      showToast('Please select a workout type', 'warning');
      return;
    }
    if (dur <= 0) {
      showToast('Please enter workout duration', 'warning');
      return;
    }

    setLoading('log-workout-btn', true);
    try {
      await activityAPI.log({
        log_type: 'workout',
        description: desc,
        duration_min: dur,
        calories_out: cal,
        log_date: currentDate
      });
      showToast('Workout logged!', 'success');
      document.getElementById('wk-desc').value = '';
      document.getElementById('wk-duration').value = '';
      document.getElementById('wk-calories').value = '';
      loadDayLogs(currentDate);
    } catch (err) {
      showToast(err.message || 'Failed to log workout', 'error');
    } finally {
      setLoading('log-workout-btn', false);
    }
  });
}

// --------------------------------------------------
// Water Controls
// --------------------------------------------------
function initWaterControls() {
  document.querySelectorAll('.water-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.dataset.amount, 10);
      logWater(amount);
    });
  });

  const customBtn = document.getElementById('water-custom-btn');
  customBtn.addEventListener('click', () => {
    const input = document.getElementById('water-custom');
    const amount = parseInt(input.value, 10);
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', 'warning');
      return;
    }
    logWater(amount);
    input.value = '';
  });
}

async function logWater(amount) {
  try {
    await activityAPI.log({
      log_type: 'water',
      water_ml: amount,
      log_date: currentDate
    });
    waterTotal += amount;
    updateWaterDisplay();
    showToast(`+${amount} ml water logged!`, 'success');
    const sumWater = document.getElementById('sum-water');
    if (sumWater) sumWater.textContent = formatNumber(waterTotal);
  } catch (err) {
    showToast(err.message || 'Failed to log water', 'error');
  }
}

function updateWaterDisplay() {
  const display = document.getElementById('water-display');
  const progress = document.getElementById('water-progress');
  const goalDisplay = document.getElementById('water-goal-display');
  const goal = CONFIG.WATER_GOAL_ML;

  if (display) display.textContent = `${formatNumber(waterTotal)} ml`;
  if (goalDisplay) goalDisplay.textContent = `Goal: ${formatNumber(goal)} ml`;
  if (progress) progress.style.width = `${percentage(waterTotal, goal)}%`;
}

// --------------------------------------------------
// Sleep Controls
// --------------------------------------------------
function initSleepControls() {
  const slider = document.getElementById('sleep-range');
  const display = document.getElementById('sleep-range-display');
  const sleepDisplay = document.getElementById('sleep-display');

  slider.addEventListener('input', () => {
    const value = parseFloat(slider.value);
    display.textContent = value.toFixed(1);
    sleepDisplay.textContent = `${value.toFixed(1)} hrs`;
  });

  const btn = document.getElementById('log-sleep-btn');
  btn.addEventListener('click', async () => {
    const hours = parseFloat(slider.value);
    if (hours <= 0) {
      showToast('Please set your sleep hours', 'warning');
      return;
    }

    setLoading('log-sleep-btn', true);
    try {
      await activityAPI.log({
        log_type: 'sleep',
        sleep_hours: hours,
        log_date: currentDate
      });
      showToast(`${hours} hrs sleep logged!`, 'success');
      const sumSleep = document.getElementById('sum-sleep');
      if (sumSleep) sumSleep.textContent = hours.toFixed(1);
    } catch (err) {
      showToast(err.message || 'Failed to log sleep', 'error');
    } finally {
      setLoading('log-sleep-btn', false);
    }
  });
}

// --------------------------------------------------
// HTML Escape Util
// --------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
