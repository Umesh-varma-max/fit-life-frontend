# 📋 Frontend–Backend API Contract
## AI-Based Healthy Diet & Fitness Management System

> **From:** Backend Team  
> **To:** Frontend Team  
> **Date:** March 31, 2026  
> **Version:** 1.0  

---

Hi Frontend Team! 👋

Below is the **complete API contract** for our Fitness Management System. This document defines every endpoint, request/response schema, authentication flow, and error format so we both build to the same spec. Please review and flag any concerns before we start implementation.

---

## 🔧 General Rules

| Item | Value |
|---|---|
| **Base URL (Dev)** | `http://localhost:5000/api` |
| **Content-Type** | `application/json` (all requests & responses) |
| **Auth Header** | `Authorization: Bearer <JWT_TOKEN>` |
| **JWT Storage** | `localStorage.setItem('access_token', token)` |
| **Token Expiry** | 24 hours (dev) / 12 hours (prod) |
| **CORS Allowed Origin** | `http://localhost:3000` (dev) |

### Standard Response Envelope

**Every** response follows this format:

```json
// ✅ Success
{
  "status": "success",
  "<data_key>": { ... }
}

// ❌ Error
{
  "status": "error",
  "message": "Human-readable error message",
  "errors": { "field_name": ["Validation error detail"] }  // only on 400
}
```

### HTTP Status Codes Used

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created (register, log activity) |
| `400` | Validation error / Bad request |
| `401` | Unauthorized (invalid/expired JWT) |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

### Auto-Redirect Rule
If any API call returns `401`, the frontend should:
1. Clear `localStorage` (remove token + user data)
2. Redirect to login page

---

## 🔐 1. AUTH ENDPOINTS (No JWT Required)

### `POST /api/register`
Creates a new user account.

**Rate Limit:** 10 requests/hour

**Request:**
```json
{
  "full_name": "John Doe",          // string, 2-100 chars, REQUIRED
  "email": "john@example.com",      // valid email, REQUIRED
  "password": "SecurePass123!"      // string, 6-128 chars, must have 1 letter + 1 number, REQUIRED
}
```

**Success (201):**
```json
{
  "status": "success",
  "message": "User registered",
  "user_id": 1
}
```

**Error (400):**
```json
{
  "status": "error",
  "message": "Email already registered"
}
```

**Validation Error (400):**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "password": ["Password must contain at least one letter and one number"],
    "email": ["Not a valid email address."]
  }
}
```

---

### `POST /api/login`
Authenticate and receive JWT token.

**Rate Limit:** 20 requests/hour

**Request:**
```json
{
  "email": "john@example.com",      // valid email, REQUIRED
  "password": "SecurePass123!"      // string, REQUIRED
}
```

**Success (200):**
```json
{
  "status": "success",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "created_at": "2026-03-31T10:00:00"
  }
}
```

**Error (401):**
```json
{
  "status": "error",
  "message": "Invalid credentials"
}
```

---

### `POST /api/logout`
Client-side only. Backend acknowledges.

**Success (200):**
```json
{
  "status": "success",
  "message": "Logged out"
}
```

> **Frontend Action:** Remove `access_token` and `user` from localStorage, redirect to login.

---

## 👤 2. PROFILE ENDPOINTS (JWT Required)

### `GET /api/profile`
Get the authenticated user's health profile.

**Success (200):**
```json
{
  "status": "success",
  "profile": {
    "id": 1,
    "user_id": 1,
    "age": 25,
    "gender": "male",
    "height_cm": 175.0,
    "weight_kg": 80.0,
    "activity_level": "moderate",
    "sleep_hours": 7.5,
    "food_habits": "non-veg",
    "fitness_goal": "weight_loss",
    "bmi": 26.12,
    "bmr": 1876.5,
    "daily_calories": 2533
  }
}
```

**Error (404):** Profile not created yet
```json
{
  "status": "error",
  "message": "Profile not found"
}
```

---

### `POST /api/profile`
Create or update the health profile. Backend auto-calculates BMI, BMR, TDEE, and daily calorie target.

**Request:**
```json
{
  "age": 25,                        // int, 10-120, REQUIRED
  "gender": "male",                 // "male" | "female" | "other", REQUIRED
  "height_cm": 175.0,               // float, 50-280, REQUIRED
  "weight_kg": 80.0,                // float, 10-500, REQUIRED
  "activity_level": "moderate",     // "sedentary" | "light" | "moderate" | "active", REQUIRED
  "sleep_hours": 7.5,               // float, 0-24, OPTIONAL (default: 7.0)
  "food_habits": "non-veg",         // "veg" | "non-veg" | "vegan" | "keto" | "paleo", OPTIONAL (default: "non-veg")
  "fitness_goal": "weight_loss"     // "weight_loss" | "muscle_gain" | "maintenance", REQUIRED
}
```

**Success (200):**
```json
{
  "status": "success",
  "message": "Profile saved",
  "bmi": 26.12,
  "bmr": 1876.5,
  "daily_calories": 2533
}
```

> **Note:** Saving profile auto-regenerates the user's recommendations.

---

## 🍽️ 3. RECOMMENDATION ENDPOINT (JWT Required)

### `GET /api/recommendations`
Get AI-generated diet + workout recommendations based on user's profile.

**Success (200):**
```json
{
  "status": "success",
  "recommendations": {
    "bmi_category": "Overweight",
    "daily_calories": 2033,
    "diet_plan": {
      "breakfast": { "meal": "Oats with banana + green tea", "kcal": 380 },
      "lunch":     { "meal": "Grilled chicken salad + whole wheat roti", "kcal": 550 },
      "snack":     { "meal": "Mixed nuts + apple", "kcal": 180 },
      "dinner":    { "meal": "Steamed fish + stir-fried vegetables", "kcal": 450 }
    },
    "workout_plan": {
      "Mon": [
        { "name": "Brisk Walk / Jog", "duration_min": 30, "sets": 0, "reps": 0 },
        { "name": "Core Crunches", "duration_min": 0, "sets": 3, "reps": 20 }
      ],
      "Tue": [ ... ],
      "Wed": [ ... ],
      "Thu": [ ... ],
      "Fri": [ ... ],
      "Sat": [ ... ],
      "Sun": [ ... ]
    },
    "weekly_tips": [
      "Drink 3L water daily — it boosts metabolism.",
      "Walk 10,000 steps per day as a baseline.",
      "Avoid processed sugars and trans fats."
    ],
    "generated_at": "2026-03-31T10:00:00"
  }
}
```

---

## 📝 4. ACTIVITY LOG ENDPOINTS (JWT Required)

### `POST /api/activity`
Log a meal, workout, water, or sleep entry.

**Request — Meal:**
```json
{
  "log_type": "meal",               // REQUIRED
  "description": "Grilled chicken + rice",
  "calories_in": 650,               // int >= 0
  "log_date": "2026-03-31"          // YYYY-MM-DD, OPTIONAL (defaults to today)
}
```

**Request — Workout:**
```json
{
  "log_type": "workout",
  "description": "Morning run",
  "calories_out": 300,
  "duration_min": 35,
  "log_date": "2026-03-31"
}
```

**Request — Water:**
```json
{
  "log_type": "water",
  "water_ml": 500,
  "log_date": "2026-03-31"
}
```

**Request — Sleep:**
```json
{
  "log_type": "sleep",
  "sleep_hours": 7.5,
  "log_date": "2026-03-31"
}
```

**Success (201):**
```json
{
  "status": "success",
  "message": "Activity logged",
  "log_id": 42
}
```

---

### `GET /api/activity?date=2026-03-31`
Get all activity logs for a specific date with daily summary.

**Query Params:** `date` (YYYY-MM-DD, OPTIONAL — defaults to today)

**Success (200):**
```json
{
  "status": "success",
  "date": "2026-03-31",
  "summary": {
    "calories_in": 1800,
    "calories_out": 450,
    "net_calories": 1350,
    "water_ml": 2500,
    "sleep_hours": 7.5
  },
  "logs": [
    {
      "id": 42,
      "log_type": "meal",
      "description": "Grilled chicken + rice",
      "calories_in": 650,
      "calories_out": 0,
      "water_ml": 0,
      "sleep_hours": 0,
      "duration_min": 0,
      "log_date": "2026-03-31",
      "created_at": "2026-03-31T08:30:00"
    }
  ]
}
```

---

## 📊 5. DASHBOARD ENDPOINT (JWT Required)

### `GET /api/dashboard`
Main dashboard data – aggregated stats for today + weekly chart data.

**Success (200):**
```json
{
  "status": "success",
  "dashboard": {
    "bmi": 26.12,
    "bmi_category": "Overweight",
    "today_calories_in": 1800,
    "today_calories_out": 450,
    "daily_calorie_goal": 2033,
    "goal_progress_pct": 88,
    "workout_streak": 5,
    "water_today_ml": 2500,
    "water_goal_ml": 3000,
    "weekly_chart": {
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "calories_in":  [1900, 1750, 2000, 1600, 1850, 2100, 1700],
      "calories_out": [400, 300, 0, 500, 350, 450, 200]
    },
    "motivational_quote": "Every rep brings you closer to your goal!",
    "this_week_tip": "Try intermittent fasting 16:8 for better fat loss."
  }
}
```

> **Frontend Usage:**
> - `weekly_chart` → feed directly to Chart.js bar/line chart
> - `goal_progress_pct` → calorie ring/donut chart
> - `water_today_ml / water_goal_ml` → water progress bar

---

## 🔍 6. FOOD SCANNER ENDPOINTS (JWT Required)

### `GET /api/food/search?q=banana`
Text-based food search.

**Query Params:** `q` (search term, REQUIRED)

**Success (200):**
```json
{
  "status": "success",
  "results": [
    {
      "id": 12,
      "name": "Banana",
      "calories_per_100g": 89.0,
      "protein_g": 1.1,
      "carbs_g": 22.8,
      "fat_g": 0.3,
      "fiber_g": 2.6
    }
  ]
}
```

---

### `POST /api/food/scan`
Barcode-based food lookup.

**Request:**
```json
{
  "barcode": "012345678901"         // string, REQUIRED
}
```

**Success (200):**
```json
{
  "status": "success",
  "food": {
    "name": "Lay's Classic Chips",
    "calories_per_100g": 536.0,
    "serving_size_g": 28,
    "calories_per_serving": 150
  }
}
```

**Not Found (404):**
```json
{
  "status": "error",
  "message": "Food not found for this barcode"
}
```

---

## 🏋️ 7. WORKOUT PLAN ENDPOINTS (JWT Required)

### `GET /api/workout/plan`
Get user's saved workout plan (all days).

**Success (200):**
```json
{
  "status": "success",
  "plan": [
    {
      "id": 1,
      "plan_name": "Upper Body Day",
      "day": "Mon",
      "exercises": [
        { "name": "Push-ups", "sets": 3, "reps": 15, "duration_min": 0 },
        { "name": "Plank", "sets": 3, "reps": 0, "duration_min": 1 }
      ]
    }
  ]
}
```

---

### `POST /api/workout/plan`
Save or update a workout plan for a specific day.

**Request:**
```json
{
  "day": "Mon",                     // "Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun", REQUIRED
  "plan_name": "Upper Body Day",    // string, OPTIONAL
  "exercises": [                    // array, REQUIRED
    { "name": "Push-ups", "sets": 3, "reps": 15, "duration_min": 0 },
    { "name": "Dumbbell Curl", "sets": 3, "reps": 12, "duration_min": 0 }
  ]
}
```

**Success (200):**
```json
{
  "status": "success",
  "message": "Workout plan saved",
  "plan_id": 5
}
```

---

### `POST /api/workout/timer`
Log a completed timed exercise session (creates activity log entry).

**Request:**
```json
{
  "exercise_name": "Plank",         // string, REQUIRED
  "duration_seconds": 60,           // int, REQUIRED
  "log_date": "2026-03-31"          // YYYY-MM-DD, OPTIONAL
}
```

**Success (201):**
```json
{
  "status": "success",
  "message": "Timer session logged",
  "log_id": 55
}
```

---

## 🧑‍🏫 8. TRAINER ENDPOINT (JWT Required)

### `GET /api/trainers?location=Mumbai`
Get list of trainers, optionally filtered by location.

**Query Params:** `location` (string, OPTIONAL)

**Success (200):**
```json
{
  "status": "success",
  "trainers": [
    {
      "id": 1,
      "name": "Rahul Sharma",
      "specialization": "Weight Loss, HIIT",
      "location": "Andheri, Mumbai",
      "contact_email": "rahul@fitpro.com",
      "contact_phone": "+91-9876543210",
      "rating": 4.8,
      "available": true
    }
  ]
}
```

---

## 🩺 9. DOCTOR ENDPOINT (JWT Required)

### `GET /api/doctors?specialization=dietitian`
Get list of doctors, optionally filtered by specialization.

**Query Params:** `specialization` (string, OPTIONAL)

**Success (200):**
```json
{
  "status": "success",
  "doctors": [
    {
      "id": 1,
      "name": "Dr. Priya Mehta",
      "specialization": "Dietitian & Nutritionist",
      "hospital": "Apollo Wellness Center",
      "contact_email": "drpriya@apollo.com",
      "contact_phone": "+91-9812345678",
      "available_slots": ["Mon 10am-1pm", "Wed 3pm-6pm"],
      "rating": 4.9
    }
  ]
}
```

---

## 🤖 10. AI DIET PLANNER ENDPOINT (JWT Required)

### `POST /api/ai/diet-chat`
Send a text/voice query to the AI diet assistant. The AI response is personalized using the user's profile.

**Rate Limit:** 60 requests/hour

**Request:**
```json
{
  "message": "What should I eat for breakfast if I want to lose weight?",   // string, REQUIRED
  "voice_input": false              // boolean, OPTIONAL (for analytics)
}
```

**Success (200):**
```json
{
  "status": "success",
  "reply": "For weight loss, try oats with berries and a boiled egg. It gives ~350 kcal with high protein to keep you full until lunch.",
  "speak": true
}
```

> **Frontend Usage:**
> - If `speak === true` AND voice mode is on → use `SpeechSynthesis` to speak the reply
> - Display reply as a chat bubble in the AI planner interface

---

## ⏰ 11. REMINDER ENDPOINTS (JWT Required)

### `GET /api/reminders`
Get all reminders for the logged-in user.

**Success (200):**
```json
{
  "status": "success",
  "reminders": [
    {
      "id": 1,
      "reminder_type": "water",
      "message": "Time to drink a glass of water!",
      "remind_at": "09:00:00",
      "repeat_daily": true,
      "is_active": true
    }
  ]
}
```

---

### `POST /api/reminders`
Create a new reminder.

**Request:**
```json
{
  "reminder_type": "workout",       // "workout"|"meal"|"water"|"sleep"|"custom", REQUIRED
  "message": "Evening workout time!",  // string, REQUIRED
  "remind_at": "18:00",             // HH:MM format, REQUIRED
  "repeat_daily": true              // boolean, OPTIONAL (default: true)
}
```

**Success (201):**
```json
{
  "status": "success",
  "message": "Reminder created",
  "reminder_id": 3
}
```

---

### `DELETE /api/reminders/<id>`
Delete a reminder (ownership verified server-side).

**Success (200):**
```json
{
  "status": "success",
  "message": "Reminder deleted"
}
```

---

## 📈 12. PROGRESS & REPORTS (JWT Required)

### `GET /api/progress?period=weekly`
Get progress data for charts.

**Query Params:** `period` = `weekly` | `monthly` (REQUIRED)

**Success (200):**
```json
{
  "status": "success",
  "period": "weekly",
  "weight_history": [
    { "date": "2026-03-24", "weight_kg": 81.2 },
    { "date": "2026-03-31", "weight_kg": 80.0 }
  ],
  "avg_calories_in": 1850,
  "avg_calories_out": 400,
  "workout_days": 5,
  "bmi_trend": [26.5, 26.1]
}
```

---

### `GET /api/export/pdf`
Download health report as PDF.

**Rate Limit:** 5 requests/hour

**Response:** Binary PDF file  
**Content-Type:** `application/pdf`  
**Content-Disposition:** `attachment; filename=health-report.pdf`

> **Frontend Usage:** Use `fetch()` with `blob()` response, create download link:
> ```javascript
> const res = await fetch(`${API_BASE}/export/pdf`, {
>   headers: { Authorization: `Bearer ${token}` }
> });
> const blob = await res.blob();
> const url = URL.createObjectURL(blob);
> const a = document.createElement('a');
> a.href = url;
> a.download = 'health-report.pdf';
> a.click();
> ```

---

## 🏥 Health Check (No Auth)

### `GET /health`
**Note:** This is NOT under `/api` prefix.

**Response (200):**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

## 📋 Enum Reference (All Valid Values)

Use these exact string values in requests:

| Field | Valid Values |
|---|---|
| `gender` | `"male"`, `"female"`, `"other"` |
| `activity_level` | `"sedentary"`, `"light"`, `"moderate"`, `"active"` |
| `food_habits` | `"veg"`, `"non-veg"`, `"vegan"`, `"keto"`, `"paleo"` |
| `fitness_goal` | `"weight_loss"`, `"muscle_gain"`, `"maintenance"` |
| `log_type` | `"meal"`, `"workout"`, `"water"`, `"sleep"` |
| `reminder_type` | `"workout"`, `"meal"`, `"water"`, `"sleep"`, `"custom"` |
| `day_of_week` | `"Mon"`, `"Tue"`, `"Wed"`, `"Thu"`, `"Fri"`, `"Sat"`, `"Sun"` |
| `role` | `"user"`, `"admin"` |
| `period` | `"weekly"`, `"monthly"` |

---

## 🔑 Complete Endpoint Quick Reference

| # | Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|---|
| 1 | POST | `/api/register` | ❌ | 10/hr | Register new user |
| 2 | POST | `/api/login` | ❌ | 20/hr | Login, get JWT |
| 3 | POST | `/api/logout` | ❌ | — | Logout (stateless) |
| 4 | GET | `/api/profile` | ✅ | — | Get health profile |
| 5 | POST | `/api/profile` | ✅ | — | Create/update profile |
| 6 | GET | `/api/dashboard` | ✅ | — | Dashboard summary |
| 7 | GET | `/api/recommendations` | ✅ | — | Diet + workout recs |
| 8 | POST | `/api/activity` | ✅ | — | Log activity |
| 9 | GET | `/api/activity` | ✅ | — | Get logs by date |
| 10 | GET | `/api/food/search` | ✅ | — | Search food DB |
| 11 | POST | `/api/food/scan` | ✅ | — | Barcode lookup |
| 12 | GET | `/api/workout/plan` | ✅ | — | Get workout plan |
| 13 | POST | `/api/workout/plan` | ✅ | — | Save workout plan |
| 14 | POST | `/api/workout/timer` | ✅ | — | Log timer session |
| 15 | GET | `/api/trainers` | ✅ | — | List trainers |
| 16 | GET | `/api/doctors` | ✅ | — | List doctors |
| 17 | POST | `/api/ai/diet-chat` | ✅ | 60/hr | AI diet assistant |
| 18 | GET | `/api/reminders` | ✅ | — | List reminders |
| 19 | POST | `/api/reminders` | ✅ | — | Create reminder |
| 20 | DELETE | `/api/reminders/<id>` | ✅ | — | Delete reminder |
| 21 | GET | `/api/progress` | ✅ | — | Progress data |
| 22 | GET | `/api/export/pdf` | ✅ | 5/hr | Download PDF report |

---

## ⚡ Frontend API Client Template

Use this as the central API module (`js/api.js`):

```javascript
const API_BASE = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('access_token');
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  // Auto-redirect on expired/invalid token
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
    return;
  }

  return response.json();
}

const API = {
  register:        (data) => apiFetch('/register', { method: 'POST', body: JSON.stringify(data) }),
  login:           (data) => apiFetch('/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile:      ()     => apiFetch('/profile'),
  saveProfile:     (data) => apiFetch('/profile', { method: 'POST', body: JSON.stringify(data) }),
  getDashboard:    ()     => apiFetch('/dashboard'),
  getRecommend:    ()     => apiFetch('/recommendations'),
  logActivity:     (data) => apiFetch('/activity', { method: 'POST', body: JSON.stringify(data) }),
  getActivity:     (date) => apiFetch(`/activity?date=${date}`),
  searchFood:      (q)    => apiFetch(`/food/search?q=${encodeURIComponent(q)}`),
  scanBarcode:     (data) => apiFetch('/food/scan', { method: 'POST', body: JSON.stringify(data) }),
  getWorkoutPlan:  ()     => apiFetch('/workout/plan'),
  saveWorkoutPlan: (data) => apiFetch('/workout/plan', { method: 'POST', body: JSON.stringify(data) }),
  logTimer:        (data) => apiFetch('/workout/timer', { method: 'POST', body: JSON.stringify(data) }),
  getTrainers:     (loc)  => apiFetch(`/trainers?location=${encodeURIComponent(loc || '')}`),
  getDoctors:      (spec) => apiFetch(`/doctors?specialization=${encodeURIComponent(spec || '')}`),
  aiDietChat:      (data) => apiFetch('/ai/diet-chat', { method: 'POST', body: JSON.stringify(data) }),
  getReminders:    ()     => apiFetch('/reminders'),
  addReminder:     (data) => apiFetch('/reminders', { method: 'POST', body: JSON.stringify(data) }),
  deleteReminder:  (id)   => apiFetch(`/reminders/${id}`, { method: 'DELETE' }),
  getProgress:     (p)    => apiFetch(`/progress?period=${p}`),
  exportPDF:       ()     => fetch(`${API_BASE}/export/pdf`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
};
```

---

## 🤝 Agreement Confirmation

Please confirm the following:
1. ✅ Base URL and CORS origin are correct
2. ✅ Response envelope format (`status` + data key) works for you
3. ✅ All enum values are understood and will be used exactly as listed
4. ✅ JWT flow (store in localStorage, send as Bearer token) is acceptable
5. ✅ On `401`, you'll auto-clear storage and redirect to login
6. ✅ Dates will be sent as `YYYY-MM-DD` strings
7. ✅ Times will be sent as `HH:MM` strings

**Let us know if you'd like any changes before we start building! 🚀**
