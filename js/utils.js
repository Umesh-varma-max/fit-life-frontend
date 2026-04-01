// ──────────────────────────────────────────────────
// utils.js — Shared Helpers, Validators, Formatters
// ──────────────────────────────────────────────────

// ─── Date Helpers ────────────────────────────────
function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function getDayName() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Validators ──────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8)           score++;
  if (/[A-Z]/.test(pwd))        score++;
  if (/[0-9]/.test(pwd))        score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ['Weak', 'Fair', 'Strong', 'Very Strong'];
  return {
    score,
    label: labels[score - 1] || 'Weak',
    class: ['weak', 'fair', 'strong', 'vstrong'][score - 1] || 'weak',
  };
}

// ─── BMI Helpers ─────────────────────────────────
function calculateBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const h = heightCm / 100;
  return (weightKg / (h * h)).toFixed(1);
}

function getBMICategory(bmi) {
  bmi = parseFloat(bmi);
  if (bmi < 18.5) return { label: 'Underweight', class: 'info',    icon: '📉' };
  if (bmi < 25)   return { label: 'Normal',      class: 'success', icon: '✅' };
  if (bmi < 30)   return { label: 'Overweight',   class: 'warning', icon: '⚠️' };
  return               { label: 'Obese',        class: 'danger',  icon: '🚨' };
}

// ─── Number Formatters ───────────────────────────
function formatNumber(n) {
  return n.toLocaleString('en-IN');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function percentage(value, total) {
  if (!total) return 0;
  return Math.min(Math.round((value / total) * 100), 100);
}

// ─── DOM Helpers ─────────────────────────────────
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-white"></span> Loading...';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
  }
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}-error`);
  if (field) field.classList.add('input-error');
  if (error) {
    error.textContent = message;
    error.classList.add('visible');
  }
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}-error`);
  if (field) field.classList.remove('input-error');
  if (error) error.classList.remove('visible');
}

function clearAllErrors(formEl) {
  formEl.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  formEl.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
}

function showEmptyState(containerId, icon, title, text) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <p class="empty-state-text">${text}</p>
    </div>
  `;
}

// ─── Debounce ────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Capitalize ──────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatEnumLabel(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function readStorageJson(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function stripJsonFences(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function safeParseJson(text, fallback = null) {
  try {
    return JSON.parse(stripJsonFences(text));
  } catch {
    return fallback;
  }
}

function getSelectedGoal() {
  return localStorage.getItem(CONFIG.SELECTED_GOAL_KEY) || 'Fit';
}

function setSelectedGoal(goal) {
  localStorage.setItem(CONFIG.SELECTED_GOAL_KEY, goal);
}

function getEditablePrompt(defaultPrompt) {
  return localStorage.getItem(CONFIG.EDITABLE_PROMPT_KEY) || defaultPrompt;
}

function setEditablePrompt(prompt) {
  localStorage.setItem(CONFIG.EDITABLE_PROMPT_KEY, prompt);
}
