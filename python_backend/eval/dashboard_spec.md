# Agent Health Dashboard Spec

## Overview

A root-user-only dashboard at `/admin/agent-health` that surfaces key agent performance signals.

**Access**: Root user ONLY — not regular admins, not GC account owners. Validated via dedicated middleware that checks `is_root === true` on the authenticated user.

**Stack**: React component within existing Proesphere frontend, using the existing design system (mint accent on dark surfaces).

**Refresh**: Auto-refresh every 60 seconds, manual refresh button.

---

## Layout — 4 Sections

### Section 1: Health Overview (top bar)

Row of KPI cards with rolling 24h / 7d / 30d window selector:

| KPI Card | Metric | Alert Threshold |
|----------|--------|----------------|
| Success Rate | % interactions where tool executed successfully | <90% yellow, <80% red |
| Confirm Accept Rate | % confirmations approved (vs rejected/edited) | <70% yellow, <50% red |
| Avg Latency | P50 total response time | >3s yellow, >5s red |
| Follow-Up Rate | % interactions where agent asked clarifying question | >40% yellow (informational) |
| Error Rate | % interactions with tool execution errors | >10% yellow, >20% red |
| Cost / Interaction | Average token cost per interaction | Informational, trend only |

### Section 2: Router Performance (middle-left)

- **Pie/donut chart**: Query distribution by model tier (Specialist / Planner) — rolling 7d
- **Bar chart**: Router accuracy — per tier, % queries where model performed well
- **Line chart**: Cost per day by model tier
- **Table**: Recent misroutes — last 20 interactions where downstream model failed

### Section 3: Tool Performance (middle-right)

- **Heatmap**: Tools × Metrics (success rate / rejection rate / edit rate / error rate). Green-yellow-red.
- **Ranked list**: Top 5 most-edited parameters
- **Trend sparklines**: Per-tool success rate over last 30 days

### Section 4: Session Intelligence (bottom)

- **Timeline**: Last 50 interactions chronologically (prompt, tool, model, success, latency). Click to expand.
- **Retry detector**: Similar prompts within 60s highlighted
- **Session abandonment**: Sessions where user's last message got response but no follow-up
- **Feature reversion detector**: User asked Proe, then manually performed action in traditional UI within 5 min

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/admin/agent-metrics?window=24h\|7d\|30d` | Aggregated KPIs |
| GET | `/api/v1/admin/agent-interactions?limit=50&offset=0` | Paginated interaction log |
| GET | `/api/v1/admin/router-metrics?window=7d` | Router distribution and accuracy |
| GET | `/api/v1/admin/tool-heatmap?window=7d` | Tool × metric matrix data |

All endpoints require root user authentication.

---

## Data Source

Query the `agent_metrics` table (defined in observability_spec.md) with appropriate window filters. All aggregation done server-side in FastAPI.
