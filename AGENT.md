# 🤖 Agent Context — FitLife Frontend

> This file helps AI coding assistants quickly understand the project state and locate key documents.

## Project Overview

**FitLife** is an AI-Based Healthy Diet & Fitness Management System.  
This repo contains the **frontend** — built with vanilla HTML5, CSS3, and JavaScript (ES6+). No build tools.

- **Backend:** Flask API at `http://localhost:5000/api`
- **Auth:** JWT stored in `localStorage` (`access_token`, `user`)
- **Pages:** 13 HTML pages (2 public + 11 protected)
- **Design:** Custom CSS design system with dark mode, Sora + DM Mono fonts

## Key Documents

| Document | Path | Purpose |
|---|---|---|
| **Project Status Report (Detailed)** | `C:\Users\rajus\.gemini\antigravity\brain\853caaf8-1996-432d-88c0-bc96b22fa74d\FitLife_Project_Status.md` | **Most comprehensive status document.** Every file, model, controller, endpoint, JS module, CSS file documented with clickable links. Covers what's done (85%) and what's pending (testing, security, deployment). Created March 31, 2026. |
| **Backend AGENT.md** | `c:\Users\rajus\fitlife\backend\AGENT.md` | Full project context: structure, tech stack, all 22 endpoints, conversation history, current status |
| **Project Status (Local)** | `PROJECT_STATUS.md` | Local copy of status breakdown |
| **Frontend Plan** | `FRONTEND_PLAN.md` | Full architecture plan — page layouts, JS module design, CSS architecture, component patterns |
| **API Contract** | `frontend_api_contract.md` | Backend API contract (source of truth for all endpoints, request/response schemas) |
| **Blueprint** | `AI_FitnessApp_Blueprint.md` | Full project blueprint covering both backend and frontend |

## Current State (as of March 31, 2026)

- **~90% complete** — All 13 HTML pages, 19/20 JS modules, and 8 CSS files are built
- **Missing:** `js/pdf-export.js` (PDF health report export)
- **Not started:** Phase 6 polish (skeleton loaders, enhanced animations, accessibility, cross-browser testing)
- **Not tested:** End-to-end integration with live Flask backend

## Architecture Quick Reference

```
frontend/
├── index.html, register.html          # Public auth pages
├── dashboard.html                      # Main hub (protected)
├── profile.html                        # 3-step health profile form
├── tracker.html                        # Meal/workout/water/sleep logging
├── recommendations.html                # AI diet + workout plans
├── workout.html                        # Exercise timer
├── food-scanner.html                   # Food search + barcode
├── progress.html                       # Charts + trends
├── trainers.html, doctors.html         # Professional listings
├── ai-planner.html                     # AI voice chat
├── reminders.html                      # Reminder CRUD + notifications
├── css/ (8 files)                      # Design system
├── js/ (19 files)                      # Page logic + core modules
└── docs: FRONTEND_PLAN.md, frontend_api_contract.md, PROJECT_STATUS.md
```

## API Contract Decisions (Resolved)

- Token key: `access_token` (not `fitness_access_token`)
- Diet plan format: structured `{ meal, kcal }` objects
- Workout plan format: structured `{ name, sets, reps, duration_min }` objects
- 401 handling: targeted `removeItem()` (preserves theme preference)

## CDN Dependencies

- Chart.js 4.4.0 (dashboard + progress charts)
- jsPDF 2.5.1 + html2canvas 1.4.1 (PDF export — not yet wired)
- Google Fonts (Sora + DM Mono)
