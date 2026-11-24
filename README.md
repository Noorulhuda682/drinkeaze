# Drinkeaze — Karachi Cloud Kitchen & Ordering Platform

A full-stack e-commerce storefront and admin platform built for **Drinkeaze** in Karachi—serving layered fruit parfaits, cold-pressed juices, and refreshing drinks with live inventory-backed ordering.

---

## Architecture Overview

This repository is organized as a clean full-stack monorepo with independent frontend and backend applications, path-filtered GitHub Actions CI/CD, and free-tier cloud hosting:

```text
drinkeaze/
├── .github/
│   └── workflows/
│       ├── ci.yml              # TypeScript & build checks for frontend and backend
│       ├── deploy-frontend.yml # Path-filtered Vercel deployment (frontend/**)
│       └── deploy-backend.yml  # Prisma migrations & Render deploy hook (backend/**)
├── frontend/                   # Next.js 14 App Router storefront, cart & admin UI
├── backend/                    # NestJS + Prisma ORM + PostgreSQL REST/API service
├── .gitignore                  # Monorepo ignore rules for build outputs, deps & secrets
└── README.md
```

### Tech Stack

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React, TypeScript, Tailwind CSS | Storefront menu, hero slider, cart & quantity controls, checkout, and admin views |
| **API Proxy** | Next.js dynamic route handler (`/api/backend/[...path]`) | Forwards client/SSR requests cleanly to the NestJS backend |
| **Backend** | NestJS, Prisma Client, TypeScript, JWT Auth (`AdminJwtGuard`) | Catalog, variants, recipe links (`ProductIngredient`), inventory stock checks, orders & admin auth |
| **Database** | PostgreSQL (`drinkeaze_db` / Neon) | Relational storage for products, variants, recipes, inventory stock, and orders |
| **CI/CD & Hosting** | GitHub Actions, Vercel, Render, Neon | Automated build/type checks, path-scoped deploys, and free cloud domains |

---

## Key Features Implemented

### 1. Storefront & Cyan-Slate Design System (`#48CAE4`)
* **Cohesive Cyan & Slate Theme**: Uses `#48CAE4` cyan accents paired with deep cyan/slate surfaces and clean cards across storefront and admin views.
* **Interactive Hero Slider (`HeroBanner.tsx`)**: Auto-cycling parfait and juice cup slides with smooth right-to-left slide transitions, pause-on-hover, previous/next navigation buttons, slide indicator dots, and vertically centered frameless typography.
* **Menu Cards, Motion, Quantity Bar & Toast (`ProductCard.tsx`)**:
  * Enlarged `#48CAE4` add-to-cart (`+`) button with springy click bounce feedback.
  * Bottom-right toast notifications when items are added, updated, or removed.
  * Live quantity stepper bar once an item is in the cart: shows a **red delete icon** on the left at quantity `1` (clicking removes the item and restores the `+` button) and `−` / `+` controls for higher quantities.

### 2. Orderability, Recipes & Inventory Pipeline
* Products and variants require active catalog status, linked `ProductIngredient` recipe items, and sufficient `Inventory` stock so customers can place real orders end to end.
* Supports Karachi delivery ordering flows alongside admin management protected by `AdminJwtGuard`.

---

## Local Development Setup

### Prerequisites
* **Node.js** (v20+ recommended)
* **pnpm** (for `frontend`) and **npm** (for `backend`)
* **PostgreSQL** running locally (or a Neon connection string)

### 1. Backend (`backend/`)
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

### 2. Frontend (`frontend/`)
```bash
cd frontend
pnpm install
pnpm exec tsc --noEmit
pnpm run dev
```

> Keep all `.env`, `.env.local`, and secret credentials out of Git. Configure environment variables locally in each app's ignored `.env` file and in your hosting platform dashboards.

---

## CI/CD & Free Hosting Setup

GitHub Actions workflows under `.github/workflows/` use path filters so frontend changes only trigger frontend deployment and backend changes only trigger backend deployment:

* **Frontend (`Vercel`)**: Deploys `frontend/` to a free `*.vercel.app` domain using `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. Point your frontend backend URL / API proxy target to your live Render backend URL.
* **Backend (`Render`)**: Deploys `backend/` to a free `*.onrender.com` service triggered via `RENDER_DEPLOY_HOOK_URL`, after running `prisma generate`, `prisma migrate deploy`, and `npm run build`.
* **Database (`Neon`)**: Provides managed PostgreSQL hosting via `DATABASE_URL`.

### Required GitHub Actions Secrets
* `VERCEL_TOKEN`
* `VERCEL_ORG_ID`
* `VERCEL_PROJECT_ID`
* `DATABASE_URL`
* `RENDER_DEPLOY_HOOK_URL`
