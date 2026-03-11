# Proe Agent — Codebase Discovery Report

## Component Locations

| Component | File Path | Role |
|---|---|---|
| Orchestrator | `src/agent/core/orchestrator.py` | Plan-execute-reflect loop: gatekeeper → LLM → tool execution → response |
| LLM Router | `src/agent/llm/model_router.py` | 3-tier classification: Gatekeeper → Specialist/Planner |
| Context Builder | `src/agent/core/context_builder.py` | Builds system prompt with company, role, project, date context |
| Tool Registry | `src/agent/tools/registry.py` | Central tool management, role-based filtering |
| Tool Executor | `src/agent/tools/executor.py` | Validation, confirmation checks, execution, audit logging |
| Chat API | `src/agent/api/chat.py` | SSE streaming, confirmation flow, feedback endpoints |
| Provider Base | `src/agent/llm/provider_base.py` | Abstract LLM provider interface |
| OpenRouter Provider | `src/agent/llm/openrouter_provider.py` | Streaming + sync LLM calls via OpenRouter API |
| Provider Factory | `src/agent/llm/provider_factory.py` | Singleton provider creation |
| Agent Models | `src/agent/models/agent_models.py` | SafetyLevel enum, data classes |
| Existing Tests | `tests/agent/test_agent_actions.py` | 5 unit + 15 integration tests |
| Router Tests | `tests/agent/test_model_router.py` | 20 mocked routing tests |

## Tool Inventory (25 tools)

### READ_ONLY (execute immediately)
| Tool | Permissions | Key Params |
|---|---|---|
| `get_projects` | multi-role | company_id (from context) |
| `get_project_detail` | admin, PM, OM | project_id or project_name |
| `get_stages` | multi-role | project_id |
| `get_tasks` | multi-role | project_id |
| `get_materials` | multi-role | project_id |
| `get_issues` | multi-role | project_id |
| `get_installments` | multi-role | project_id |
| `get_stage_templates` | admin, PM | (none) |
| `query_database` | varies | flexible SQL query |

### AUDIT_LOGGED (execute + log)
| Tool | Permissions | Key Params |
|---|---|---|
| `update_task_status` | admin, PM, OM, crew | task_id, status |
| `assign_task` | admin, PM | task_id, assignee_id |
| `create_daily_log` | admin, PM, OM, crew | project_id, title, content, type |
| `send_notification` | admin, PM | title, message, type |
| `update_issue_status` | admin, PM, OM, crew | issue_id, status |
| `update_stage` | admin, PM | stage_id, status, dates |
| `create_material_item` | admin, PM, OM | project_id, area_id, name |
| `update_project_details` | admin, PM | project_id, fields |

### REQUIRES_CONFIRMATION (user approves before execution)
| Tool | Permissions | Key Params |
|---|---|---|
| `create_task` | admin, PM | project_id, title |
| `create_issue` | admin, PM, OM | project_id, title |
| `create_stage` | admin, PM | project_id, name |
| `apply_stage_template` | admin, PM | project_id, template_name |
| `create_installment` | admin, PM | project_id, name, amount |
| `update_payment_status` | admin, PM | installment_id, status |
| `update_installment` | admin, PM | installment_id, fields |
| `update_project_status` | admin, PM | project_id, status, progress |
| `delete_task` | admin | task_id |

## LLM Router Configuration

| Tier | Model | Use Case | Settings |
|---|---|---|---|
| Gatekeeper | `google/gemini-2.0-flash-001` | Intent classification | temp=0.0, max_tokens=150, timeout=3s |
| Specialist | `openai/gpt-4o-mini` | ~70% of traffic — simple queries | temp=0.3, max_tokens=4096 |
| Planner | `anthropic/claude-sonnet-4` | ~30% of traffic — complex multi-step | temp=0.3, max_tokens=8192 |

**Classification mechanism**: Gatekeeper receives system prompt + user message, returns JSON with `{tier, intent, entities, confidence}`.

**Fallback**: On gatekeeper error/timeout/malformed JSON → defaults to Specialist tier.

## System Prompt Summary

- Persona: "Proe" — seasoned construction superintendent
- Company identity injected (immutable)
- Role-specific guidelines (admin=data-rich, crew=actionable)
- Project context when scoped (stages, issues, current stage)
- Date context (this week, this month, overdue thresholds)
- Tool guidelines: "Never fabricate data; always call tools first"
- UUID rule: "All action tools require project_id (UUID), NOT project name"

## Confirmation Flow

1. User sends message → orchestrator detects REQUIRES_CONFIRMATION tool
2. Pending confirmation created in DB with operation_summary
3. SSE yields `confirmation_required` event to frontend
4. User confirms/rejects via POST `/agent/confirm`
5. On confirm: tool executes, result saved, tool_call updated
6. On reject: confirmation status updated to dismissed

## Gaps & Inconsistencies

1. Project name→UUID resolution is agent's responsibility (via tools), not automatic in context_builder
2. No `delete_stage` tool exists (only delete_task)
3. No scheduling/calendar tool exists
4. No bulk operations (delete all, update all)
5. `query_database` is very flexible but relies on LLM constructing correct SQL
