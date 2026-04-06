// ──────────────────────────────────────────────────
// api.js — Central HTTP Client (All API calls)
// ──────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.USER_KEY));
  } catch {
    return null;
  }
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}),
  };

  let response;
  try {
    response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
  } catch (err) {
    throw new Error('Network error — check your connection');
  }

  // Auto-redirect on expired/invalid token
  if (response.status === 401) {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    window.location.href = 'index.html';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    error.errors = data.errors || null;
    throw error;
  }

  return data;
}

async function apiFetchForm(endpoint, formData, options = {}) {
  let response;
  try {
    response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
      method: options.method || 'POST',
      body: formData,
      headers: {
        ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    throw new Error('Network error - check your connection');
  }

  if (response.status === 401) {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    window.location.href = 'index.html';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    error.errors = data.errors || null;
    throw error;
  }

  return data;
}

// ─── AUTH ─────────────────────────────────────────
const authAPI = {
  register: (body) => apiFetch('/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => apiFetch('/login',    { method: 'POST', body: JSON.stringify(body) }),
  logout:   ()     => apiFetch('/logout',   { method: 'POST' }),
};

// ─── PROFILE ─────────────────────────────────────
const profileAPI = {
  get:  ()     => apiFetch('/profile'),
  save: (body) => apiFetch('/profile', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── DASHBOARD ───────────────────────────────────
const dashboardAPI = {
  get: () => apiFetch('/dashboard'),
};

// ─── RECOMMENDATIONS ─────────────────────────────
const recommendAPI = {
  get: () => apiFetch('/recommendations'),
};

// ─── ACTIVITY ────────────────────────────────────
const activityAPI = {
  log:    (body) => apiFetch('/activity', { method: 'POST', body: JSON.stringify(body) }),
  getDay: (date) => apiFetch(`/activity?date=${date}`),
};

// ─── FOOD ────────────────────────────────────────
const foodAPI = {
  search:  (q)    => apiFetch(`/food/search?q=${encodeURIComponent(q)}`),
  barcode: (body) => apiFetch('/food/scan', { method: 'POST', body: JSON.stringify(body) }),
  analyzePhoto: (formData) => apiFetchForm('/food/analyze-photo', formData),
};

// ─── WORKOUT ─────────────────────────────────────
const workoutAPI = {
  getPlan:  ()     => apiFetch('/workout/plan'),
  savePlan: (body) => apiFetch('/workout/plan', { method: 'POST', body: JSON.stringify(body) }),
  logTimer: (body) => apiFetch('/workout/timer', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── TRAINERS ────────────────────────────────────
const trainerAPI = {
  list: (location) => apiFetch(`/trainers?location=${encodeURIComponent(location || '')}`),
};

// ─── DOCTORS ─────────────────────────────────────
const doctorAPI = {
  list: (spec) => apiFetch(`/doctors?specialization=${encodeURIComponent(spec || '')}`),
};

// ─── AI PLANNER ──────────────────────────────────
const aiAPI = {
  chat: (body) => apiFetch('/ai/diet-chat', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── REMINDERS ───────────────────────────────────
const reminderAPI = {
  list:   ()     => apiFetch('/reminders'),
  add:    (body) => apiFetch('/reminders', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id)   => apiFetch(`/reminders/${id}`, { method: 'DELETE' }),
};

// ─── PROGRESS ────────────────────────────────────
const progressAPI = {
  get: (period) => apiFetch(`/progress?period=${period}`),
};

// ─── EXPORT ──────────────────────────────────────
const exportAPI = {
  pdf: () => fetch(`${CONFIG.API_BASE}/export/pdf`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  }),
};
