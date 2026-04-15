// api.js - Central HTTP client

function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenValid(token = getToken()) {
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (!payload.exp) return true;

  return (payload.exp * 1000) > Date.now();
}

function hasStoredSession() {
  const token = getToken();
  const user = getUser();

  if (!token || !user) return false;
  if (!isTokenValid(token)) {
    clearStoredSession();
    return false;
  }

  return true;
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

function getCachedDashboard() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.DASHBOARD_CACHE_KEY));
  } catch {
    return null;
  }
}

function getCachedRecommendations() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.RECOMMENDATIONS_CACHE_KEY));
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

function setTimedCache(key, data) {
  if (!data) return;
  localStorage.setItem(key, JSON.stringify({
    saved_at: Date.now(),
    data
  }));
}

function readTimedCache(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    if (!cached || typeof cached !== 'object') return null;
    return cached;
  } catch {
    return null;
  }
}

function isTimedCacheFresh(cached) {
  if (!cached?.saved_at) return false;
  return Date.now() - cached.saved_at <= CONFIG.API_CACHE_TTL_MS;
}

function clearStoredSession() {
  [
    CONFIG.TOKEN_KEY,
    CONFIG.USER_KEY,
    CONFIG.PROFILE_CACHE_KEY,
    CONFIG.AI_CHAT_HISTORY_KEY,
    CONFIG.WORKOUT_PLAN_CACHE_KEY,
    CONFIG.DASHBOARD_CACHE_KEY,
    CONFIG.RECOMMENDATIONS_CACHE_KEY
  ].forEach((key) => localStorage.removeItem(key));

  authorizedImageCache.forEach((objectUrl) => {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch (_) {
      // Ignore stale object URL cleanup errors.
    }
  });
  authorizedImageCache.clear();
}

const authorizedImageCache = new Map();

function getApiOrigin() {
  try {
    return new URL(CONFIG.API_BASE).origin;
  } catch {
    return window.location.origin;
  }
}

function resolveApiAssetUrl(url) {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  try {
    return new URL(url, getApiOrigin()).toString();
  } catch {
    return url;
  }
}

async function fetchAuthorizedImageObjectUrl(url) {
  const resolvedUrl = resolveApiAssetUrl(url);
  if (!resolvedUrl) return '';
  if (authorizedImageCache.has(resolvedUrl)) {
    return authorizedImageCache.get(resolvedUrl);
  }

  const response = await fetch(resolvedUrl, {
    headers: {
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    }
  });

  if (!response.ok) {
    const error = new Error(`Failed to load image (${response.status})`);
    error.status = response.status;
    throw error;
  }

  const imageBlob = await response.blob();
  const objectUrl = URL.createObjectURL(imageBlob);
  authorizedImageCache.set(resolvedUrl, objectUrl);
  return objectUrl;
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
  } catch (networkError) {
    console.error('[API][NETWORK]', endpoint, networkError);
    const error = new Error('Network error - check your connection');
    error.status = 0;
    error.payload = null;
    throw error;
  }

  if (response.status === 401) {
    clearStoredSession();
    window.location.replace('index.html');
    return;
  }

  const data = await parseApiResponse(response);

  console.info('[API]', endpoint, { status: response.status, body: data });

  if (!response.ok) {
    console.error('[API][ERROR]', endpoint, { status: response.status, body: data });
    const error = new Error(resolveApiErrorMessage(response.status, data));
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
  } catch (networkError) {
    console.error('[API][NETWORK]', endpoint, networkError);
    const error = new Error('Network error - check your connection');
    error.status = 0;
    error.payload = null;
    throw error;
  }

  if (response.status === 401) {
    clearStoredSession();
    window.location.replace('index.html');
    return;
  }

  const data = await parseApiResponse(response);

  console.info('[API]', endpoint, { status: response.status, body: data });

  if (!response.ok) {
    console.error('[API][ERROR]', endpoint, { status: response.status, body: data });
    const error = new Error(resolveApiErrorMessage(response.status, data));
    error.status = response.status;
    error.errors = data.errors || null;
    error.payload = data;
    throw error;
  }

  return data;
}

function resolveApiErrorMessage(status, data) {
  const baseMessage = data?.message || data?.error || '';
  if (baseMessage) return baseMessage;
  if (status === 401) return 'Unauthorized - please sign in again';
  if (status === 404) return 'Requested resource was not found';
  if (status >= 500) return 'Server error - please try again shortly';
  return 'Request failed';
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
    cacheProfile({
      ...body,
      bmi: data.bmi,
      body_fat_percentage: data.body_fat_percentage,
      body_fat_category: data.body_fat_category,
      daily_calories: data.daily_calories,
      goal_label: data.goal_label,
      activity_label: data.activity_label
    });
    try {
      const workoutPlan = await apiFetch('/workout/plan');
      cacheWorkoutPlan(workoutPlan);
      data.workout_plan = workoutPlan;
    } catch (workoutError) {
      console.error('Failed to refresh workout plan after profile save:', workoutError);
    }
    return data;
  }
};

const dashboardAPI = {
  get: async () => {
    const data = await apiFetch('/dashboard');
    setTimedCache(CONFIG.DASHBOARD_CACHE_KEY, data);
    return data;
  }
};

const recommendAPI = {
  get: async () => {
    const data = await apiFetch('/recommendations');
    setTimedCache(CONFIG.RECOMMENDATIONS_CACHE_KEY, data);
    return data;
  }
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
  getActiveSession: () => apiFetch('/workout/session/active'),
  completeSet: (id, body) => apiFetch(`/workout/session/${id}/set-complete`, { method: 'POST', body: JSON.stringify(body) }),
  completeExercise: (id, body) => apiFetch(`/workout/session/${id}/exercise-complete`, { method: 'POST', body: JSON.stringify(body) }),
  completeSession: (id, body) => apiFetch(`/workout/session/${id}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  resetSession: (id) => apiFetch(`/workout/session/${id}/reset`, { method: 'POST' })
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
