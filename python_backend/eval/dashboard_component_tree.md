# Agent Health Dashboard — Component Tree

## React Component Hierarchy

```
AgentHealthPage (route: /admin/agent-health)
├── RootUserGuard                          # Auth check — redirects non-root users
├── WindowSelector                         # 24h / 7d / 30d toggle (shared state)
│
├── HealthOverviewBar                      # Section 1: KPI cards row
│   ├── KPICard (Success Rate)
│   ├── KPICard (Confirm Accept Rate)
│   ├── KPICard (Avg Latency)
│   ├── KPICard (Follow-Up Rate)
│   ├── KPICard (Error Rate)
│   └── KPICard (Cost / Interaction)
│
├── MiddlePanel (2-column grid)
│   ├── RouterPerformancePanel             # Section 2: Router metrics
│   │   ├── TierDistributionChart          # Pie/donut chart
│   │   ├── RouterAccuracyBar             # Bar chart per tier
│   │   ├── CostTrendLine                 # Line chart by tier
│   │   └── MisrouteTable                 # Last 20 misroutes
│   │
│   └── ToolPerformancePanel              # Section 3: Tool metrics
│       ├── ToolHeatmap                   # Tools × metrics grid
│       ├── EditedParamsRanking           # Top 5 most-edited params
│       └── ToolTrendSparklines           # Per-tool success sparklines
│
└── SessionIntelligencePanel              # Section 4: Session data
    ├── InteractionTimeline               # Last 50 interactions
    │   └── InteractionDetail (expandable) # Full trace on click
    ├── RetryDetector                     # Highlighted retry pairs
    ├── AbandonmentList                   # Abandoned sessions
    └── ReversionDetector                 # Manual action after Proe attempt
```

## Data Flow

```
WindowSelector (state: window)
    ↓ prop
HealthOverviewBar → useQuery('/api/v1/admin/agent-metrics?window=...')
RouterPerformancePanel → useQuery('/api/v1/admin/router-metrics?window=...')
ToolPerformancePanel → useQuery('/api/v1/admin/tool-heatmap?window=...')
SessionIntelligencePanel → useQuery('/api/v1/admin/agent-interactions?limit=50')
```

All data fetched via TanStack Query with 60-second `refetchInterval`.

## Design System

- Background: `bg-pro-dark` / `bg-gray-900`
- Cards: `bg-gray-800/50 border-gray-700/50 rounded-xl`
- Accent: `mint` (`#4ADE80`) for positive metrics, `text-red-400` for alerts
- KPI values: `text-2xl font-mono text-white`
- Labels: `text-xs text-gray-400 uppercase tracking-wider`
- Heatmap colors: green (`#4ADE80`) → yellow (`#FBBF24`) → red (`#F87171`)
- Charts: Use recharts (already in project dependencies)
