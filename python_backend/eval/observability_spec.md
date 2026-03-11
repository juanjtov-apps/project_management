# Observability Spec — Agent Pipeline Instrumentation

## Log Schemas

### Confirmation Flow Events

Emit on every confirmation lifecycle event in `chat.py:process_confirmation()`:

```python
{
    "event": "confirmation_created" | "confirmation_approved" | "confirmation_rejected" | "confirmation_expired" | "confirmation_edited",
    "tool_name": "delete_task",
    "user_id": "...",
    "company_id": "...",
    "project_id": "...",
    "conversation_id": "...",
    "timestamp": "2026-03-10T14:30:00Z",
    "edits_made": true,
    "edit_fields": ["due_date", "assignee"],
    "time_to_decision_ms": 4500
}
```

**Where to emit**: `chat.py` — after `update_confirmation_status()` call in `process_confirmation()`.

### Agent Interaction Events

Emit at the end of every `orchestrator.process_message()` call:

```python
{
    "event": "agent_interaction",
    "user_id": "...",
    "company_id": "...",
    "conversation_id": "...",
    "user_prompt": "...",
    "prompt_length": 42,
    "router_model_selected": "openai/gpt-4o-mini",
    "router_complexity_class": "specialist",
    "router_confidence": 0.88,
    "router_latency_ms": 35,
    "tools_selected": ["create_task"],
    "tool_execution_success": true,
    "total_latency_ms": 2300,
    "llm_latency_ms": 1800,
    "tool_execution_latency_ms": 450,
    "tokens_used": {"input": 1200, "output": 350},
    "conversation_turn": 3,
    "asked_followup": false,
    "followup_question_text": null,
    "error": null
}
```

**Where to emit**: `orchestrator.py` — in the `done` event yield at the end of `process_message()`.

## Derived Metrics

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Tool selection distribution | agent_interaction.tools_selected | Informational |
| Error rate per tool | agent_interaction where error != null | >10% yellow, >20% red |
| Latency P50/P95/P99 | agent_interaction.total_latency_ms | P95 >5s yellow, >10s red |
| Token efficiency | agent_interaction.tokens_used | Track trend |
| Router distribution | agent_interaction.router_complexity_class | Informational |
| Follow-up rate | agent_interaction.asked_followup | >40% yellow |
| Confirmation rejection rate | confirmation events per tool | >30% yellow, >50% red |
| Confirmation edit rate | confirmation_edited events | >20% yellow |
| Edit field frequency | confirmation_edited.edit_fields | Rank by frequency |
| Immediate retry rate | Same user, similar prompt within 60s | >15% yellow |
| Session abandonment | Last message with no follow-up in session | Track trend |

## Implementation as Patches

### Patch 1: orchestrator.py — Add metrics dict to done event

In `process_message()`, before yielding the `done` event, collect:
- `router_latency_ms` from gatekeeper call timing
- `tools_selected` from accumulated tool names
- `total_latency_ms` from start to end
- `tokens_used` from provider response (already partially tracked)

### Patch 2: chat.py — Add confirmation metrics

In `process_confirmation()`, log timing between confirmation creation and decision.
Add `edits_made` and `edit_fields` from `modified_params`.

### Patch 3: Database table for metrics

```sql
CREATE TABLE IF NOT EXISTS agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID,
    company_id UUID,
    conversation_id UUID,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_metrics_event ON agent_metrics(event_type);
CREATE INDEX idx_agent_metrics_created ON agent_metrics(created_at);
CREATE INDEX idx_agent_metrics_company ON agent_metrics(company_id);
```
