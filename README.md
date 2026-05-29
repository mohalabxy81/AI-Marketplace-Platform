# AI-Native Multi-Tenant Marketplace Infrastructure Platform (pr1)

Welcome to the central repository for the AI-Native Multi-Tenant Marketplace Infrastructure Platform. This repository is structured as a multi-project workspace combining robust enterprise core systems with a modern administrative control interface.

## 🏛️ Platform Architecture & Constitution

For the unified architecture design, system ownership rules, tenant isolation strategies, event taxonomy, and long-term scaling guidelines, refer to the:
👉 **[PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md)** (The Platform Constitution)

---

## 📂 Workspace Structure

This project consists of the following components:

```
/home/mohal665544/pr1
├── app/                  # Enterprise Kotlin core backend services & scheduling systems
├── company-dashboard/    # Next.js web application for tenant and platform administrative dashboards
├── PLANNER.md            # Canonical Master Platform Blueprint and constitution
├── TASKS_DONE.md         # Living log tracking architectural accomplishments
└── .agent/               # Antigravity Kit agent rules, tools, validation scripts, and skills
```

* **[app/](file:///home/mohal665544/pr1/app)**: Built using Kotlin, this serves as the high-throughput backend engine. It manages database schemas, background workers, and scheduling.
* **[company-dashboard/](file:///home/mohal665544/pr1/company-dashboard)**: Built using Next.js, this provides the dashboard user interface for super admins and tenants to manage operations, view analytics, and adjust budgets.
* **[.agent/](file:///home/mohal665544/pr1/.agent)**: Custom workspace agents, workflows (like `/brainstorm` and `/ui-ux-pro-max`), and validation scripts used to enforce code standards.

---

## 🚀 Getting Started

### 1. Developer Guidelines
Please review the workspace rules defined in:
* **[GEMINI.md](file:///home/mohal665544/pr1/.agent/rules/GEMINI.md)** - Workspace rules and mandatory protocols.
* **[PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md)** - Domain ownership guidelines and architecture laws.

### 2. Running Local Verifications
Before committing code or deploying features, run the automated verification checklists:
```bash
# Run core audits (Security, Lint, Schema, UX)
python .agent/scripts/checklist.py .

# Run full suite verification (Lighthouse, Playwright E2E, i18n, Bundle Size)
python .agent/scripts/verify_all.py . --url http://localhost:3000
```
