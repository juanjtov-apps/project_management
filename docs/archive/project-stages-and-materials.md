# Canonical Project Stages and Finish Materials Data Model

## Purpose

This document defines the **canonical domain model** for:
- Project Stages
- Material Areas
- Finish Materials

This model is the **single source of truth** for:
- Backend persistence
- Frontend behavior (PM portal and Client portal)
- RBAC enforcement
- Agent-generated project plans and future forecasting

Any change to how stages or finish materials behave **must be reflected here first**.

---

## Design Principles

1. **Simplicity first**
   - Support core outcomes without over-modeling
   - Avoid premature complexity (dependencies, forecasting, inspections)

2. **Single source of truth**
   - Finish materials are stored once and rendered in multiple views
   - No duplication between Stages module and Client Materials module

3. **RBAC-driven behavior**
   - PM and Client see different capabilities over the same data
   - Permissions enforced at the API layer

4. **Agent-ready**
   - Model must be writable by AI agents without special casing
   - Deterministic, structured, and predictable

---

## Core Entities

### 1. ProjectStage

Represents a sequential phase of work and the primary driver of
“What is next” in a project.

#### Fields

| Field | Type | Notes |
|-----|-----|-----|
| id | uuid | Primary key |
| project_id | uuid | Owning project |
| order_index | int | Controls stage order |
| name | string | Human readable |
| status | enum | NOT_STARTED, ACTIVE, COMPLETE |
| planned_start_date | date | Optional |
| planned_end_date | date | Optional |

#### Finish materials scheduling

| Field | Type | Notes |
|-----|-----|-----|
| finish_materials_due_date | date | When client selections are required |
| finish_materials_note | text | Guidance for client |

#### Materials module linkage

| Field | Type | Notes |
|-----|-----|-----|
| material_area_id | uuid | Default area for materials created in this stage |

#### Audit

| Field | Type |
|-----|-----|
| created_by_role | enum (PM, CLIENT, SYSTEM) |
| created_by_user_id | uuid |
| created_at | timestamp |
| updated_at | timestamp |

#### Rules

- Stages are ordered strictly by `order_index`
- “Next stage” = lowest `order_index` where `status != COMPLETE`
- PMs can create, update, delete, and reorder stages
- Clients cannot delete stages

---

### 2. MaterialArea

Represents a logical grouping of finish materials
(e.g., “Bathroom 1”, “Kitchen”, “Living Room”).

Used primarily by the Client Materials module.

#### Fields

| Field | Type | Notes |
|-----|-----|-----|
| id | uuid | Primary key |
| project_id | uuid | Owning project |
| name | string | Display name |
| normalized_name | string | Lowercase trimmed name |
| created_by_role | enum (PM, CLIENT, SYSTEM) |
| created_by_user_id | uuid |
| created_at | timestamp |

#### Rules

- Unique per project by `normalized_name`
- Users select areas by **name**, never by id
- If area does not exist, it can be created inline
- Backend uses “create or return existing” logic

---

### 3. FinishMaterialItem

Single source of truth for all finish materials.

Rendered in:
- Stages module (grouped by stage)
- Client Materials module (grouped by area and budget)

#### Fields

##### Identity and linkage

| Field | Type | Notes |
|-----|-----|-----|
| id | uuid | Primary key |
| project_id | uuid | Owning project |
| stage_id | uuid | Nullable |
| material_area_id | uuid | Nullable |

##### Core fields

| Field | Type | Notes |
|-----|-----|-----|
| item_name | string | Required |
| vendor | string | Optional |
| specifications | text | Optional |
| product_link | text | Optional |

##### Budget fields

| Field | Type | Notes |
|-----|-----|-----|
| quantity | string | Free-form (e.g. “50 sq ft”) |
| unit_cost | decimal | Optional |
| currency | string | Defaults to project currency |

##### Workflow fields

| Field | Type | Notes |
|-----|-----|-----|
| responsible_party | enum | CLIENT or PM |
| status | enum | NOT_REQUESTED, REQUESTED, ORDERED, RECEIVED |
| needed_by_date | date | Defaults from stage if empty |

##### Audit and RBAC

| Field | Type |
|-----|-----|
| created_by_role | enum (CLIENT, PM) |
| created_by_user_id | uuid |
| created_at | timestamp |
| updated_at | timestamp |

#### Rules

- If created inside a stage with `material_area_id`, inherit that area
- If `needed_by_date` is null, default to stage’s `finish_materials_due_date`
- Clients:
  - Can create items
  - Can edit only their own items
  - Cannot delete items
- PMs:
  - Full CRUD access to all items

---

## Relationships Overview

- Project → many ProjectStages
- Project → many MaterialAreas
- Project → many FinishMaterialItems

Linking behavior:
- Stage → Area via `material_area_id`
- Material → Stage via `stage_id`
- Material → Area via `material_area_id`

This enables:
- One material record
- Multiple views
- Zero duplication

---

## RBAC Summary

### Client Portal
- View all stages
- Add finish materials
- Edit own finish materials
- Cannot delete materials
- Cannot delete stages

### PM Portal
- Full CRUD on stages
- Full CRUD on finish materials
- Can manage material areas
- Can clean up client-added items

---

## Agent Compatibility

Agents may:
- Create stages
- Assign material areas to stages
- Create finish material items
- Populate due dates and notes

Agents must **not** bypass RBAC or create duplicate areas.

All agent output must conform to this model.

---

## Versioning

This document is versioned via git.
Changes must be reviewed alongside code changes that alter domain behavior.

