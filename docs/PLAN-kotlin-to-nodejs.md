# PLAN: Kotlin to Node.js Web App Migration

## 1. Overview
The goal of this task is to transition the project from a hybrid Mobile/Web architecture into a unified, responsive Node.js-compatible website. To achieve this:
- We will group and isolate all previous Kotlin (Android mobile app) files, Gradle settings, and unused prototype configurations into a dedicated subdirectory named `kotlin-app` to clean up the root workspace.
- We will ensure the main platform interface runs fully in the browser via the Next.js web application (`company-dashboard`), which runs on Node.js.
- We will preserve the existing database schemas, relations, and Edge Functions in Supabase, calling them directly from the web client.
- The web app will be verified to ensure it is responsive and compatible across different device sizes (mobile, tablet, desktop).

## 2. Project Type
**WEB** (Next.js Application running on Node.js runtime).

## 3. Success Criteria
1. **Root Workspace Cleaned**: All Kotlin, Android, and Gradle configurations are relocated to the `kotlin-app` directory. Unused files in the root are moved or cleaned up.
2. **Browser Native & Device Compatible**: The web application in `company-dashboard` runs in the browser and is responsive (mobile-friendly) across all device screens.
3. **Database & Edge Functions Unchanged**: All existing Supabase migrations, schemas, relationships, and edge functions are invoked directly from the frontend client without regressions.
4. **Builds & Verifications Pass**: The Next.js application builds successfully under Node.js, and verification scripts (`verify_all.py` / `checklist.py`) report clean runs.

## 4. Tech Stack
- **Runtime**: Node.js (v20+)
- **Frontend Framework**: Next.js (v16.2.6) with React (v19)
- **Database / Backend**: Supabase (PostgreSQL with Row-Level Security, Edge Functions)
- **Styling**: Tailwind CSS (v4) for responsive UI
- **Deployment & Package Management**: npm

---

## 5. File Structure After Migration
```text
/home/mohal665544/pr1
├── kotlin-app/                 # Contains all relocated Kotlin/Android/Gradle files
│   ├── app/                    # Relocated Kotlin Android App source
│   ├── build.gradle.kts        # Relocated Gradle build config
│   ├── settings.gradle.kts     # Relocated Gradle settings config
│   ├── gradle.properties       # Relocated Gradle properties
│   └── gradle/                 # Relocated Gradle wrapper files
├── company-dashboard/          # Core web application (Node.js/Next.js)
│   ├── app/                    # Next.js App Router (Public Marketplace & SaaS Dashboard)
│   ├── components/             # Reusable UI components
│   └── package.json            # Node.js project configuration
├── supabase/                   # Supabase database configurations and functions
│   ├── functions/              # Deno Edge Functions
│   └── migrations/             # PostgreSQL migrations
├── docs/                       # Specifications and planning documentation
│   └── PLAN-kotlin-to-nodejs.md # This project plan
├── PLANNER.md                  # Canonical Platform blueprint
└── TASKS_DONE.md               # Architectural accomplishments tracker
```

---

## 6. Task Breakdown

### Task 1: Kotlin Project Isolation & Cleanup
- **Agent**: `devops-engineer`
- **Skills**: `bash-linux`
- **Priority**: P0
- **Dependencies**: None
- **Description**: Create the target directory `kotlin-app` in the root, and move all files/folders related to Android, Kotlin, and Gradle wrapper configs into it.
- **INPUT**: Root files (`app/`, `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`, `gradle/`).
- **OUTPUT**: Cleaned root workspace; all targeted files reside in `kotlin-app/`.
- **VERIFY**: Run `ls -la` to verify root is free of Gradle/Kotlin files, and `ls -la kotlin-app/` to verify files are present.

### Task 2: Next.js Responsive Audit & Enhancement
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `react-best-practices`
- **Priority**: P1
- **Dependencies**: Task 1
- **Description**: Verify the existing `company-dashboard` application compiles. Inspect the public marketplace interface inside `company-dashboard/app/(public-platform)/marketplace/page.tsx` and ensure responsive classes (e.g. Tailwind `sm:`, `md:`, `lg:`) are correctly applied to support various screen sizes.
- **INPUT**: `company-dashboard/` source files.
- **OUTPUT**: Fully responsive marketplace pages.
- **VERIFY**: Run `npm run build` within `company-dashboard/` to ensure compile-time validity. Run a local development server `npm run dev` and resize the viewport to confirm layout responsiveness.

### Task 3: Database & Supabase Integration Verification
- **Agent**: `database-architect`
- **Skills**: `database-design`
- **Priority**: P1
- **Dependencies**: Task 1
- **Description**: Verify that the Supabase client inside `company-dashboard` connects and interacts correctly with the tables, views, and relationships defined in the `supabase/migrations/` folders. Ensure Deno Edge Functions are called correctly via the JS client.
- **INPUT**: `company-dashboard/lib/supabase.ts` (or equivalent) and `.env.local` configs.
- **OUTPUT**: Valid client connections with correct schema types.
- **VERIFY**: Run local tests / query check to verify data flows correctly to/from Supabase tables without exposing credentials.

---

## 7. Verification Plan (Phase X)

To complete this migration, the following automated and manual checks must pass:

### Automated Tests
1. **Compilation Check**:
   ```bash
   cd company-dashboard && npm run build
   ```
2. **Security Scan**:
   ```bash
   python .agent/skills/vulnerability-scanner/scripts/security_scan.py .
   ```
3. **UX & Accessibility Audit**:
   ```bash
   python .agent/skills/frontend-design/scripts/ux_audit.py .
   ```
4. **Comprehensive System Verification**:
   Ensure the local dev server is running, then execute:
   ```bash
   python .agent/scripts/verify_all.py company-dashboard/ --url http://localhost:3000
   ```

### Manual Verification
- Deploy/start the development server: `npm run dev` inside `company-dashboard`.
- Access `http://localhost:3000/marketplace` in the browser.
- Open Developer Tools (F12) and toggle device toolbars to check layout rendering on mobile (iPhone, Android device profiles) and tablet dimensions.
- Perform search actions, view listings, and verify that the data loads from Supabase correctly.

---

## ✅ PHASE X COMPLETE
- Lint: [ ] Pending
- Security: [ ] Pending
- Build: [ ] Pending
- Date: [Pending Approval]
