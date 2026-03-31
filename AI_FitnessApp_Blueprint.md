# 🏋️ AI-Based Healthy Diet & Fitness Management System
## Complete Blueprint — Frontend + Backend + API Contract

---

# TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack Summary](#2-tech-stack-summary)
3. [Database Schema (MySQL)](#3-database-schema-mysql)
4. [API Contract (Full Agreement)](#4-api-contract-full-agreement)
5. [Backend Plan (Flask)](#5-backend-plan-flask)
6. [Frontend Plan (HTML/CSS/JS)](#6-frontend-plan-htmlcssjs)
7. [Feature-by-Feature Breakdown](#7-feature-by-feature-breakdown)
8. [Security Plan](#8-security-plan)
9. [Setup Instructions](#9-setup-instructions)
10. [requirements.txt](#10-requirementstxt)
11. [Folder Structure](#11-folder-structure)

---

# 1. PROJECT OVERVIEW

| Field | Details |
|---|---|
| **Project Name** | AI-Based Healthy Diet & Fitness Management System |
| **Type** | Full-Stack Web Application |
| **Auth** | JWT (JSON Web Token) |
| **AI Engine** | Rule-based logic + Claude API (voice diet planner) |
| **Charts** | Chart.js |
| **Voice** | Web Speech API |
| **PDF Export** | jsPDF or WeasyPrint (backend) |
| **Dark Mode** | CSS Variables toggle |
| **Target Deployment** | Local / VPS / Codex / Antigravity |

---

# 2. TECH STACK SUMMARY

## Frontend
| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom, responsive, dark mode) |
| Logic | Vanilla JavaScript (ES6+) |
| Charts | Chart.js v4 |
| Voice | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| PDF Export | jsPDF + html2canvas |
| Icons | Lucide Icons (CDN) |
| Fonts | Google Fonts (Sora + DM Mono) |

## Backend
| Layer | Technology |
|---|---|
| Language | Python 3.11+ |
| Framework | Flask |
| Auth | Flask-JWT-Extended |
| ORM | SQLAlchemy |
| Password | bcrypt |
| DB Driver | PyMySQL |
| CORS | Flask-CORS |
| Validation | Marshmallow |
| PDF | WeasyPrint |
| Scheduler | APScheduler (reminders) |
| AI Voice | Claude API (Anthropic) |

## Database
| Layer | Technology |
|---|---|
| Engine | MySQL 8.0+ |
| ORM | SQLAlchemy (declarative models) |
| Migrations | Flask-Migrate (Alembic) |

---

# 3. DATABASE SCHEMA (MySQL)

## 3.1 Table: `users`

```sql
CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100)        NOT NULL,
    email           VARCHAR(150)        UNIQUE NOT NULL,
    password_hash   VARCHAR(255)        NOT NULL,
    role            ENUM('user','admin') DEFAULT 'user',
    created_at      TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);
```

## 3.2 Table: `health_profiles`

```sql
CREATE TABLE health_profiles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    age             INT             NOT NULL,
    gender          ENUM('male','female','other') NOT NULL,
    height_cm       DECIMAL(5,2)    NOT NULL,
    weight_kg       DECIMAL(5,2)    NOT NULL,
    activity_level  ENUM('sedentary','light','moderate','active') NOT NULL,
    sleep_hours     DECIMAL(4,2),
    food_habits     ENUM('veg','non-veg','vegan','keto','paleo') DEFAULT 'non-veg',
    fitness_goal    ENUM('weight_loss','muscle_gain','maintenance') NOT NULL,
    bmi             DECIMAL(5,2)    GENERATED ALWAYS AS (weight_kg / ((height_cm/100) * (height_cm/100))) STORED,
    bmr             DECIMAL(8,2),
    daily_calories  INT,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_profile (user_id)
);
```

## 3.3 Table: `activity_logs`

```sql
CREATE TABLE activity_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    log_date        DATE            NOT NULL,
    log_type        ENUM('meal','workout','water','sleep') NOT NULL,
    description     VARCHAR(255),
    calories_in     INT             DEFAULT 0,
    calories_out    INT             DEFAULT 0,
    water_ml        INT             DEFAULT 0,
    sleep_hours     DECIMAL(4,2)    DEFAULT 0,
    duration_min    INT             DEFAULT 0,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, log_date)
);
```

## 3.4 Table: `recommendations`

```sql
CREATE TABLE recommendations (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    diet_plan       TEXT,
    workout_plan    TEXT,
    daily_calories  INT,
    weekly_tips     TEXT,
    bmi_category    VARCHAR(50),
    generated_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_rec (user_id)
);
```

## 3.5 Table: `food_items` (Food Scanner)

```sql
CREATE TABLE food_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL,
    calories_per_100g DECIMAL(7,2),
    protein_g       DECIMAL(6,2),
    carbs_g         DECIMAL(6,2),
    fat_g           DECIMAL(6,2),
    barcode         VARCHAR(50),
    source          VARCHAR(50)     DEFAULT 'manual',
    INDEX idx_name (name),
    INDEX idx_barcode (barcode)
);
```

## 3.6 Table: `workout_plans`

```sql
CREATE TABLE workout_plans (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    plan_name       VARCHAR(100),
    day_of_week     ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun'),
    exercises       JSON,           -- [{name, sets, reps, duration_min}]
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 3.7 Table: `trainers`

```sql
CREATE TABLE trainers (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    specialization  VARCHAR(150),
    location        VARCHAR(200),
    contact_email   VARCHAR(150),
    contact_phone   VARCHAR(20),
    rating          DECIMAL(3,2),
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    available       BOOLEAN         DEFAULT TRUE
);
```

## 3.8 Table: `doctors`

```sql
CREATE TABLE doctors (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    specialization  VARCHAR(150),
    hospital        VARCHAR(200),
    contact_email   VARCHAR(150),
    contact_phone   VARCHAR(20),
    available_slots TEXT,           -- JSON array of time slots
    rating          DECIMAL(3,2)
);
```

## 3.9 Table: `reminders`

```sql
CREATE TABLE reminders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    reminder_type   ENUM('workout','meal','water','sleep','custom') NOT NULL,
    message         TEXT,
    remind_at       TIME,
    repeat_daily    BOOLEAN         DEFAULT TRUE,
    is_active       BOOLEAN         DEFAULT TRUE,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

# 4. API CONTRACT (Full Agreement)

> **Base URL:** `http://localhost:5000/api`  
> **Auth Header:** `Authorization: Bearer <JWT_TOKEN>`  
> **Content-Type:** `application/json`

---

## 4.1 AUTH ENDPOINTS

### POST `/api/register`
**Purpose:** Register a new user

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "user_id": 1
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "Email already registered"
}
```

---

### POST `/api/login`
**Purpose:** Authenticate user and return JWT

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "full_name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Response (401):**
```json
{
  "status": "error",
  "message": "Invalid credentials"
}
```

---

### POST `/api/logout`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

## 4.2 PROFILE ENDPOINTS

### GET `/api/profile`
**Auth Required:** Yes

**Success Response (200):**
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

---

### POST `/api/profile`
**Auth Required:** Yes  
**Purpose:** Create or update health profile

**Request Body:**
```json
{
  "age": 25,
  "gender": "male",
  "height_cm": 175.0,
  "weight_kg": 80.0,
  "activity_level": "moderate",
  "sleep_hours": 7.5,
  "food_habits": "non-veg",
  "fitness_goal": "weight_loss"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Profile updated",
  "bmi": 26.12,
  "bmr": 1876.5,
  "daily_calories": 2533
}
```

---

## 4.3 RECOMMENDATION ENDPOINTS

### GET `/api/recommendations`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "status": "success",
  "recommendations": {
    "bmi_category": "Overweight",
    "daily_calories": 2033,
    "diet_plan": {
      "breakfast": "Oats with banana + green tea (400 kcal)",
      "lunch": "Grilled chicken salad + whole wheat roti (600 kcal)",
      "snack": "Mixed nuts + fruit (200 kcal)",
      "dinner": "Paneer curry + brown rice (600 kcal)"
    },
    "workout_plan": {
      "Mon": ["30 min cardio", "15 min core"],
      "Tue": ["Upper body strength", "20 min walk"],
      "Wed": ["Rest or light yoga"],
      "Thu": ["30 min HIIT", "15 min stretching"],
      "Fri": ["Lower body strength"],
      "Sat": ["45 min cardio"],
      "Sun": ["Rest"]
    },
    "weekly_tips": [
      "Drink 3L water daily",
      "Sleep 7-8 hours",
      "Track every meal"
    ]
  }
}
```

---

## 4.4 ACTIVITY LOG ENDPOINTS

### POST `/api/activity`
**Auth Required:** Yes  
**Purpose:** Log a meal, workout, water, or sleep entry

**Request Body (Meal):**
```json
{
  "log_type": "meal",
  "description": "Grilled chicken + rice",
  "calories_in": 650,
  "log_date": "2026-03-31"
}
```

**Request Body (Workout):**
```json
{
  "log_type": "workout",
  "description": "Morning run",
  "calories_out": 300,
  "duration_min": 35,
  "log_date": "2026-03-31"
}
```

**Request Body (Water):**
```json
{
  "log_type": "water",
  "water_ml": 500,
  "log_date": "2026-03-31"
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Activity logged",
  "log_id": 42
}
```

---

### GET `/api/activity?date=2026-03-31`
**Auth Required:** Yes

**Success Response (200):**
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
      "created_at": "2026-03-31T08:30:00"
    }
  ]
}
```

---

## 4.5 DASHBOARD ENDPOINT

### GET `/api/dashboard`
**Auth Required:** Yes

**Success Response (200):**
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
      "labels": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      "calories_in": [1900, 1750, 2000, 1600, 1850, 2100, 1700],
      "calories_out": [400, 300, 0, 500, 350, 450, 200]
    },
    "motivational_quote": "Every rep brings you closer to your goal!",
    "this_week_tip": "Try intermittent fasting 16:8 for better fat loss."
  }
}
```

---

## 4.6 FOOD SCANNER ENDPOINTS

### GET `/api/food/search?q=banana`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "status": "success",
  "results": [
    {
      "id": 12,
      "name": "Banana",
      "calories_per_100g": 89,
      "protein_g": 1.1,
      "carbs_g": 22.8,
      "fat_g": 0.3
    }
  ]
}
```

---

### POST `/api/food/scan`
**Auth Required:** Yes  
**Purpose:** Scan barcode or image to get food info

**Request Body:**
```json
{
  "barcode": "012345678901"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "food": {
    "name": "Lay's Classic Chips",
    "calories_per_100g": 536,
    "serving_size_g": 28,
    "calories_per_serving": 150
  }
}
```

---

## 4.7 WORKOUT PLAN ENDPOINTS

### GET `/api/workout/plan`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "status": "success",
  "plan": [
    {
      "day": "Mon",
      "exercises": [
        {"name": "Push-ups", "sets": 3, "reps": 15, "duration_min": 0},
        {"name": "Plank", "sets": 3, "reps": 0, "duration_min": 1}
      ]
    }
  ]
}
```

---

### POST `/api/workout/plan`
**Auth Required:** Yes  
**Purpose:** Save or update workout plan

**Request Body:**
```json
{
  "day": "Mon",
  "plan_name": "Upper Body Day",
  "exercises": [
    {"name": "Push-ups", "sets": 3, "reps": 15, "duration_min": 0},
    {"name": "Dumbbell Curl", "sets": 3, "reps": 12, "duration_min": 0}
  ]
}
```

---

### POST `/api/workout/timer`
**Auth Required:** Yes  
**Purpose:** Log timer session for a workout

**Request Body:**
```json
{
  "exercise_name": "Plank",
  "duration_seconds": 60,
  "log_date": "2026-03-31"
}
```

---

## 4.8 TRAINER ENDPOINTS

### GET `/api/trainers?location=Mumbai`
**Auth Required:** Yes

**Success Response (200):**
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
      "rating": 4.8
    }
  ]
}
```

---

## 4.9 DOCTOR ENDPOINTS

### GET `/api/doctors?specialization=dietitian`
**Auth Required:** Yes

**Success Response (200):**
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
      "available_slots": ["Mon 10am-1pm", "Wed 3pm-6pm"],
      "rating": 4.9
    }
  ]
}
```

---

## 4.10 AI DIET PLANNER (Voice) ENDPOINTS

### POST `/api/ai/diet-chat`
**Auth Required:** Yes  
**Purpose:** Send voice/text query to AI diet assistant

**Request Body:**
```json
{
  "message": "What should I eat for breakfast if I want to lose weight?",
  "voice_input": false
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "reply": "For weight loss, try oats with berries and a boiled egg. It gives ~350 kcal with high protein to keep you full until lunch.",
  "speak": true
}
```

---

## 4.11 REMINDER ENDPOINTS

### GET `/api/reminders`
**Auth Required:** Yes

**Success Response (200):**
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

### POST `/api/reminders`
**Auth Required:** Yes

**Request Body:**
```json
{
  "reminder_type": "workout",
  "message": "Time for your evening workout!",
  "remind_at": "18:00",
  "repeat_daily": true
}
```

---

### DELETE `/api/reminders/<id>`
**Auth Required:** Yes

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Reminder deleted"
}
```

---

## 4.12 PROGRESS & REPORTS

### GET `/api/progress?period=weekly`
**Auth Required:** Yes  
**Params:** `period` = `weekly` | `monthly`

**Success Response (200):**
```json
{
  "status": "success",
  "period": "weekly",
  "weight_history": [
    {"date": "2026-03-24", "weight_kg": 81.2},
    {"date": "2026-03-31", "weight_kg": 80.0}
  ],
  "avg_calories_in": 1850,
  "avg_calories_out": 400,
  "workout_days": 5,
  "bmi_trend": [26.5, 26.1]
}
```

---

### GET `/api/export/pdf`
**Auth Required:** Yes  
**Purpose:** Generate and download health report PDF

**Response:** Binary PDF file  
**Content-Type:** `application/pdf`

---

# 5. BACKEND PLAN (Flask)

## 5.1 Folder Structure

```
backend/
│
├── app.py                      # App factory, register blueprints
├── config.py                   # Config classes (Dev/Prod)
├── extensions.py               # db, jwt, bcrypt, cors, scheduler
│
├── models/
│   ├── __init__.py
│   ├── user.py                 # User model
│   ├── health_profile.py       # HealthProfile model
│   ├── activity_log.py         # ActivityLog model
│   ├── recommendation.py       # Recommendation model
│   ├── food_item.py            # FoodItem model
│   ├── workout_plan.py         # WorkoutPlan model
│   ├── trainer.py              # Trainer model
│   ├── doctor.py               # Doctor model
│   └── reminder.py             # Reminder model
│
├── routes/
│   ├── __init__.py
│   ├── auth_routes.py          # /api/register, /api/login, /api/logout
│   ├── profile_routes.py       # /api/profile
│   ├── recommendation_routes.py# /api/recommendations
│   ├── activity_routes.py      # /api/activity
│   ├── dashboard_routes.py     # /api/dashboard
│   ├── food_routes.py          # /api/food/*
│   ├── workout_routes.py       # /api/workout/*
│   ├── trainer_routes.py       # /api/trainers
│   ├── doctor_routes.py        # /api/doctors
│   ├── ai_routes.py            # /api/ai/*
│   ├── reminder_routes.py      # /api/reminders
│   ├── progress_routes.py      # /api/progress
│   └── export_routes.py        # /api/export/*
│
├── controllers/
│   ├── auth_controller.py      # Business logic for auth
│   ├── profile_controller.py   # BMI, BMR calculation logic
│   ├── recommendation_controller.py  # AI rules engine
│   ├── activity_controller.py  # Logging logic
│   ├── dashboard_controller.py # Aggregation logic
│   ├── food_controller.py      # Food search + barcode
│   ├── workout_controller.py   # Plan CRUD
│   ├── ai_controller.py        # Claude API integration
│   └── export_controller.py    # PDF generation
│
├── middleware/
│   ├── auth_middleware.py      # JWT verification decorator
│   └── validation_middleware.py# Input validation decorators
│
├── utils/
│   ├── bmi_calculator.py       # BMI, BMR, TDEE formulas
│   ├── recommendation_engine.py# Rule-based recommendation logic
│   ├── quote_generator.py      # Daily motivational quotes
│   ├── pdf_generator.py        # WeasyPrint PDF builder
│   └── validators.py           # Schema validation (Marshmallow)
│
├── schemas/                    # Marshmallow schemas for validation
│   ├── auth_schema.py
│   ├── profile_schema.py
│   └── activity_schema.py
│
├── migrations/                 # Flask-Migrate alembic migrations
├── requirements.txt
└── .env                        # SECRET_KEY, DB_URL, ANTHROPIC_KEY
```

---

## 5.2 Key Backend Logic

### BMR Formula (Mifflin-St Jeor)
```python
# Male
BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
# Female
BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161

# Activity Multipliers
MULTIPLIERS = {
    'sedentary': 1.2,
    'light':     1.375,
    'moderate':  1.55,
    'active':    1.725
}
TDEE = BMR * MULTIPLIER

# Goal Adjustments
# Weight loss:  TDEE - 500 kcal (deficit)
# Muscle gain:  TDEE + 300 kcal (surplus)
# Maintenance:  TDEE
```

### BMI Categories
```python
def get_bmi_category(bmi):
    if bmi < 18.5:   return "Underweight"   # → Weight gain plan
    if bmi < 25:     return "Normal"         # → Maintenance plan
    if bmi < 30:     return "Overweight"     # → Weight loss plan
    return "Obese"                           # → Aggressive loss plan
```

### Recommendation Engine (Rule-Based)
```python
def generate_recommendation(profile):
    bmi = profile.bmi
    goal = profile.fitness_goal
    food_pref = profile.food_habits

    # Select base diet template
    if bmi < 18.5 or goal == 'muscle_gain':
        diet = DIET_TEMPLATES['high_protein'][food_pref]
        workout = WORKOUT_TEMPLATES['strength']
        calorie_adj = +300

    elif bmi > 25 or goal == 'weight_loss':
        diet = DIET_TEMPLATES['low_cal'][food_pref]
        workout = WORKOUT_TEMPLATES['cardio']
        calorie_adj = -500

    else:
        diet = DIET_TEMPLATES['balanced'][food_pref]
        workout = WORKOUT_TEMPLATES['mixed']
        calorie_adj = 0

    target_calories = profile.daily_calories + calorie_adj
    return diet, workout, target_calories
```

---

## 5.3 app.py (Entry Point)
```python
from flask import Flask
from extensions import db, jwt, bcrypt, cors, migrate
from routes import register_blueprints
from config import DevelopmentConfig

def create_app():
    app = Flask(__name__)
    app.config.from_object(DevelopmentConfig)
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    migrate.init_app(app, db)
    
    # Register all blueprints
    register_blueprints(app)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
```

---

## 5.4 config.py
```python
import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'mysql+pymysql://root:password@localhost/fitness_db'
    )

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
```

---

# 6. FRONTEND PLAN (HTML/CSS/JS)

## 6.1 Folder Structure

```
frontend/
│
├── index.html                  # Landing / Login page
├── register.html               # Sign Up page
├── dashboard.html              # Main dashboard
├── profile.html                # User profile form
├── tracker.html                # Activity tracker (meals, water, sleep)
├── recommendations.html        # AI diet + workout recommendations
├── workout.html                # Workout plan display + timer
├── food-scanner.html           # Barcode/text food scanner
├── progress.html               # Charts and progress tracking
├── trainers.html               # Local trainer connect
├── doctors.html                # Doctor help section
├── ai-planner.html             # AI voice diet planner
├── reminders.html              # Reminder settings
│
├── css/
│   ├── main.css                # Global styles, CSS variables
│   ├── auth.css                # Login/Register styles
│   ├── dashboard.css           # Dashboard layout
│   ├── components.css          # Reusable components
│   ├── dark-mode.css           # Dark mode overrides
│   └── animations.css          # Transition/animation classes
│
└── js/
    ├── api.js                  # Central API client (fetch wrapper + JWT)
    ├── auth.js                 # Login/register/logout logic
    ├── profile.js              # Profile form + BMI display
    ├── dashboard.js            # Dashboard data + Chart.js
    ├── tracker.js              # Activity logging
    ├── recommendations.js      # Display recommendations
    ├── workout.js              # Workout plan + timer + alarm
    ├── food-scanner.js         # Food search + barcode scan
    ├── progress.js             # Progress charts (Chart.js)
    ├── trainers.js             # Trainer listings
    ├── doctors.js              # Doctor listings
    ├── ai-planner.js           # Voice input + AI chat
    ├── reminders.js            # Reminder CRUD + browser notifications
    ├── pdf-export.js           # jsPDF export
    ├── dark-mode.js            # Theme toggle
    └── utils.js                # Shared helpers, date formatting
```

---

## 6.2 Page-by-Page Plan

### `index.html` — Login Page
- Email + Password form
- "Remember Me" checkbox
- Link to Register
- POST `/api/login` → store JWT in localStorage
- Redirect to `dashboard.html` on success

### `register.html` — Sign Up Page
- Full Name, Email, Password, Confirm Password
- Real-time password strength indicator
- POST `/api/register` → auto-login or redirect to login

### `dashboard.html` — Main Dashboard
- Sidebar navigation (all pages)
- BMI card with category badge
- Calorie ring chart (consumed vs burned vs goal)
- Weekly bar chart (Chart.js)
- Workout streak counter
- Water progress bar
- Today's motivational quote
- Quick log buttons (meal, workout, water)
- Dark mode toggle (top right)

### `profile.html` — Health Profile
- Multi-step form (Step 1: Personal, Step 2: Health, Step 3: Goals)
- Live BMI calculator (updates as height/weight typed)
- BMI gauge visualization
- Activity level selector (icon-based cards)
- Fitness goal selector (icon cards)
- PUT/POST `/api/profile`

### `tracker.html` — Activity Tracker
- Tab switcher: Meals | Workout | Water | Sleep
- Meals: search food (GET `/api/food/search`) → add to log
- Workout: select type, enter duration, calories burned
- Water: click + / - buttons to log ml
- Sleep: log hours slider
- Daily summary bar at bottom

### `recommendations.html` — AI Recommendations
- BMI category banner
- Diet plan cards (Breakfast, Lunch, Snack, Dinner)
- Workout week grid (Mon-Sun)
- Weekly tips carousel
- Calorie target display
- Refresh button (re-calls GET `/api/recommendations`)

### `workout.html` — Workout Display + Timer
- Today's workout from plan
- Exercise cards (exercise name, sets, reps)
- Built-in interval timer per exercise
- Rest timer between sets
- "Mark Complete" button per exercise
- Alarm support: browser Notification API
- Progress bar for session

### `food-scanner.html` — Food Scanner
- Text search bar → instant results
- Barcode input field (manual or camera-based)
- Food detail card (calories, macros)
- "Add to Today's Log" button
- Daily calorie goal bar

### `progress.html` — Progress Charts
- Weight trend line chart (Chart.js)
- BMI over time chart
- Weekly calorie comparison chart
- Workout frequency bar chart
- Date range picker (week/month/3 months)
- Export as PDF button

### `trainers.html` — Local Trainer Connect
- Location search input
- Trainer cards (photo, name, specialization, rating, contact)
- Filter by specialization
- "Connect" button → opens email/phone

### `doctors.html` — Doctor Help
- Specialization filter (Dietitian, Sports Medicine, Cardiologist)
- Doctor cards (name, hospital, slots, rating)
- Book consultation button

### `ai-planner.html` — AI Voice Diet Planner
- Chat interface (message bubbles)
- Voice input button (Web Speech API `SpeechRecognition`)
- Voice output toggle (SpeechSynthesis)
- Sends to POST `/api/ai/diet-chat`
- Shows typing indicator while waiting
- Chat history (session-based)

### `reminders.html` — Reminders & Alarms
- Add reminder form (type, message, time)
- List of active reminders with toggle + delete
- Browser Notification API permission request
- Workout timer settings (rest period, round alerts)

---

## 6.3 `api.js` — Central API Client

```javascript
// All API calls go through this module
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

  // Auto-redirect if token expired
  if (response.status === 401) {
    localStorage.clear();
    window.location.href = '/index.html';
    return;
  }

  return response.json();
}

// Exports
const API = {
  login:           (data) => apiFetch('/login', { method: 'POST', body: JSON.stringify(data) }),
  register:        (data) => apiFetch('/register', { method: 'POST', body: JSON.stringify(data) }),
  getProfile:      ()     => apiFetch('/profile'),
  saveProfile:     (data) => apiFetch('/profile', { method: 'POST', body: JSON.stringify(data) }),
  getDashboard:    ()     => apiFetch('/dashboard'),
  getRecommend:    ()     => apiFetch('/recommendations'),
  logActivity:     (data) => apiFetch('/activity', { method: 'POST', body: JSON.stringify(data) }),
  getActivity:     (date) => apiFetch(`/activity?date=${date}`),
  searchFood:      (q)    => apiFetch(`/food/search?q=${q}`),
  scanBarcode:     (data) => apiFetch('/food/scan', { method: 'POST', body: JSON.stringify(data) }),
  getWorkoutPlan:  ()     => apiFetch('/workout/plan'),
  saveWorkoutPlan: (data) => apiFetch('/workout/plan', { method: 'POST', body: JSON.stringify(data) }),
  getTrainers:     (loc)  => apiFetch(`/trainers?location=${loc}`),
  getDoctors:      (spec) => apiFetch(`/doctors?specialization=${spec}`),
  aiDietChat:      (data) => apiFetch('/ai/diet-chat', { method: 'POST', body: JSON.stringify(data) }),
  getReminders:    ()     => apiFetch('/reminders'),
  addReminder:     (data) => apiFetch('/reminders', { method: 'POST', body: JSON.stringify(data) }),
  deleteReminder:  (id)   => apiFetch(`/reminders/${id}`, { method: 'DELETE' }),
  getProgress:     (p)    => apiFetch(`/progress?period=${p}`),
  exportPDF:       ()     => fetch(`${API_BASE}/export/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } })
};
```

---

## 6.4 Voice Planner (ai-planner.js)

```javascript
// Voice input using Web Speech API
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.continuous = false;

recognition.onresult = async (event) => {
  const transcript = event.results[0][0].transcript;
  displayUserMessage(transcript);
  const response = await API.aiDietChat({ message: transcript, voice_input: true });
  displayBotMessage(response.reply);
  if (response.speak) speakResponse(response.reply);
};

function speakResponse(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  speechSynthesis.speak(utterance);
}
```

---

## 6.5 Workout Timer (workout.js)

```javascript
class WorkoutTimer {
  constructor(durationSec, onTick, onComplete) {
    this.duration = durationSec;
    this.remaining = durationSec;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.interval = null;
  }
  
  start() {
    this.interval = setInterval(() => {
      this.remaining--;
      this.onTick(this.remaining);
      if (this.remaining <= 0) {
        clearInterval(this.interval);
        this.onComplete();
        this.playAlarm();
      }
    }, 1000);
  }
  
  pause()  { clearInterval(this.interval); }
  reset()  { this.remaining = this.duration; }
  
  playAlarm() {
    // Browser Notification
    if (Notification.permission === 'granted') {
      new Notification('⏱️ Timer Done!', { body: 'Rest or move to next exercise.' });
    }
    // Audio beep
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }
}
```

---

## 6.6 Dark Mode

```javascript
// dark-mode.js
const toggle = document.getElementById('dark-mode-toggle');
const saved = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', saved);

toggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});
```

```css
/* main.css — CSS variable approach */
:root {
  --bg: #f8f9fa;
  --card: #ffffff;
  --text: #1a1a2e;
  --accent: #00d4aa;
  --border: #e0e0e0;
}
[data-theme="dark"] {
  --bg: #0f0f1a;
  --card: #1a1a2e;
  --text: #e0e0f0;
  --accent: #00d4aa;
  --border: #2a2a3e;
}
```

---

# 7. FEATURE-BY-FEATURE BREAKDOWN

| Feature | Frontend Page | API Endpoint | Backend Controller |
|---|---|---|---|
| Login | index.html | POST /api/login | auth_controller |
| Register | register.html | POST /api/register | auth_controller |
| Profile | profile.html | GET/POST /api/profile | profile_controller |
| BMI Calculator | profile.html | (local JS) | bmi_calculator.py |
| Dashboard | dashboard.html | GET /api/dashboard | dashboard_controller |
| Activity Log | tracker.html | POST/GET /api/activity | activity_controller |
| Food Scanner | food-scanner.html | GET /api/food/search | food_controller |
| Barcode Scan | food-scanner.html | POST /api/food/scan | food_controller |
| AI Recommendations | recommendations.html | GET /api/recommendations | recommendation_controller |
| Workout Plan | workout.html | GET/POST /api/workout/plan | workout_controller |
| Workout Timer | workout.html | (local JS) | — |
| Progress Charts | progress.html | GET /api/progress | — |
| Trainers | trainers.html | GET /api/trainers | trainer_controller |
| Doctors | doctors.html | GET /api/doctors | doctor_controller |
| AI Voice Planner | ai-planner.html | POST /api/ai/diet-chat | ai_controller |
| Reminders | reminders.html | GET/POST/DELETE /api/reminders | reminder_controller |
| PDF Export | progress.html | GET /api/export/pdf | export_controller |
| Dark Mode | All pages | (local JS/CSS) | — |

---

# 8. SECURITY PLAN

| Concern | Solution |
|---|---|
| Password storage | bcrypt (cost factor 12) |
| Authentication | JWT with 24h expiry |
| SQL Injection | SQLAlchemy ORM (parameterized queries) |
| XSS | Escape all user inputs, Content-Security-Policy header |
| CORS | Flask-CORS (whitelist frontend origin) |
| Route protection | `@jwt_required()` decorator on all private routes |
| Input validation | Marshmallow schemas on every POST endpoint |
| Rate limiting | Flask-Limiter (100 req/min per IP) |
| Env secrets | .env file (never commit to git) |
| HTTPS | Use nginx + certbot in production |

---

# 9. SETUP INSTRUCTIONS

## Step 1: Clone / Create Project
```bash
mkdir fitness-app && cd fitness-app
```

## Step 2: Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your MySQL credentials and API keys
```

## Step 3: MySQL Database
```bash
mysql -u root -p
CREATE DATABASE fitness_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Run migrations
flask db init
flask db migrate -m "Initial schema"
flask db upgrade
```

## Step 4: Run Backend
```bash
python app.py
# Server starts at http://localhost:5000
```

## Step 5: Frontend
```bash
cd frontend
# No build needed — open directly in browser
# Or use Live Server (VS Code extension)
python -m http.server 3000
# Open http://localhost:3000
```

---

# 10. REQUIREMENTS.TXT

```
Flask==3.0.2
Flask-JWT-Extended==4.6.0
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.5
Flask-Bcrypt==1.0.1
Flask-CORS==4.0.0
Flask-Limiter==3.5.0
PyMySQL==1.1.0
python-dotenv==1.0.1
marshmallow==3.21.1
WeasyPrint==60.2
APScheduler==3.10.4
anthropic==0.23.0
requests==2.31.0
cryptography==42.0.5
```

---

# 11. FOLDER STRUCTURE (Complete)

```
fitness-app/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── extensions.py
│   ├── requirements.txt
│   ├── .env
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── utils/
│   ├── schemas/
│   └── migrations/
│
└── frontend/
    ├── index.html
    ├── register.html
    ├── dashboard.html
    ├── profile.html
    ├── tracker.html
    ├── recommendations.html
    ├── workout.html
    ├── food-scanner.html
    ├── progress.html
    ├── trainers.html
    ├── doctors.html
    ├── ai-planner.html
    ├── reminders.html
    ├── css/
    │   ├── main.css
    │   ├── auth.css
    │   ├── dashboard.css
    │   ├── components.css
    │   ├── dark-mode.css
    │   └── animations.css
    └── js/
        ├── api.js
        ├── auth.js
        ├── profile.js
        ├── dashboard.js
        ├── tracker.js
        ├── recommendations.js
        ├── workout.js
        ├── food-scanner.js
        ├── progress.js
        ├── trainers.js
        ├── doctors.js
        ├── ai-planner.js
        ├── reminders.js
        ├── pdf-export.js
        ├── dark-mode.js
        └── utils.js
```

---

*Blueprint version 1.0 — AI Fitness Management System*  
*Ready for implementation in Codex / Antigravity / any Flask+MySQL environment*
