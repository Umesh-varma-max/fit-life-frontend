// ──────────────────────────────────────────────────
// config.js — App Configuration & Constants
// ──────────────────────────────────────────────────

const CONFIG = {
  // ─── API ───
  API_BASE: (
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? 'http://localhost:5000/api'
      : 'https://fitlife-backend-rrd9.onrender.com/api'
  ),

  // ─── Storage Keys ───
  TOKEN_KEY:  'access_token',
  USER_KEY:   'user',
  THEME_KEY:  'fitness_theme',

  // ─── Goals ───
  WATER_GOAL_ML:  3000,
  SLEEP_GOAL_HRS: 8,

  // ─── Chart Colors ───
  CHART_COLORS: {
    primary:   '#00d4aa',
    secondary: '#00b4d8',
    danger:    '#ff6b6b',
    warning:   '#ffd93d',
    success:   '#6bcb77',
    muted:     '#a0a0b0',
    purple:    '#7c5cfc',
    gradient:  ['#00d4aa', '#00b4d8'],
  },

  // ─── Enums (must match backend) ───
  ENUMS: {
    gender:         ['male', 'female', 'other'],
    activity_level: ['sedentary', 'light', 'moderate', 'active'],
    food_habits:    ['veg', 'non-veg', 'vegan', 'keto', 'paleo'],
    fitness_goal:   ['weight_loss', 'muscle_gain', 'maintenance'],
    log_type:       ['meal', 'workout', 'water', 'sleep'],
    reminder_type:  ['workout', 'meal', 'water', 'sleep', 'custom'],
    day_of_week:    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    period:         ['weekly', 'monthly'],
  }
};
