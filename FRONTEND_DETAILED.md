# FitLife Frontend Detailed Documentation

## Overview

FitLife frontend is a static vanilla web application built with:

- HTML5
- CSS3
- JavaScript (ES6+)
- No framework
- No build tool

It is designed as the UI for the FitLife AI-based diet and fitness management system.

The frontend talks to the Flask backend through REST APIs.

Current deployed backend used by the frontend:

`https://fitlife-backend-rrd9.onrender.com/api`

## Frontend Goals

The frontend is responsible for:

- user registration and login
- protected route handling
- health profile collection
- dashboard visualization
- meal, workout, water, and sleep tracking
- food lookup and intake logging
- AI recommendations display
- weekly and daily workout guidance
- progress charts
- trainer and doctor discovery
- reminder management
- AI planner chat interface
- dark mode UI support

## Project Structure

```text
frontend/
├── css/
│   ├── animations.css
│   ├── auth.css
│   ├── charts.css
│   ├── components.css
│   ├── dark-mode.css
│   ├── dashboard.css
│   ├── forms.css
│   └── main.css
├── js/
│   ├── ai-planner.js
│   ├── api.js
│   ├── auth-guard.js
│   ├── auth.js
│   ├── config.js
│   ├── dark-mode.js
│   ├── dashboard.js
│   ├── doctors.js
│   ├── food-scanner.js
│   ├── profile.js
│   ├── progress.js
│   ├── recommendations.js
│   ├── reminders.js
│   ├── sidebar.js
│   ├── toast.js
│   ├── tracker.js
│   ├── trainers.js
│   ├── utils.js
│   └── workout.js
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
├── render.yaml
├── AGENT.md
├── FRONTEND_PLAN.md
├── frontend_api_contract.md
├── PROJECT_STATUS.md
└── AI_FitnessApp_Blueprint.md
```

## Architecture Style

The frontend follows a simple browser-first architecture:

- each page is a standalone HTML document
- each page loads shared core scripts plus its own page script
- API communication is centralized in `js/api.js`
- auth protection is handled by `js/auth-guard.js`
- reusable helpers live in `js/utils.js`
- toast and dark mode are shared globally
- layout and design tokens are centralized in CSS

This keeps the project easy to deploy as a static site and easy to debug without bundlers.

## Core Frontend Files

### `js/config.js`

Contains global constants:

- `API_BASE`
- storage keys
- app enum values
- chart colors
- app goals like daily water and sleep defaults

Important keys:

- `TOKEN_KEY = access_token`
- `USER_KEY = user`
- `THEME_KEY = fitness_theme`

### `js/api.js`

This is the central HTTP client.

Responsibilities:

- attach `Content-Type: application/json`
- attach JWT token if available
- send API requests
- parse JSON responses
- auto-clear auth and redirect to login on `401`

It exposes grouped APIs:

- `authAPI`
- `profileAPI`
- `dashboardAPI`
- `recommendAPI`
- `activityAPI`
- `foodAPI`
- `workoutAPI`
- `trainerAPI`
- `doctorAPI`
- `aiAPI`
- `reminderAPI`
- `progressAPI`
- `exportAPI`

### `js/auth-guard.js`

Runs on protected pages.

If no token exists in local storage, it redirects the user to `index.html`.

### `js/utils.js`

Shared helper functions:

- date formatting
- time formatting
- greeting logic
- email validation
- password strength calculation
- BMI helpers
- numeric formatting
- simple DOM helpers
- loading state helper
- field error helper
- debounce helper
- enum label formatting

### `js/toast.js`

Displays toast notifications for success, warning, and error states.

### `js/dark-mode.js`

Applies and toggles the app theme using local storage.

### `js/sidebar.js`

Shared protected-page behavior:

- sidebar toggle
- overlay close
- logout button
- inject current user info into sidebar

## Page-by-Page Documentation

### `index.html`

Purpose:

- login screen

Uses:

- `config.js`
- `utils.js`
- `toast.js`
- `api.js`
- `dark-mode.js`
- `auth.js`

Features:

- email/password login
- password visibility toggle
- remember me checkbox UI
- login validation
- redirect to dashboard after success

### `register.html`

Purpose:

- create new account

Uses:

- same auth stack as login page

Features:

- full name, email, password, confirm password
- password strength indicator
- field validation
- redirect to login after successful signup

### `dashboard.html`

Purpose:

- main user hub

Features:

- greeting with user name
- BMI score
- calorie intake progress
- workout streak
- water progress
- weekly calorie chart
- motivational quote
- quick log shortcuts

Libraries:

- Chart.js via CDN

Main script:

- `js/dashboard.js`

### `profile.html`

Purpose:

- collect and update health profile

Typical data:

- age
- gender
- height
- weight
- activity level
- sleep hours
- food habits
- fitness goal

Features:

- profile save
- BMI calculation support
- profile-driven recommendation refresh from backend

Main script:

- `js/profile.js`

### `tracker.html`

Purpose:

- log daily activities

Tracking modes:

- meal
- workout
- water
- sleep

Features:

- tab-based activity logging
- send logs to backend
- show daily tracking activity

Main script:

- `js/tracker.js`

### `recommendations.html`

Purpose:

- display diet and workout recommendations generated from the user profile

Features:

- meal plan cards
- workout plan cards
- calorie goal
- tips and profile-dependent recommendations

Main script:

- `js/recommendations.js`

### `workout.html`

Purpose:

- show daily and weekly workout plans

Current upgraded features:

- goal-based weekly plan summary
- active days count
- weekly duration total
- weekly estimated calories burned
- today’s exercises
- timer support
- posture guidance for each workout
- posture illustration beside each task
- completion logging to backend

Main script:

- `js/workout.js`

### `food-scanner.html`

Purpose:

- search or scan foods and log intake

Current upgraded features:

- text search
- barcode scan
- quantity in grams
- meal time selection
- estimated calories for the selected intake
- macro breakdown
- meal feedback
- mark as eaten flow

Main script:

- `js/food-scanner.js`

Important note:

This page currently supports food search and barcode-based detection. It does not yet support camera image recognition of real food photos.

### `progress.html`

Purpose:

- visualize fitness progress over time

Features:

- weekly and monthly charting
- charts for trends
- progress comparison data

Main script:

- `js/progress.js`

### `trainers.html`

Purpose:

- display trainer directory

Features:

- list trainers from backend
- location filter
- contact actions

Main script:

- `js/trainers.js`

### `doctors.html`

Purpose:

- display doctor directory

Features:

- list doctors from backend
- specialization filter
- contact options

Main script:

- `js/doctors.js`

### `ai-planner.html`

Purpose:

- AI assistant chat page

Features:

- text chat
- voice input using browser speech recognition
- speech output using speech synthesis
- typing indicator

Main script:

- `js/ai-planner.js`

### `reminders.html`

Purpose:

- reminder management

Features:

- add reminder
- list reminders
- delete reminder
- notification-oriented UI

Main script:

- `js/reminders.js`

## JavaScript Modules Detail

### `auth.js`

Handles:

- login form submit
- register form submit
- validation
- local storage token/user save
- redirect logic

### `dashboard.js`

Handles:

- sidebar behavior
- dashboard API fetch
- stat rendering
- quote rendering
- chart rendering

### `profile.js`

Handles:

- profile form binding
- live calculations
- save request
- redirect on success

### `tracker.js`

Handles:

- activity tabs
- activity form submission
- daily logs rendering

### `recommendations.js`

Handles:

- recommendation fetch
- recommendation card rendering
- empty/error state flow

### `workout.js`

Handles:

- weekly plan rendering
- daily exercise rendering
- timer controls
- completion tracking
- workout logging

### `food-scanner.js`

Handles:

- debounced search
- barcode lookup
- per-quantity calorie calculation
- meal feedback rendering
- intake logging

### `progress.js`

Handles:

- progress API fetch
- chart drawing
- period switching

### `trainers.js`

Handles:

- trainer listing
- filtering
- card rendering

### `doctors.js`

Handles:

- doctor listing
- specialization filtering
- card rendering

### `reminders.js`

Handles:

- reminder CRUD UI
- reminders list refresh

### `ai-planner.js`

Handles:

- AI chat send
- voice input/output
- chat bubbles
- markdown-like formatting

## CSS Files Detail

### `css/main.css`

Global design tokens and core layout rules.

Contains:

- color system
- typography setup
- spacing variables
- shared layout utilities

### `css/components.css`

Reusable UI components:

- cards
- buttons
- badges
- progress bars
- avatar styles
- nav/link styles

### `css/forms.css`

Form-specific styling:

- inputs
- labels
- validation feedback
- password fields
- checkboxes

### `css/auth.css`

Authentication page styles:

- auth layout
- hero card
- auth-specific spacing

### `css/dashboard.css`

Main application layout:

- sidebar
- topbar
- cards
- content grids

### `css/charts.css`

Styles for chart containers and chart sections.

### `css/dark-mode.css`

Dark theme token and component overrides.

### `css/animations.css`

Animation classes such as:

- fade in
- staggered reveal
- hover lift

## Auth Flow

### Login

1. user enters email and password
2. frontend validates fields
3. frontend posts to `/login`
4. backend returns `access_token` and `user`
5. frontend stores both in local storage
6. frontend redirects to `dashboard.html`

### Protected Pages

Protected pages load `auth-guard.js`.

If token is missing:

- redirect to `index.html`

### Unauthorized API Response

If an API returns `401`:

- remove token from local storage
- remove user from local storage
- redirect to login page

## Data and Storage

Frontend stores:

- `access_token`
- `user`
- `fitness_theme`

These are stored in browser `localStorage`.

## API Integration Summary

The frontend uses the backend for:

- auth
- profile
- dashboard
- recommendations
- activity logging
- food search
- barcode scan
- workout plans
- workout timer logs
- trainers
- doctors
- AI chat
- reminders
- progress
- PDF export endpoint placeholder

## External Dependencies

### Chart.js

Used on:

- dashboard
- progress

### Web Speech API

Used on:

- AI planner page for voice input/output

### Browser Local Storage

Used for:

- JWT token
- user info
- theme preference

## Deployment

### Static Frontend Deployment

Frontend can be deployed as a static site.

Render config file:

- `render.yaml`

Current Render blueprint setup is for:

- static runtime via Render web service with static runtime

### Important Deployment Requirement

For production deployment, `js/config.js` must point to a real backend URL.

Current value:

`https://fitlife-backend-rrd9.onrender.com/api`

If backend URL changes, update this file and redeploy.

## Current State

Current frontend state is roughly:

- all major pages built
- all main JS modules built
- dark mode available
- API integration connected
- Render config added
- food intake flow improved
- workout plan flow improved

## Known Gaps

The following areas are still incomplete or light:

- no camera/image-based food recognition yet
- PDF export frontend wiring is still missing
- end-to-end production testing is still needed
- accessibility pass can be improved
- some files still show encoding artifacts in comments or text
- frontend currently depends on hardcoded API base config rather than environment-driven runtime config

## Recommended Next Improvements

### High Priority

- add runtime environment-based API configuration
- complete PDF export flow
- test all pages against deployed backend
- improve production error handling

### Medium Priority

- add camera-based food image recognition
- add image assets for exercise posture instead of SVG stick figures
- improve accessibility labels and keyboard flow
- add loading skeletons

### Nice to Have

- PWA support
- offline support for static content
- better analytics and intake history views
- richer reminders and notifications UX

## Useful Files for Further Work

- [AGENT.md](C:/Users/rajus/fitlife/frontend/AGENT.md)
- [FRONTEND_PLAN.md](C:/Users/rajus/fitlife/frontend/FRONTEND_PLAN.md)
- [frontend_api_contract.md](C:/Users/rajus/fitlife/frontend/frontend_api_contract.md)
- [PROJECT_STATUS.md](C:/Users/rajus/fitlife/frontend/PROJECT_STATUS.md)
- [render.yaml](C:/Users/rajus/fitlife/frontend/render.yaml)

## Summary

FitLife frontend is a multi-page vanilla JavaScript health application with:

- strong page separation
- centralized API handling
- local storage auth
- protected routes
- chart-based dashboard and progress pages
- improved food intake tracking
- improved weekly workout guidance
- static-site-friendly deployment

This documentation file is meant to be the single detailed frontend reference for understanding the current implementation quickly.
