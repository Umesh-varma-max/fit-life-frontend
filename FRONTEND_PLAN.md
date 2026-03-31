# 🎨 FRONTEND PLAN — AI Fitness Management System
## Standalone Repo · Vanilla HTML + CSS + JavaScript

> **Repo Name:** `fitness-frontend`  
> **Backend URL (env config):** `http://localhost:5000/api` (dev) → `https://api.yourapp.com/api` (prod)  
> **Auth:** JWT stored in `localStorage`  
> **No build tool required** — plain files, open in browser or serve with Live Server

---

# TABLE OF CONTENTS

1. [Repo Structure](#1-repo-structure)
2. [Environment Config](#2-environment-config)
3. [CSS Architecture](#3-css-architecture)
4. [JS Module Architecture](#4-js-module-architecture)
5. [Page-by-Page Plan](#5-page-by-page-plan)
6. [API Contract (Frontend Side)](#6-api-contract-frontend-side)
7. [Component Patterns](#7-component-patterns)
8. [Voice & Timer Features](#8-voice--timer-features)
9. [Charts (Chart.js)](#9-charts-chartjs)
10. [Dark Mode](#10-dark-mode)
11. [PDF Export](#11-pdf-export)
12. [Notifications & Reminders](#12-notifications--reminders)
13. [Auth Guard](#13-auth-guard)
14. [Error Handling & UX](#14-error-handling--ux)
15. [Responsive Design Rules](#15-responsive-design-rules)
16. [Build & Deploy](#16-build--deploy)

---

# 1. REPO STRUCTURE

```
fitness-frontend/
│
├── index.html                  # Login page (public)
├── register.html               # Sign Up page (public)
├── dashboard.html              # Main hub (protected)
├── profile.html                # Health profile form (protected)
├── tracker.html                # Log meals / workout / water / sleep (protected)
├── recommendations.html        # AI diet + workout plan (protected)
├── workout.html                # Today's workout + timer (protected)
├── food-scanner.html           # Food search + barcode scanner (protected)
├── progress.html               # Charts + trends (protected)
├── trainers.html               # Local trainer connect (protected)
├── doctors.html                # Doctor help (protected)
├── ai-planner.html             # AI voice diet planner (protected)
├── reminders.html              # Reminders + alarm settings (protected)
│
├── css/
│   ├── main.css                # Global variables, reset, typography, layout
│   ├── auth.css                # Login + Register page styles
│   ├── dashboard.css           # Dashboard cards, grid, sidebar
│   ├── components.css          # Buttons, cards, modals, badges, toasts
│   ├── forms.css               # All form input styles
│   ├── charts.css              # Chart wrapper styles
│   ├── dark-mode.css           # [data-theme="dark"] overrides
│   └── animations.css          # Keyframes, transitions, loading spinners
│
├── js/
│   ├── config.js               # API_BASE_URL, constants
│   ├── api.js                  # Central fetch wrapper (all HTTP calls)
│   ├── auth.js                 # Login / Register / Logout logic
│   ├── auth-guard.js           # Redirect if no token (runs on every protected page)
│   ├── profile.js              # Profile form, live BMI calc
│   ├── dashboard.js            # Dashboard data fetch + render
│   ├── tracker.js              # Activity logging tabs
│   ├── recommendations.js      # Render diet + workout cards
│   ├── workout.js              # Workout plan display + timer
│   ├── food-scanner.js         # Food search + barcode input
│   ├── progress.js             # Chart.js charts
│   ├── trainers.js             # Trainer listings + filter
│   ├── doctors.js              # Doctor listings + filter
│   ├── ai-planner.js           # Voice AI chat interface
│   ├── reminders.js            # Reminder CRUD + notifications
│   ├── dark-mode.js            # Theme toggle + persist
│   ├── pdf-export.js           # jsPDF health report export
│   ├── toast.js                # Global toast notification utility
│   └── utils.js                # Date helpers, formatters, validators
│
├── assets/
│   ├── icons/                  # SVG icons (offline fallback)
│   ├── images/                 # Placeholder avatars, banners
│   └── audio/
│       └── beep.mp3            # Timer alarm sound
│
└── README.md
```

---

# 2. ENVIRONMENT CONFIG

```javascript
// js/config.js
// ─────────────────────────────────────────────
// Change API_BASE to your backend URL.
// In production, set to your deployed backend.
// ─────────────────────────────────────────────

const CONFIG = {
  API_BASE:         'http://localhost:5000/api',   // dev
  // API_BASE:      'https://api.yourapp.com/api', // prod

  TOKEN_KEY:        'fitness_access_token',
  USER_KEY:         'fitness_user',
  THEME_KEY:        'fitness_theme',

  WATER_GOAL_ML:    3000,
  SLEEP_GOAL_HRS:   8,

  CHART_COLORS: {
    primary:  '#00d4aa',
    danger:   '#ff6b6b',
    warning:  '#ffd93d',
    muted:    '#a0a0b0'
  }
};
```

---

# 3. CSS ARCHITECTURE

## 3.1 main.css — Design Tokens + Global

```css
/* ─── Google Fonts ─── */
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');

/* ─── CSS Variables (Light Mode) ─── */
:root {
  /* Colors */
  --bg:             #f0f4f8;
  --bg-alt:         #e8eef5;
  --card:           #ffffff;
  --text:           #1a1a2e;
  --text-muted:     #6b7280;
  --accent:         #00d4aa;
  --accent-dark:    #00a884;
  --danger:         #ff6b6b;
  --warning:        #ffd93d;
  --success:        #6bcb77;
  --border:         #e0e7ef;
  --shadow:         0 4px 24px rgba(0,0,0,0.07);

  /* Typography */
  --font-main:      'Sora', sans-serif;
  --font-mono:      'DM Mono', monospace;

  /* Spacing */
  --radius:         14px;
  --radius-sm:      8px;
  --sidebar-w:      240px;
  --header-h:       64px;
}

/* ─── Dark Mode Overrides ─── */
[data-theme="dark"] {
  --bg:             #0d0d1a;
  --bg-alt:         #12122a;
  --card:           #1a1a2e;
  --text:           #e8eaf6;
  --text-muted:     #8888aa;
  --border:         #2a2a45;
  --shadow:         0 4px 24px rgba(0,0,0,0.4);
}

/* ─── Reset ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-main); background: var(--bg); color: var(--text); line-height: 1.6; }
a { color: var(--accent); text-decoration: none; }
img { max-width: 100%; }
```

## 3.2 Layout Pattern (All Protected Pages)

Every protected page uses this shell:
```html
<body data-page="dashboard">

  <!-- Sidebar -->
  <aside class="sidebar" id="sidebar">
    <!-- logo + nav links + user card -->
  </aside>

  <!-- Main Content -->
  <div class="main-wrap">
    <header class="topbar">
      <!-- page title + dark mode toggle + notifications bell -->
    </header>
    <main class="page-content" id="page-content">
      <!-- page-specific content -->
    </main>
  </div>

</body>
```

```css
/* dashboard.css */
.sidebar {
  position: fixed; top: 0; left: 0;
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--card);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 24px 0;
  z-index: 100;
  transition: transform 0.3s ease;
}

.main-wrap {
  margin-left: var(--sidebar-w);
  min-height: 100vh;
  display: flex; flex-direction: column;
}

.topbar {
  height: var(--header-h);
  background: var(--card);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky; top: 0; z-index: 50;
}

.page-content {
  flex: 1;
  padding: 32px;
}

/* Mobile: sidebar becomes drawer */
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .main-wrap { margin-left: 0; }
}
```

---

# 4. JS MODULE ARCHITECTURE

## 4.1 api.js — Central HTTP Client

```javascript
// js/api.js
// All HTTP calls go through this file.
// Automatically attaches JWT. Handles 401 redirect.

import { CONFIG } from './config.js';

function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {})
  };

  let response;
  try {
    response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });
  } catch (err) {
    throw new Error('Network error — check backend connection');
  }

  if (response.status === 401) {
    localStorage.clear();
    window.location.href = '/index.html';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

// ─── AUTH ───────────────────────────────────────────
export const authAPI = {
  register: (body) => apiFetch('/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => apiFetch('/login',    { method: 'POST', body: JSON.stringify(body) }),
  logout:   ()     => apiFetch('/logout',   { method: 'POST' })
};

// ─── PROFILE ────────────────────────────────────────
export const profileAPI = {
  get:  ()     => apiFetch('/profile'),
  save: (body) => apiFetch('/profile', { method: 'POST', body: JSON.stringify(body) })
};

// ─── DASHBOARD ──────────────────────────────────────
export const dashboardAPI = {
  get: () => apiFetch('/dashboard')
};

// ─── RECOMMENDATIONS ────────────────────────────────
export const recommendAPI = {
  get: () => apiFetch('/recommendations')
};

// ─── ACTIVITY ───────────────────────────────────────
export const activityAPI = {
  log:     (body) => apiFetch('/activity', { method: 'POST', body: JSON.stringify(body) }),
  getDay:  (date) => apiFetch(`/activity?date=${date}`)
};

// ─── FOOD ───────────────────────────────────────────
export const foodAPI = {
  search:  (q)    => apiFetch(`/food/search?q=${encodeURIComponent(q)}`),
  barcode: (body) => apiFetch('/food/scan', { method: 'POST', body: JSON.stringify(body) })
};

// ─── WORKOUT ────────────────────────────────────────
export const workoutAPI = {
  getPlan:  ()     => apiFetch('/workout/plan'),
  savePlan: (body) => apiFetch('/workout/plan', { method: 'POST', body: JSON.stringify(body) }),
  logTimer: (body) => apiFetch('/workout/timer', { method: 'POST', body: JSON.stringify(body) })
};

// ─── TRAINERS ───────────────────────────────────────
export const trainerAPI = {
  list: (location) => apiFetch(`/trainers?location=${encodeURIComponent(location)}`)
};

// ─── DOCTORS ────────────────────────────────────────
export const doctorAPI = {
  list: (spec) => apiFetch(`/doctors?specialization=${encodeURIComponent(spec)}`)
};

// ─── AI PLANNER ─────────────────────────────────────
export const aiAPI = {
  chat: (body) => apiFetch('/ai/diet-chat', { method: 'POST', body: JSON.stringify(body) })
};

// ─── REMINDERS ──────────────────────────────────────
export const reminderAPI = {
  list:   ()     => apiFetch('/reminders'),
  add:    (body) => apiFetch('/reminders', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id)   => apiFetch(`/reminders/${id}`, { method: 'DELETE' })
};

// ─── PROGRESS ───────────────────────────────────────
export const progressAPI = {
  get: (period) => apiFetch(`/progress?period=${period}`)
};

// ─── EXPORT ─────────────────────────────────────────
export const exportAPI = {
  pdf: () => fetch(`${CONFIG.API_BASE}/export/pdf`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
};
```

---

## 4.2 auth-guard.js — Route Protection

```javascript
// js/auth-guard.js
// Include this as the FIRST script on every protected page.
// <script src="/js/auth-guard.js"></script>

(function() {
  const token = localStorage.getItem('fitness_access_token');
  if (!token) {
    window.location.replace('/index.html');
  }
})();
```

---

## 4.3 toast.js — Global Toast Notifications

```javascript
// js/toast.js
export function showToast(message, type = 'info', duration = 3500) {
  // type: 'success' | 'error' | 'warning' | 'info'
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

const icons = {
  success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
};
```

```css
/* components.css */
.toast {
  position: fixed; bottom: 24px; right: 24px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px 20px;
  display: flex; align-items: center; gap: 10px;
  box-shadow: var(--shadow);
  transform: translateY(20px); opacity: 0;
  transition: all 0.3s ease;
  z-index: 9999;
}
.toast.show { transform: translateY(0); opacity: 1; }
.toast-success { border-left: 4px solid var(--success); }
.toast-error   { border-left: 4px solid var(--danger); }
.toast-warning { border-left: 4px solid var(--warning); }
```

---

# 5. PAGE-BY-PAGE PLAN

---

## 5.1 `index.html` — Login Page

**Purpose:** Public entry point  
**CSS:** `main.css`, `auth.css`  
**JS:** `auth.js`, `dark-mode.js`

**Layout:**
```
┌────────────────────────────────────┐
│  Logo + App Name                   │
│                                    │
│  [Email input]                     │
│  [Password input]  👁 toggle       │
│  [Remember Me checkbox]            │
│                                    │
│  [LOGIN BUTTON]                    │
│  Don't have an account? Register   │
│                                    │
│  ─── OR ───                        │
│  (future: Google OAuth)            │
└────────────────────────────────────┘
```

**auth.js logic:**
```javascript
// 1. On submit: validate email format + password not empty
// 2. POST /api/login
// 3. On success: store token + user in localStorage, redirect dashboard.html
// 4. On error: show inline error message under form

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!isValidEmail(email)) return showFieldError('email', 'Enter valid email');
  if (password.length < 6)  return showFieldError('password', 'Min 6 characters');

  setLoading(true);
  try {
    const res = await authAPI.login({ email, password });
    localStorage.setItem(CONFIG.TOKEN_KEY, res.access_token);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(res.user));
    window.location.href = '/dashboard.html';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(false);
  }
});
```

---

## 5.2 `register.html` — Sign Up Page

**CSS:** `main.css`, `auth.css`  
**JS:** `auth.js`

**Layout:**
```
┌────────────────────────────────────┐
│  Full Name                         │
│  Email                             │
│  Password  [strength bar]          │
│  Confirm Password                  │
│                                    │
│  [CREATE ACCOUNT BUTTON]           │
│  Already have account? Login       │
└────────────────────────────────────┘
```

**Key features:**
- Real-time password strength bar (weak / fair / strong / very strong)
- Confirm password match check
- POST `/api/register` → auto-redirect to login with success toast

**Password strength logic:**
```javascript
function getPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8)           score++;
  if (/[A-Z]/.test(pwd))         score++;
  if (/[0-9]/.test(pwd))         score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return ['Weak','Fair','Strong','Very Strong'][score - 1] || 'Weak';
}
```

---

## 5.3 `dashboard.html` — Main Dashboard

**CSS:** `main.css`, `dashboard.css`, `components.css`, `charts.css`  
**JS:** `auth-guard.js`, `dashboard.js`, `dark-mode.js`  
**API:** GET `/api/dashboard`

**Layout:**
```
┌──────────┬──────────────────────────────────────────────┐
│          │  TOPBAR: "Good morning, John 👋"  🌙 🔔      │
│ SIDEBAR  ├────────────────┬─────────────┬───────────────┤
│          │  BMI Card      │ Calorie Ring│ Streak Card   │
│ 🏠 Home  ├────────────────┴─────────────┴───────────────┤
│ 👤 Profile│  Weekly Calorie Chart (Chart.js bar chart)   │
│ 📋 Tracker├──────────────────────┬────────────────────  │
│ 🍎 Food  │  Water Progress      │ Today's Tip          │
│ 💪 Workout│  [===========  83%] │ "Try 16:8 fasting"  │
│ 📈 Progress├──────────────────────┴────────────────────  │
│ 🤖 AI Chat│  Quick Log Buttons                           │
│ 🔔 Remind │  [+ Meal]  [+ Workout]  [+ Water]           │
│ 👨‍⚕️ Doctor │                                              │
│ 🏋️ Trainer└──────────────────────────────────────────────┘
└──────────
```

**dashboard.js:**
```javascript
async function loadDashboard() {
  const data = await dashboardAPI.get();
  const d = data.dashboard;

  // BMI card
  document.getElementById('bmi-value').textContent = d.bmi.toFixed(1);
  document.getElementById('bmi-category').textContent = d.bmi_category;

  // Calorie ring (donut chart)
  renderCalorieRing(d.today_calories_in, d.daily_calorie_goal);

  // Streak
  document.getElementById('streak').textContent = `${d.workout_streak} days 🔥`;

  // Water bar
  renderProgressBar('water-bar', d.water_today_ml, d.water_goal_ml);

  // Weekly chart
  renderWeeklyChart(d.weekly_chart);

  // Quote
  document.getElementById('daily-quote').textContent = d.motivational_quote;
}
```

**Charts on Dashboard:**
- Donut chart: calories consumed vs remaining (Chart.js doughnut)
- Bar chart: weekly calories in vs out (Chart.js bar)

---

## 5.4 `profile.html` — Health Profile

**CSS:** `main.css`, `dashboard.css`, `forms.css`  
**JS:** `auth-guard.js`, `profile.js`  
**API:** GET/POST `/api/profile`

**Layout (3-step form):**
```
Step 1: Personal Info
  Full Name | Age | Gender (radio cards: Male / Female / Other)

Step 2: Body & Lifestyle
  Height (cm) | Weight (kg)
  Live BMI display: "Your BMI: 26.1 — Overweight"
  Activity Level (icon cards: 🛋 Sedentary / 🚶 Light / 🏃 Moderate / ⚡ Active)
  Sleep Hours slider
  Food Habits (Veg / Non-Veg / Vegan / Keto / Paleo)

Step 3: Your Goal
  Goal cards: 
    [🔥 Lose Weight] [💪 Gain Muscle] [⚖️ Maintain]

[PREV]                                    [NEXT / SAVE]
```

**Live BMI Calc:**
```javascript
// Instantly update BMI as user types
['height', 'weight'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateBMI);
});

function updateBMI() {
  const h = parseFloat(document.getElementById('height').value) / 100;
  const w = parseFloat(document.getElementById('weight').value);
  if (!h || !w) return;
  const bmi = (w / (h * h)).toFixed(1);
  document.getElementById('live-bmi').textContent = bmi;
  document.getElementById('bmi-badge').textContent = getBMICategory(bmi);
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal ✅';
  if (bmi < 30)   return 'Overweight ⚠️';
  return 'Obese 🚨';
}
```

---

## 5.5 `tracker.html` — Activity Tracker

**CSS:** `main.css`, `dashboard.css`, `forms.css`  
**JS:** `auth-guard.js`, `tracker.js`  
**API:** POST `/api/activity`, GET `/api/activity?date=TODAY`

**Layout:**
```
Date picker: [Today ▾]

Tab bar: [🍽 Meals] [💪 Workout] [💧 Water] [😴 Sleep]

─── MEALS TAB ───
  Search food: [______________] [Search]
  Results list → click to add with portion size
  Today's meal log (list of entries)
  Total: 1,450 / 2,033 kcal

─── WORKOUT TAB ───
  Type: [dropdown: Running/Cycling/Weights/Yoga/Other]
  Duration: [__] minutes
  Est. Calories Burned: [auto or manual]
  [LOG WORKOUT]

─── WATER TAB ───
  Big tap counter: [–] 2,500 ml [+]
  Quick add: [250ml] [500ml] [1L]
  Goal bar

─── SLEEP TAB ───
  Slider: 0 — 12 hours
  [LOG SLEEP]
```

---

## 5.6 `recommendations.html` — AI Recommendations

**CSS:** `main.css`, `dashboard.css`, `components.css`  
**JS:** `auth-guard.js`, `recommendations.js`  
**API:** GET `/api/recommendations`

**Layout:**
```
┌─ BMI Banner ─────────────────────────────────────────────┐
│  BMI: 26.1 · Overweight · 🎯 Goal: Lose 5kg in 8 weeks  │
└──────────────────────────────────────────────────────────┘

Daily Calorie Target: 1,533 kcal

─── DIET PLAN ─────────────────────────────────────────────
[🌅 Breakfast]     [☀️ Lunch]     [🍎 Snack]     [🌙 Dinner]
Oats + banana      Chicken salad  Mixed nuts      Paneer curry
400 kcal           600 kcal       200 kcal        600 kcal

─── WORKOUT PLAN (Week Grid) ──────────────────────────────
Mon     Tue     Wed     Thu     Fri     Sat     Sun
30min   Upper   Rest/   30min   Lower   45min   Rest
Cardio  Body    Yoga    HIIT    Body    Cardio

─── WEEKLY TIPS ───────────────────────────────────────────
< Drink 3L water daily · Sleep 7-8 hrs · Track every meal >

[🔄 Refresh Recommendations]
```

---

## 5.7 `workout.html` — Workout Plan + Timer

**CSS:** `main.css`, `dashboard.css`, `components.css`  
**JS:** `auth-guard.js`, `workout.js`  
**API:** GET `/api/workout/plan`, POST `/api/workout/timer`

**Layout:**
```
Today: Monday — Upper Body Day

Exercise Cards:
┌─────────────────────────────────────────────────────┐
│ Push-ups          3 sets × 15 reps                  │
│ [▶ START TIMER]   ░░░░░░░░░░░░░░░░  0:00           │
│                                    [✓ Done]         │
├─────────────────────────────────────────────────────┤
│ Dumbbell Curl     3 sets × 12 reps                  │
│ [▶ START TIMER]   ░░░░░░░░░░░░░░░░  0:00           │
└─────────────────────────────────────────────────────┘

Rest Timer:  [90 sec REST between sets]  ▶ ⏸ 🔄

Session Progress:  ████████░░  3/5 exercises done
[🏁 FINISH WORKOUT]
```

**Timer JS (full class):**
```javascript
class WorkoutTimer {
  constructor({ duration, display, onDone }) {
    this.total     = duration;
    this.remaining = duration;
    this.display   = display;   // DOM element to update
    this.onDone    = onDone;
    this.interval  = null;
    this.running   = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => {
      this.remaining--;
      this.render();
      if (this.remaining <= 0) this.complete();
    }, 1000);
  }

  pause() {
    clearInterval(this.interval);
    this.running = false;
  }

  reset() {
    this.pause();
    this.remaining = this.total;
    this.render();
  }

  complete() {
    this.pause();
    this.playAlarm();
    this.onDone?.();
  }

  render() {
    const m = String(Math.floor(this.remaining / 60)).padStart(2, '0');
    const s = String(this.remaining % 60).padStart(2, '0');
    this.display.textContent = `${m}:${s}`;
  }

  playAlarm() {
    // Audio beep
    try {
      const audio = new Audio('/assets/audio/beep.mp3');
      audio.play();
    } catch (_) {}

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('⏱️ Time\'s up!', {
        body: 'Move to next set or exercise.',
        icon: '/assets/icons/dumbbell.png'
      });
    }

    // Web Speech announcement
    const msg = new SpeechSynthesisUtterance('Time is up! Great job!');
    msg.rate = 1.0;
    speechSynthesis.speak(msg);
  }
}
```

---

## 5.8 `food-scanner.html` — Food Scanner

**CSS:** `main.css`, `dashboard.css`, `forms.css`  
**JS:** `auth-guard.js`, `food-scanner.js`  
**API:** GET `/api/food/search?q=`, POST `/api/food/scan`

**Layout:**
```
─── Search by Name ────────────────────────────────────────
[🔍 Search food name...          ] [SEARCH]
Results:
  Banana        89 kcal / 100g    [+ Add]
  Banana Shake  180 kcal / 200ml  [+ Add]

─── Scan Barcode ──────────────────────────────────────────
[Enter barcode number:  _______________] [SCAN]
(Camera barcode via QuaggaJS or manual entry)

─── Food Detail Card (shown after add) ────────────────────
  🍌 Banana (150g)
  Calories: 134 kcal
  Protein: 1.7g | Carbs: 34g | Fat: 0.4g
  [Adjust portion] [Add to Today's Log]

─── Daily Goal Bar ────────────────────────────────────────
  1,450 / 2,033 kcal consumed today  [71%]
```

---

## 5.9 `progress.html` — Progress Charts

**CSS:** `main.css`, `dashboard.css`, `charts.css`  
**JS:** `auth-guard.js`, `progress.js`  
**API:** GET `/api/progress?period=weekly`  
**Library:** Chart.js

**Layout:**
```
Period: [Weekly ▾] [Monthly] [3 Months]

┌─ Weight Trend (Line) ──────────────────┐
│  82 ╮                                   │
│  81  ╰─╮                               │
│  80     ╰──────────────                │
│  Mar 24  Mar 28  Apr 1                 │
└────────────────────────────────────────┘

┌─ Calorie Tracking (Bar) ───────────────┐
│  █ Consumed  ░ Burned                  │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun     │
└────────────────────────────────────────┘

┌─ Workout Frequency (Doughnut) ─────────┐
│  Cardio 40% | Strength 35% | Rest 25% │
└────────────────────────────────────────┘

BMI Trend:  26.5 → 26.1 → 25.8  (↓ improving)

[📥 Export Health Report PDF]
```

---

## 5.10 `trainers.html` — Local Trainer Connect

**CSS:** `main.css`, `dashboard.css`, `components.css`  
**JS:** `auth-guard.js`, `trainers.js`  
**API:** GET `/api/trainers?location=`

**Layout:**
```
[📍 Enter your city/area ___________] [Search]
Filter: [All] [Weight Loss] [Muscle] [Yoga] [HIIT]

┌─ Trainer Card ─────────────────────────────────────────┐
│ 🧑 Rahul Sharma                    ⭐ 4.8              │
│ Weight Loss · HIIT · Andheri, Mumbai                  │
│ 📧 rahul@fitpro.com  📞 +91-9876543210                │
│ [📩 Send Email]   [📞 Call]   [📋 View Profile]       │
└────────────────────────────────────────────────────────┘
```

---

## 5.11 `doctors.html` — Doctor Help

**CSS:** `main.css`, `dashboard.css`, `components.css`  
**JS:** `auth-guard.js`, `doctors.js`  
**API:** GET `/api/doctors?specialization=`

**Layout:**
```
Specialization: [Dietitian ▾] [Sports Medicine] [Cardiologist] [General]

┌─ Doctor Card ──────────────────────────────────────────┐
│ 👩‍⚕️ Dr. Priya Mehta              ⭐ 4.9               │
│ Dietitian & Nutritionist                               │
│ 🏥 Apollo Wellness Center                              │
│ 🕐 Mon 10am-1pm · Wed 3pm-6pm                         │
│ [📩 Contact]   [📅 Book Slot]                          │
└────────────────────────────────────────────────────────┘
```

---

## 5.12 `ai-planner.html` — AI Voice Diet Planner

**CSS:** `main.css`, `dashboard.css`, `components.css`  
**JS:** `auth-guard.js`, `ai-planner.js`  
**API:** POST `/api/ai/diet-chat`

**Layout:**
```
┌─ AI Diet Assistant ─────────────────────────────────────┐
│                                        🔊 Voice: [ON]  │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🤖 Hi! I'm your AI diet assistant. Ask me         │ │
│  │    anything about food, calories, or your plan!   │ │
│  │                                                   │ │
│  │                     👤 What should I eat for      │ │
│  │                         breakfast to lose weight? │ │
│  │                                                   │ │
│  │ 🤖 Try oats with berries and a boiled egg.        │ │
│  │    Around 350 kcal with great protein...          │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Type your question...              ] [🎤] [➤ Send]   │
└─────────────────────────────────────────────────────────┘
```

---

## 5.13 `reminders.html` — Reminders + Alarms

**CSS:** `main.css`, `dashboard.css`, `forms.css`  
**JS:** `auth-guard.js`, `reminders.js`  
**API:** GET/POST/DELETE `/api/reminders`

**Layout:**
```
[+ Add New Reminder]

Type:    [Workout ▾] [Meal] [Water] [Sleep] [Custom]
Message: [______________________________________________]
Time:    [18:00]   Repeat Daily: [✓]
[SAVE REMINDER]

─── Active Reminders ──────────────────────────────────────
🏋️ Workout Reminder       6:00 PM daily   🔔 [ON]  [🗑]
💧 Drink Water             Every 2 hrs     🔔 [ON]  [🗑]
🌙 Sleep Time              10:30 PM daily  🔔 [OFF] [🗑]
```

---

# 6. API CONTRACT (FRONTEND SIDE)

All requests from frontend to backend:

| Method | Endpoint | Auth? | JS Call | Used On Page |
|---|---|---|---|---|
| POST | /register | No | authAPI.register() | register.html |
| POST | /login | No | authAPI.login() | index.html |
| POST | /logout | Yes | authAPI.logout() | All pages |
| GET | /profile | Yes | profileAPI.get() | profile.html |
| POST | /profile | Yes | profileAPI.save() | profile.html |
| GET | /dashboard | Yes | dashboardAPI.get() | dashboard.html |
| GET | /recommendations | Yes | recommendAPI.get() | recommendations.html |
| POST | /activity | Yes | activityAPI.log() | tracker.html |
| GET | /activity?date= | Yes | activityAPI.getDay() | tracker.html |
| GET | /food/search?q= | Yes | foodAPI.search() | food-scanner.html |
| POST | /food/scan | Yes | foodAPI.barcode() | food-scanner.html |
| GET | /workout/plan | Yes | workoutAPI.getPlan() | workout.html |
| POST | /workout/plan | Yes | workoutAPI.savePlan() | workout.html |
| POST | /workout/timer | Yes | workoutAPI.logTimer() | workout.html |
| GET | /trainers?location= | Yes | trainerAPI.list() | trainers.html |
| GET | /doctors?specialization= | Yes | doctorAPI.list() | doctors.html |
| POST | /ai/diet-chat | Yes | aiAPI.chat() | ai-planner.html |
| GET | /reminders | Yes | reminderAPI.list() | reminders.html |
| POST | /reminders | Yes | reminderAPI.add() | reminders.html |
| DELETE | /reminders/:id | Yes | reminderAPI.delete() | reminders.html |
| GET | /progress?period= | Yes | progressAPI.get() | progress.html |
| GET | /export/pdf | Yes | exportAPI.pdf() | progress.html |

### Expected Headers (Every Protected Request)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

### Global Error Codes
| HTTP Code | Meaning | Frontend Action |
|---|---|---|
| 200 | OK | Use data |
| 201 | Created | Show success toast |
| 400 | Bad Request | Show field errors |
| 401 | Unauthorized | Clear storage, redirect /index.html |
| 404 | Not Found | Show "not found" state |
| 500 | Server Error | Show "something went wrong" toast |

---

# 7. COMPONENT PATTERNS

## Card
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">BMI</h3>
    <span class="badge badge-warning">Overweight</span>
  </div>
  <div class="card-body">
    <p class="stat-large">26.1</p>
  </div>
</div>
```

## Button Variants
```html
<button class="btn btn-primary">Save</button>
<button class="btn btn-ghost">Cancel</button>
<button class="btn btn-danger">Delete</button>
<button class="btn btn-icon"><svg>...</svg></button>
```

## Progress Bar
```html
<div class="progress-wrap">
  <div class="progress-bar" style="width: 71%;"></div>
</div>
<p class="progress-label">1,450 / 2,033 kcal</p>
```

## Skeleton Loader (while fetching)
```html
<div class="skeleton skeleton-card"></div>
```
```css
.skeleton {
  background: linear-gradient(90deg, var(--bg-alt) 25%, var(--border) 50%, var(--bg-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--radius);
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

---

# 8. VOICE & TIMER FEATURES

## Voice Input (ai-planner.js)
```javascript
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRec) {
  document.getElementById('mic-btn').disabled = true;
  showToast('Voice not supported in this browser', 'warning');
} else {
  const recognition = new SpeechRec();
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  document.getElementById('mic-btn').addEventListener('click', () => {
    recognition.start();
    setMicActive(true);
  });

  recognition.onresult = async (event) => {
    setMicActive(false);
    const text = event.results[0][0].transcript;
    appendUserMessage(text);
    await sendToAI(text);
  };

  recognition.onerror = () => {
    setMicActive(false);
    showToast('Could not capture voice', 'error');
  };
}

async function sendToAI(message) {
  showTypingIndicator();
  try {
    const res = await aiAPI.chat({ message, voice_input: true });
    hideTypingIndicator();
    appendBotMessage(res.reply);
    if (voiceOutputEnabled) speak(res.reply);
  } catch (err) {
    hideTypingIndicator();
    showToast(err.message, 'error');
  }
}

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.0;
  utter.lang = 'en-US';
  speechSynthesis.speak(utter);
}
```

## Daily Reminder Scheduler (reminders.js)
```javascript
// Request notification permission on page load
async function requestNotificationPermission() {
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// Check reminders every minute (client-side fallback)
function startReminderPolling(reminders) {
  setInterval(() => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    reminders.forEach(r => {
      if (r.is_active && r.remind_at.slice(0,5) === hhmm) {
        fireReminder(r);
      }
    });
  }, 60000); // every 60 seconds
}

function fireReminder(reminder) {
  new Notification(`⏰ ${reminder.reminder_type.toUpperCase()}`, {
    body: reminder.message,
    icon: '/assets/icons/bell.png'
  });
  speak(reminder.message);
}
```

---

# 9. CHARTS (Chart.js)

## CDN Include (in every chart page)
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

## Weekly Calorie Bar Chart
```javascript
function renderWeeklyChart(data) {
  const ctx = document.getElementById('weekly-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Calories In',
          data: data.calories_in,
          backgroundColor: CONFIG.CHART_COLORS.primary,
          borderRadius: 6
        },
        {
          label: 'Calories Burned',
          data: data.calories_out,
          backgroundColor: CONFIG.CHART_COLORS.danger,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}
```

## Calorie Donut Ring
```javascript
function renderCalorieRing(consumed, goal) {
  const remaining = Math.max(goal - consumed, 0);
  new Chart(document.getElementById('calorie-ring'), {
    type: 'doughnut',
    data: {
      labels: ['Consumed', 'Remaining'],
      datasets: [{ data: [consumed, remaining], backgroundColor: ['#00d4aa','#2a2a45'], borderWidth: 0 }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false } }
    }
  });
}
```

## Weight Trend Line Chart
```javascript
function renderWeightChart(history) {
  new Chart(document.getElementById('weight-chart'), {
    type: 'line',
    data: {
      labels: history.map(h => h.date),
      datasets: [{
        label: 'Weight (kg)',
        data: history.map(h => h.weight_kg),
        borderColor: CONFIG.CHART_COLORS.primary,
        backgroundColor: 'rgba(0,212,170,0.08)',
        tension: 0.4,
        pointRadius: 5,
        fill: true
      }]
    },
    options: { responsive: true, scales: { y: { min: 0 } } }
  });
}
```

---

# 10. DARK MODE

```javascript
// js/dark-mode.js
const THEME_KEY = 'fitness_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Apply saved theme immediately (before page paint)
applyTheme(localStorage.getItem(THEME_KEY) || 'light');

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
});
```

---

# 11. PDF EXPORT

```javascript
// js/pdf-export.js — Two options:

// Option A: Client-side with jsPDF + html2canvas
// CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js">
// CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js">

async function exportClientPDF() {
  const { jsPDF } = window.jspdf;
  const element   = document.getElementById('report-section');
  const canvas    = await html2canvas(element, { scale: 2 });
  const imgData   = canvas.toDataURL('image/png');
  const pdf       = new jsPDF('p', 'mm', 'a4');
  const w         = pdf.internal.pageSize.getWidth();
  const h         = (canvas.height * w) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, w, h);
  pdf.save(`health-report-${todayDate()}.pdf`);
}

// Option B: Request backend PDF (better formatting)
async function exportServerPDF() {
  const response = await exportAPI.pdf();
  const blob     = await response.blob();
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = `health-report-${todayDate()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

# 12. NOTIFICATIONS & REMINDERS

## Notification Permission Request
```javascript
// Call once on first login
async function setupNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('Reminders enabled!', 'success');
    }
  }
}
```

## Push Notification (Browser)
```javascript
function notify(title, body) {
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/assets/icons/logo.png' });
}

// Examples:
notify('💧 Hydration Reminder', 'Time to drink water!');
notify('🏋️ Workout Time!', 'Your evening workout starts now.');
```

---

# 13. AUTH GUARD

Every protected `.html` page must include at the very top of `<body>`:
```html
<!-- Redirect to login if no token -->
<script src="/js/config.js"></script>
<script src="/js/auth-guard.js"></script>
```

On logout (sidebar logout button):
```javascript
async function handleLogout() {
  try { await authAPI.logout(); } catch (_) {}
  localStorage.clear();
  window.location.href = '/index.html';
}
```

---

# 14. ERROR HANDLING & UX

## Loading States
```javascript
function setLoading(buttonId, loading) {
  const btn = document.getElementById(buttonId);
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Loading...'
    : btn.dataset.originalText;
}
```

## Empty States
```javascript
function showEmptyState(containerId, message) {
  document.getElementById(containerId).innerHTML = `
    <div class="empty-state">
      <svg><!-- empty box icon --></svg>
      <p>${message}</p>
    </div>
  `;
}
// Example: showEmptyState('trainer-list', 'No trainers found in your area.')
```

## Form Validation Pattern
```javascript
function validateForm(fields) {
  let valid = true;
  fields.forEach(({ id, rule, message }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(`${id}-error`);
    if (!rule(el.value)) {
      err.textContent = message;
      err.style.display = 'block';
      el.classList.add('input-error');
      valid = false;
    } else {
      err.style.display = 'none';
      el.classList.remove('input-error');
    }
  });
  return valid;
}
```

---

# 15. RESPONSIVE DESIGN RULES

| Breakpoint | Behavior |
|---|---|
| > 1024px | Full sidebar visible, 3-column dashboard |
| 768–1024px | Sidebar collapsed to icons only |
| < 768px | Hamburger menu, sidebar as drawer overlay |
| < 480px | Single column, full-width cards |

```css
/* Hamburger (mobile) */
.hamburger { display: none; }
@media (max-width: 768px) {
  .hamburger { display: flex; }
  .sidebar-labels { display: none; }
}
@media (max-width: 480px) {
  .page-content { padding: 16px; }
  .card-grid { grid-template-columns: 1fr; }
}
```

---

# 16. BUILD & DEPLOY

## Local Dev
```bash
cd fitness-frontend
python -m http.server 3000
# OR: use VS Code Live Server extension
# Open http://localhost:3000
```

## Change Backend URL
```javascript
// js/config.js — change this ONE line for production:
API_BASE: 'https://api.yourapp.com/api'
```

## Static Hosting (Production)
- **Netlify:** Drag & drop `fitness-frontend/` folder
- **GitHub Pages:** Push to `gh-pages` branch
- **Vercel:** `vercel deploy`
- **Nginx:** Copy to `/var/www/html/`

## .gitignore
```
# No build artifacts needed for vanilla JS
.DS_Store
*.env
node_modules/
```

---

*Frontend Plan v1.0 — fitness-frontend repo*  
*13 Pages · 15 JS Modules · 7 CSS Files · Zero build tools required*
