#!/usr/bin/env python3
"""
Comprehensive User Simulation Test
Tests every page of the AI Marketplace Platform like a real user.
"""

import subprocess
import json
import sys
import time
from datetime import datetime

BASE_URL = "http://localhost:3000"
RESULTS = []

# All pages defined in the Next.js build output
ALL_PAGES = [
    # Public / Unauthenticated
    ("/", "Root - should redirect to login or marketplace"),
    ("/login", "Login page"),
    ("/marketplace", "Public marketplace homepage"),
    ("/marketplace/search", "Marketplace search page"),

    # Tenant Dashboard
    ("/overview", "Tenant overview KPIs"),
    ("/dashboard", "Dashboard"),
    ("/listings", "Listings management"),
    ("/listings/create", "Create new listing"),
    ("/listings/drafts", "Draft listings"),
    ("/analytics", "Analytics overview"),
    ("/analytics/behavior", "Behavior analytics"),
    ("/analytics/listings", "Listings analytics"),
    ("/billing", "Billing & subscriptions"),
    ("/messages", "Messages / chat"),
    ("/notifications", "Notifications"),
    ("/team", "Team management"),
    ("/settings", "Workspace settings"),
    ("/ui-customization", "UI customization / branding"),
    ("/moderation", "Moderation queue"),
    ("/activity", "Activity log"),
    ("/tenants", "Tenants list"),

    # Autonomous
    ("/autonomous/executive", "Autonomous executive copilot"),
    ("/autonomous/marketplace", "Autonomous marketplace optimizer"),
    ("/autonomous/revenue", "Autonomous revenue"),
    ("/autonomous/operations", "Autonomous operations"),
    ("/autonomous/risk", "Autonomous risk"),
    ("/autonomous/growth", "Autonomous growth"),
    ("/autonomous/support", "Autonomous support"),
    ("/autonomous/board", "Autonomous board"),
    ("/autonomous/autonomy", "Autonomy control"),
    ("/autonomous/knowledge", "Knowledge base"),

    # AI Control
    ("/ai-control", "AI control center"),

    # Super Admin
    ("/super-admin", "Super admin root"),
    ("/super-admin/overview", "Super admin overview"),
    ("/super-admin/tenants", "Tenant management"),
    ("/super-admin/moderation", "Moderation center"),
    ("/super-admin/analytics", "Platform analytics"),
    ("/super-admin/billing", "Platform billing"),
    ("/super-admin/ai-control", "AI model control"),
    ("/super-admin/feature-flags", "Feature flags"),
    ("/super-admin/audit", "Audit logs"),
    ("/super-admin/settings", "Super admin settings"),
    ("/super-admin/support", "Super admin support"),

    # API Routes
    ("/api/platform/ai/config", "API: AI config endpoint"),
    ("/api/platform/moderation/queue", "API: Moderation queue endpoint"),
    ("/api/platform/snapshot", "API: Snapshot endpoint"),
]

def test_page(path, description):
    url = f"{BASE_URL}{path}"
    try:
        result = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w",
             "%{http_code}|%{time_total}|%{redirect_url}",
             "-L", "--max-redirs", "3",
             "--connect-timeout", "5",
             url],
            capture_output=True, text=True, timeout=15
        )
        parts = result.stdout.strip().split("|")
        status = int(parts[0]) if parts[0] else 0
        latency = float(parts[1]) if len(parts) > 1 else 0
        redirect = parts[2] if len(parts) > 2 else ""

        # Determine result
        if status in (200, 307, 308):
            icon = "✅"
            verdict = "OK"
        elif status in (301, 302):
            icon = "↩️ "
            verdict = f"REDIRECT → {redirect}"
        elif status == 401:
            icon = "🔐"
            verdict = "Auth required (expected for protected pages)"
        elif status == 404:
            icon = "❌"
            verdict = "NOT FOUND"
        elif status == 500:
            icon = "💥"
            verdict = "SERVER ERROR"
        elif status == 0:
            icon = "⚠️ "
            verdict = "CONNECTION FAILED"
        else:
            icon = "⚠️ "
            verdict = f"HTTP {status}"

        return {
            "path": path,
            "description": description,
            "status": status,
            "latency_ms": round(latency * 1000),
            "verdict": verdict,
            "icon": icon,
        }
    except Exception as e:
        return {
            "path": path,
            "description": description,
            "status": 0,
            "latency_ms": 0,
            "verdict": f"ERROR: {e}",
            "icon": "💥",
        }

def run_all_tests():
    print("\n" + "="*70)
    print("  🌐 AI MARKETPLACE PLATFORM — FULL USER SIMULATION TEST")
    print(f"  📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  🔗 Base URL: {BASE_URL}")
    print("="*70)

    passed = 0
    failed = 0
    auth_required = 0
    redirects = 0

    for path, description in ALL_PAGES:
        r = test_page(path, description)
        RESULTS.append(r)

        status_str = f"[{r['status']}]" if r['status'] else "[---]"
        latency_str = f"{r['latency_ms']}ms"
        print(f"  {r['icon']}  {status_str:7} {latency_str:8}  {path:40}  {description[:35]}")

        if r['status'] in (200, 307, 308):
            passed += 1
        elif r['status'] in (301, 302, 401):
            if r['status'] == 401:
                auth_required += 1
            else:
                redirects += 1
        elif r['status'] == 404:
            failed += 1
        elif r['status'] == 500:
            failed += 1

    # Summary
    total = len(RESULTS)
    print("\n" + "="*70)
    print("  📊 SUMMARY")
    print("="*70)
    print(f"  Total Pages Tested : {total}")
    print(f"  ✅ OK (200/307/308) : {passed}")
    print(f"  🔐 Auth Required   : {auth_required}")
    print(f"  ↩️  Redirects       : {redirects}")
    print(f"  ❌ Failed (404/500): {failed}")
    print("="*70)

    # Find failures
    failures = [r for r in RESULTS if r['status'] in (404, 500, 0)]
    if failures:
        print("\n  ❌ FAILURES REQUIRING ATTENTION:")
        for r in failures:
            print(f"     {r['icon']}  {r['path']:40} → {r['verdict']}")
    else:
        print("\n  ✅ All pages reachable — no 404 or 500 errors found!")

    # Performance check
    slow = [r for r in RESULTS if r['latency_ms'] > 2000 and r['status'] != 0]
    if slow:
        print("\n  ⚠️  SLOW PAGES (>2s response):")
        for r in slow:
            print(f"     🐢  {r['path']:40} → {r['latency_ms']}ms")
    else:
        print("  ✅ All pages responded within acceptable latency!")

    print("\n" + "="*70)

    # Save JSON report
    with open("test_report.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "total": total,
            "passed": passed,
            "auth_required": auth_required,
            "redirects": redirects,
            "failed": failed,
            "results": RESULTS
        }, f, indent=2)
    print("  📄 Full report saved to: test_report.json")
    print("="*70 + "\n")

    return failed == 0

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
