// api.js - Central HTTP client

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

function getCachedProfile() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.PROFILE_CACHE_KEY));
  } catch {
    return null;
  }
}

function getCachedWorkoutPlan() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.WORKOUT_PLAN_CACHE_KEY));
  } catch {
    return null;
  }
}

function cacheProfile(profile) {
  if (!profile) return;
  localStorage.setItem(CONFIG.PROFILE_CACHE_KEY, JSON.stringify(profile));
}

function cacheWorkoutPlan(plan) {
  if (!plan) return;
  localStorage.setItem(CONFIG.WORKOUT_PLAN_CACHE_KEY, JSON.stringify(plan));
}

function clearStoredSession() {
  [
    CONFIG.TOKEN_KEY,
    CONFIG.USER_KEY,
    CONFIG.PROFILE_CACHE_KEY,
    CONFIG.AI_CHAT_HISTORY_KEY,
    CONFIG.WORKOUT_PLAN_CACHE_KEY
  ].forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem('fitlife_last_app_page');
}

function getLastAppPage() {
  return sessionStorage.getItem('fitlife_last_app_page') || '';
}

function setLastAppPage(path = '') {
  const value = String(path || '').trim();
  if (!value) return;
  sessionStorage.setItem('fitlife_last_app_page', value);
}

function getPostLoginDestination(fallback = 'dashboard.html') {
  const candidate = getLastAppPage();
  if (candidate && !/index\.html|register\.html/i.test(candidate)) {
    return candidate;
  }
  return fallback;
}

function hasStoredSession() {
  return Boolean(getToken());
}

async function parseApiResponse(response) {
  if (response.status === 204) {
    return {};
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
  };

  let response;
  try {
    response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });
  } catch {
    throw new Error('Network error - check your connection');
  }

  if (response.status === 401) {
    clearStoredSession();
    window.location.replace('index.html?login=1');
    return;
  }

  const data = await parseApiResponse(response);

  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Request failed');
    error.status = response.status;
    error.errors = data.errors || null;
    error.payload = data;
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
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error('Network error - check your connection');
  }

  if (response.status === 401) {
    clearStoredSession();
    window.location.replace('index.html?login=1');
    return;
  }

  const data = await parseApiResponse(response);

  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Request failed');
    error.status = response.status;
    error.errors = data.errors || null;
    error.payload = data;
    throw error;
  }

  return data;
}

const authAPI = {
  register: (body) => apiFetch('/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => apiFetch('/logout', { method: 'POST' })
};

const profileAPI = {
  get: async () => {
    const data = await apiFetch('/profile');
    if (data.profile) cacheProfile(data.profile);
    return data;
  },
  save: async (body) => {
    const data = await apiFetch('/profile', { method: 'POST', body: JSON.stringify(body) });
    const cachedProfile = {
      ...body,
      bmi: data.bmi,
      body_fat_percentage: data.body_fat_percentage,
      body_fat_category: data.body_fat_category,
      bfp_case: data.body_fat_category,
      daily_calories: data.daily_calories,
      goal_label: data.goal_label,
      activity_label: data.activity_label
    };
    cacheProfile(cachedProfile);
    return data;
  }
};

const dashboardAPI = {
  get: () => apiFetch('/dashboard')
};

const recommendAPI = {
  get: () => apiFetch('/recommendations')
};

const activityAPI = {
  log: (body) => apiFetch('/activity', { method: 'POST', body: JSON.stringify(body) }),
  getDay: (date) => apiFetch(`/activity?date=${date}`)
};

const foodAPI = {
  search: (query) => apiFetch(`/food/search?q=${encodeURIComponent(query)}`),
  barcode: (body) => apiFetch('/food/scan', { method: 'POST', body: JSON.stringify(body) }),
  analyzePhoto: (formData) => apiFetchForm('/food/analyze-photo', formData)
};

const workoutAPI = {
  getPlan: async () => {
    const data = await apiFetch('/workout/plan');
    cacheWorkoutPlan(data);
    return data;
  },
  savePlan: (body) => apiFetch('/workout/plan', { method: 'POST', body: JSON.stringify(body) }),
  logTimer: (body) => apiFetch('/workout/timer', { method: 'POST', body: JSON.stringify(body) }),
  startSession: (body = {}) => apiFetch('/workout/session/start', { method: 'POST', body: JSON.stringify(body) }),
  getActiveSession: async () => {
    try {
      return await apiFetch('/workout/session/active');
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  },
  completeExercise: (sessionId, body) => apiFetch(`/workout/session/${sessionId}/exercise-complete`, { method: 'POST', body: JSON.stringify(body) }),
  completeSession: (sessionId, body) => apiFetch(`/workout/session/${sessionId}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  resetSession: (sessionId) => apiFetch(`/workout/session/${sessionId}/reset`, { method: 'POST', body: JSON.stringify({}) })
};

const trainerAPI = {
  list: (location) => apiFetch(`/trainers?location=${encodeURIComponent(location || '')}`)
};

const doctorAPI = {
  list: (specialization) => apiFetch(`/doctors?specialization=${encodeURIComponent(specialization || '')}`)
};

const aiAPI = {
  chat: (body) => apiFetch('/ai/diet-chat', { method: 'POST', body: JSON.stringify(body) })
};

const reminderAPI = {
  list: () => apiFetch('/reminders'),
  add: (body) => apiFetch('/reminders', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/reminders/${id}`, { method: 'DELETE' })
};

const progressAPI = {
  get: (period) => apiFetch(`/progress?period=${period}`)
};

const exportAPI = {
  pdf: () => fetch(`${CONFIG.API_BASE}/export/pdf`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
};
