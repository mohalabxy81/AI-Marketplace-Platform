# Spec 49 — STEP AU.3: Growth Autonomy

> **Phase**: AU.3 | **Scope**: Growth · Marketing · Acquisition · SEO · Campaign Agents

---

## 1. Growth Agent

**Mission**: Drive platform growth through coordinated acquisition, activation, and retention loops, operating as a fully autonomous growth machine.

**Capabilities**:
- Growth Loop Identification (viral, paid, content, PLG loops)
- Funnel Bottleneck Detection (drop-off stage analysis)
- Growth Experiment Generation (hypothesis → test plan)
- Cross-agent Coordination (marketing, SEO, campaign)
- North Star Metric Tracking (CAGR, DAU/MAU, Time-to-Value)

**Growth Loop Model**:
```
[New User Acquired] → [Activated (hits Aha! moment)] → [Engaged (DAU)]
          ↑                                                      │
          └────────[Refers / Shares / Invites] ←────────────────┘
                          (Viral Loop)
Growth Rate = new_users_organic + new_users_paid + new_users_viral
Viral Coefficient K = invitations_sent_per_user × conversion_rate
Target: K > 0.3 (meaningful viral growth)
```

---

## 2. Marketing Agent

**Mission**: Autonomously generate, distribute, and optimize marketing content across channels.

**Capabilities**:
- Content Generation (blog posts, case studies, social copy)
- Audience Segmentation (behavioral + firmographic)
- Channel Mix Optimization (spend allocation across channels)
- Message Personalization (segment-specific messaging)
- Campaign Performance Analysis

**Content Generation Pipeline**:
```
[Topic Brief] → [LLM Draft] → [SEO Optimization] → [Brand Voice Check]
     → [Human Review Gate (AI_RECOMMENDED)] → [Publish]
```

**Decision Boundary**:
- Generating draft content: `AUTONOMOUS_EXECUTION`
- Publishing to owned channels: `AGENT_APPROVED`
- Paid media spend >$1K: `AI_RECOMMENDED` (Marketing lead)
- New channel launch: `HUMAN_DECISION`

---

## 3. Acquisition Agent

**Mission**: Optimize new customer acquisition across all channels through data-driven targeting and conversion optimization.

**Capabilities**:
- ICP (Ideal Customer Profile) Refinement (updated from closed-won data)
- Lead Scoring (behavioral + firmographic signals)
- Acquisition Channel ROI Analysis
- Landing Page Conversion Optimization
- Trial Activation Sequence Management

**ICP Model**:
```typescript
interface IdealCustomerProfile {
  company_size: { min: number; max: number };
  industry_verticals: string[];
  tech_stack_signals: string[];       // detected from web scraping
  growth_stage: CompanyStage[];
  budget_signals: BudgetRange;
  ai_maturity_level: 1 | 2 | 3 | 4;
  buying_committee_size: number;
}
```

**Lead Score Formula**:
```
LeadScore = (
  0.25 × icp_fit_score +
  0.20 × intent_signal_score +
  0.20 × engagement_score +
  0.20 × company_growth_score +
  0.15 × tech_compatibility_score
)
MQL Threshold: LeadScore > 0.65
SQL Threshold: LeadScore > 0.80
```

---

## 4. SEO Agent

**Mission**: Drive organic traffic growth through autonomous SEO strategy, content optimization, and technical SEO maintenance.

**Capabilities**:
- Keyword Opportunity Discovery (gap analysis vs competitors)
- Content Brief Generation (for target keywords)
- Technical SEO Audit (crawl errors, Core Web Vitals, schema)
- Backlink Opportunity Identification
- Search Performance Reporting (impressions, CTR, position tracking)

**SEO Priority Matrix**:
```
Priority = (monthly_search_volume × difficulty_inverse × relevance_score) / content_effort_estimate
Where difficulty_inverse = 1 - keyword_difficulty_score
```

**Autonomous Actions**:
- `AUTONOMOUS_EXECUTION`: Generate meta descriptions, fix broken links, add schema markup
- `AGENT_APPROVED`: Update page titles, reorganize URL structure
- `AI_RECOMMENDED`: Major content strategy pivots, new content pillars

---

## 5. Campaign Agent

**Mission**: Plan, execute, and optimize marketing campaigns autonomously from brief to post-campaign analysis.

**Campaign Lifecycle**:
```
[Campaign Brief] → [Audience Selection] → [Creative Generation]
     → [Channel Orchestration] → [Performance Monitoring]
     → [Optimization Loop] → [Post-Campaign Report]
```

**Campaign Types Supported**:
- Email sequences (drip, nurture, re-engagement)
- In-app notification campaigns
- Product updates and release announcements
- Seasonal promotions
- Event-driven campaigns (user behavior triggered)

**Decision Boundary**:
- Launching email sequence to <500 users: `AGENT_APPROVED`
- Launching campaign to full database: `AI_RECOMMENDED`
- Campaign with discount/offer: `AI_RECOMMENDED` (CFO sign-off if >5% discount)

---

## 6. Funnel Optimization Engine

**Funnel Stages**:
```
Awareness → Interest → Trial → Activation → Purchase → Expansion → Advocacy
```

**Bottleneck Detection Algorithm**:
```sql
-- Detect funnel drop-offs exceeding 2 standard deviations from baseline
SELECT
  funnel_stage,
  conversion_rate,
  baseline_avg,
  (baseline_avg - conversion_rate) / baseline_std AS z_score
FROM funnel_metrics
WHERE z_score > 2.0
ORDER BY z_score DESC;
```

**Automated Responses by Stage**:
| Stage Drop-off | Agent Response |
|---------------|---------------|
| Awareness→Interest | SEO Agent: refresh landing page content |
| Interest→Trial | Campaign Agent: retargeting sequence |
| Trial→Activation | Onboarding Agent: personalized activation nudge |
| Activation→Purchase | Subscription Agent: upgrade nudge |
| Purchase→Expansion | Expansion Agent: whitespace analysis |

---

## 7. Growth KPIs

| Metric | Formula | Target |
|--------|---------|--------|
| Organic Traffic Growth | `MoM% Δ organic_sessions` | >10%/mo |
| Trial Start Rate | `trial_starts / site_visitors` | >3% |
| Trial-to-Paid Conversion | `paid_signups / trial_starts` | >25% |
| Activation Rate | `aha_moment_reached / signups` | >60% |
| Viral Coefficient | `invites_sent/user × conversion_rate` | >0.30 |
| CAC (Blended) | `total_acq_cost / new_customers` | <$800 |
| CAC Payback Period | `CAC / (ARPU × GM)` | <12 months |
| Content-to-Lead Rate | `leads / content_sessions` | >0.5% |
