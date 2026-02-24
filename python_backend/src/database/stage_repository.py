"""
Repository for project stages and templates.
"""
import uuid
import json
from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Dict, Any
from src.database.connection import db_manager, get_db_pool
from src.utils.data_conversion import to_camel_case, to_snake_case


class StageTemplateRepository:
    """Repository for stage templates."""

    def _convert_to_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert snake_case keys to camelCase for frontend compatibility."""
        result = to_camel_case(data)
        return result if isinstance(result, dict) else data

    async def get_all_templates(self) -> List[Dict[str, Any]]:
        """Get all stage templates with their items."""
        query = """
            SELECT t.id, t.name, t.description, t.category, t.created_at,
                   COALESCE(json_agg(
                       json_build_object(
                           'id', i.id::text,
                           'templateId', i.template_id::text,
                           'orderIndex', i.order_index,
                           'name', i.name,
                           'defaultDurationDays', i.default_duration_days,
                           'defaultMaterialsNote', i.default_materials_note
                       ) ORDER BY i.order_index
                   ) FILTER (WHERE i.id IS NOT NULL), '[]') as items
            FROM client_portal.stage_templates t
            LEFT JOIN client_portal.stage_template_items i ON t.id = i.template_id
            GROUP BY t.id, t.name, t.description, t.category, t.created_at
            ORDER BY t.category, t.name
        """
        rows = await db_manager.execute_query(query)
        results = []
        for row in rows:
            data = dict(row)
            # Parse items JSON if it's a string
            if isinstance(data.get('items'), str):
                data['items'] = json.loads(data['items'])
            results.append(self._convert_to_camel_case(data))
        return results

    async def get_template_by_id(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific template with items."""
        query = """
            SELECT t.id, t.name, t.description, t.category, t.created_at,
                   COALESCE(json_agg(
                       json_build_object(
                           'id', i.id::text,
                           'templateId', i.template_id::text,
                           'orderIndex', i.order_index,
                           'name', i.name,
                           'defaultDurationDays', i.default_duration_days,
                           'defaultMaterialsNote', i.default_materials_note
                       ) ORDER BY i.order_index
                   ) FILTER (WHERE i.id IS NOT NULL), '[]') as items
            FROM client_portal.stage_templates t
            LEFT JOIN client_portal.stage_template_items i ON t.id = i.template_id
            WHERE t.id = $1
            GROUP BY t.id, t.name, t.description, t.category, t.created_at
        """
        row = await db_manager.execute_one(query, template_id)
        if row:
            data = dict(row)
            if isinstance(data.get('items'), str):
                data['items'] = json.loads(data['items'])
            return self._convert_to_camel_case(data)
        return None


class ProjectStageRepository:
    """Repository for project stages."""

    def _convert_to_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert snake_case keys to camelCase for frontend compatibility."""
        result = to_camel_case(data)
        return result if isinstance(result, dict) else data

    def _convert_from_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert camelCase keys to snake_case for database operations."""
        result = to_snake_case(data)
        return result if isinstance(result, dict) else data

    async def get_by_project(
        self,
        project_id: str,
        include_hidden: bool = True
    ) -> List[Dict[str, Any]]:
        """Get all stages for a project."""
        visibility_filter = "" if include_hidden else "AND ps.client_visible = true"

        query = f"""
            SELECT ps.id, ps.project_id, ps.order_index, ps.name, ps.status,
                   ps.planned_start_date, ps.planned_end_date,
                   ps.finish_materials_due_date, ps.finish_materials_note,
                   ps.material_area_id, ps.client_visible, ps.created_by,
                   ps.created_at, ps.updated_at,
                   ma.name as material_area_name,
                   COALESCE(COUNT(mi.id), 0)::integer as material_count
            FROM client_portal.project_stages ps
            LEFT JOIN client_portal.material_areas ma ON ps.material_area_id = ma.id
            LEFT JOIN client_portal.material_items mi ON mi.stage_id = ps.id
            WHERE ps.project_id = $1 {visibility_filter}
            GROUP BY ps.id, ps.project_id, ps.order_index, ps.name, ps.status,
                     ps.planned_start_date, ps.planned_end_date,
                     ps.finish_materials_due_date, ps.finish_materials_note,
                     ps.material_area_id, ps.client_visible, ps.created_by,
                     ps.created_at, ps.updated_at, ma.name
            ORDER BY ps.order_index
        """
        rows = await db_manager.execute_query(query, project_id)
        return [self._convert_to_camel_case(dict(row)) for row in rows]

    async def get_by_id(self, stage_id: str) -> Optional[Dict[str, Any]]:
        """Get a single stage by ID."""
        query = """
            SELECT ps.id, ps.project_id, ps.order_index, ps.name, ps.status,
                   ps.planned_start_date, ps.planned_end_date,
                   ps.finish_materials_due_date, ps.finish_materials_note,
                   ps.material_area_id, ps.client_visible, ps.created_by,
                   ps.created_at, ps.updated_at,
                   ma.name as material_area_name,
                   COALESCE(COUNT(mi.id), 0)::integer as material_count
            FROM client_portal.project_stages ps
            LEFT JOIN client_portal.material_areas ma ON ps.material_area_id = ma.id
            LEFT JOIN client_portal.material_items mi ON mi.stage_id = ps.id
            WHERE ps.id = $1
            GROUP BY ps.id, ps.project_id, ps.order_index, ps.name, ps.status,
                     ps.planned_start_date, ps.planned_end_date,
                     ps.finish_materials_due_date, ps.finish_materials_note,
                     ps.material_area_id, ps.client_visible, ps.created_by,
                     ps.created_at, ps.updated_at, ma.name
        """
        row = await db_manager.execute_one(query, stage_id)
        return self._convert_to_camel_case(dict(row)) if row else None

    async def _create_materials_for_stage(
        self,
        conn,
        project_id: str,
        stage_id: str,
        stage_name: str,
        materials: List[Dict[str, Any]],
        user_id: str
    ) -> None:
        """Create material areas and items for a manually created/edited stage.

        Materials are created with approval_status='approved' since the PM is
        manually specifying them (no review workflow needed).
        """
        now = datetime.now(timezone.utc)

        for material in materials:
            area_name = material.get('area_name') or material.get('areaName') or stage_name

            # Get or create material area
            existing_area = await conn.fetchrow(
                """SELECT id FROM client_portal.material_areas
                   WHERE project_id = $1 AND name = $2""",
                project_id, area_name
            )

            if existing_area:
                area_id = str(existing_area['id'])
            else:
                area_id = str(uuid.uuid4())
                max_sort = await conn.fetchval(
                    """SELECT COALESCE(MAX(sort_order), -1) + 1
                       FROM client_portal.material_areas WHERE project_id = $1""",
                    project_id
                )
                await conn.execute(
                    """INSERT INTO client_portal.material_areas
                       (id, project_id, name, description, sort_order,
                        is_from_template, created_by, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                    area_id, project_id, area_name,
                    f"Finish materials for {area_name}",
                    max_sort,
                    False,
                    user_id, now, now
                )

            # Check if this material already exists in this area for this project
            existing = await conn.fetchval(
                """SELECT 1 FROM client_portal.material_items
                   WHERE area_id = $1 AND project_id = $2
                   AND LOWER(TRIM(name)) = LOWER(TRIM($3))""",
                area_id, project_id, material.get('name')
            )
            if existing:
                continue

            # Create material item
            item_id = str(uuid.uuid4())
            await conn.execute(
                """INSERT INTO client_portal.material_items
                   (id, area_id, project_id, name, spec, status,
                    stage_id, approval_status, is_from_template,
                    added_by, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)""",
                item_id, area_id, project_id,
                material.get('name'),
                material.get('spec'),
                'pending',
                stage_id,
                'approved',
                False,
                user_id, now, now
            )

    async def create(self, stage_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create a new project stage with auto-assigned order_index.

        Uses a transaction to atomically get the next order_index and insert the stage,
        preventing unique constraint violations from concurrent operations.
        """
        stage_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Extract materials before converting to snake_case
        materials = stage_data.pop('materials', None)

        # Convert to snake_case for DB
        data = self._convert_from_camel_case(stage_data)
        project_id = data.get('project_id')
        stage_name = data.get('name', '')

        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Get the next available order_index for this project
                max_index = await conn.fetchval(
                    """SELECT COALESCE(MAX(order_index), -1) + 1
                       FROM client_portal.project_stages
                       WHERE project_id = $1""",
                    project_id
                )

                # Insert with the calculated order_index
                row = await conn.fetchrow(
                    """INSERT INTO client_portal.project_stages
                       (id, project_id, order_index, name, status, planned_start_date,
                        planned_end_date, finish_materials_due_date, finish_materials_note,
                        material_area_id, client_visible, created_by, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                       RETURNING *""",
                    stage_id,
                    project_id,
                    max_index,
                    data.get('name'),
                    data.get('status', 'NOT_STARTED'),
                    data.get('planned_start_date'),
                    data.get('planned_end_date'),
                    data.get('finish_materials_due_date'),
                    data.get('finish_materials_note'),
                    data.get('material_area_id'),
                    data.get('client_visible', True),
                    user_id,
                    now,
                    now
                )

                # Create materials if provided
                if materials:
                    await self._create_materials_for_stage(
                        conn, project_id, stage_id, stage_name, materials, user_id
                    )

        return self._convert_to_camel_case(dict(row))

    async def update(self, stage_id: str, update_data: Dict[str, Any], user_id: str = None) -> Optional[Dict[str, Any]]:
        """Update an existing stage. Optionally creates new materials if provided.

        Uses a single transaction for both stage update and material creation
        to ensure atomicity.
        """
        # Extract materials before converting
        materials = update_data.pop('materials', None)

        # Convert to snake_case for DB
        data = self._convert_from_camel_case(update_data)

        if not data and not materials:
            return await self.get_by_id(stage_id)

        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                row = None

                # Update stage fields if any
                if data:
                    set_clauses = []
                    values = []
                    param_count = 1

                    for key, value in data.items():
                        if key in ['id', 'project_id', 'created_by', 'created_at']:
                            continue
                        set_clauses.append(f"{key} = ${param_count}")
                        values.append(value)
                        param_count += 1

                    # Always update updated_at
                    set_clauses.append("updated_at = NOW()")
                    values.append(stage_id)

                    if set_clauses:
                        query = f"""
                            UPDATE client_portal.project_stages
                            SET {', '.join(set_clauses)}
                            WHERE id = ${param_count}
                            RETURNING *
                        """
                        row = await conn.fetchrow(query, *values)

                # Create new materials if provided (additive only)
                if materials and user_id:
                    stage = row or await conn.fetchrow(
                        "SELECT project_id, name FROM client_portal.project_stages WHERE id = $1",
                        stage_id
                    )
                    if stage:
                        project_id = stage.get('project_id')
                        stage_name = stage.get('name', '')
                        await self._create_materials_for_stage(
                            conn, project_id, stage_id, stage_name, materials, user_id
                        )

                result = row or await conn.fetchrow(
                    "SELECT * FROM client_portal.project_stages WHERE id = $1", stage_id
                )

        return self._convert_to_camel_case(dict(result)) if result else None

    async def delete(self, stage_id: str) -> bool:
        """Delete a stage. Materials become unlinked (not deleted)."""
        # First, unlink materials from this stage
        await db_manager.execute(
            "UPDATE client_portal.material_items SET stage_id = NULL WHERE stage_id = $1",
            stage_id
        )

        result = await db_manager.execute(
            "DELETE FROM client_portal.project_stages WHERE id = $1",
            stage_id
        )
        return "DELETE 1" in result

    async def reorder(self, project_id: str, stage_ids: List[str]) -> List[Dict[str, Any]]:
        """Reorder stages by updating order_index.

        Uses a transaction with two-phase update to avoid unique constraint violations.
        Phase 1 sets negative indices, Phase 2 sets final positive indices.
        The transaction ensures atomicity - if any update fails, all are rolled back.
        """
        if not stage_ids:
            return await self.get_by_project(project_id)

        # Batch reorder using unnest() arrays — 2 queries total regardless of stage count
        neg_indices = [-(i + 1) for i in range(len(stage_ids))]
        final_indices = list(range(len(stage_ids)))

        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Phase 1: Set all to negative indices (avoids unique constraint conflicts)
                await conn.execute(
                    """UPDATE client_portal.project_stages AS s
                       SET order_index = t.idx, updated_at = NOW()
                       FROM unnest($1::uuid[], $2::int[]) AS t(sid, idx)
                       WHERE s.id = t.sid AND s.project_id = $3""",
                    stage_ids, neg_indices, project_id
                )

                # Phase 2: Set to final positive indices
                await conn.execute(
                    """UPDATE client_portal.project_stages AS s
                       SET order_index = t.idx, updated_at = NOW()
                       FROM unnest($1::uuid[], $2::int[]) AS t(sid, idx)
                       WHERE s.id = t.sid AND s.project_id = $3""",
                    stage_ids, final_indices, project_id
                )

        return await self.get_by_project(project_id)

    async def apply_template(
        self,
        project_id: str,
        template_id: str,
        user_id: str,
        start_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """Apply a template to create stages and suggested materials for a project."""
        # Get template items (DISTINCT ON prevents duplicates from causing unique constraint errors)
        template_items_query = """
            SELECT DISTINCT ON (order_index) *
            FROM client_portal.stage_template_items
            WHERE template_id = $1
            ORDER BY order_index, created_at
        """
        items = await db_manager.execute_query(template_items_query, template_id)

        current_date = start_date or date.today()
        now = datetime.now(timezone.utc)

        # Pre-compute all values, then batch insert in a single query
        values_list = []
        params = []
        param_idx = 1

        for item in items:
            stage_id = str(uuid.uuid4())
            planned_start = current_date
            duration = item['default_duration_days'] or 7
            planned_end = current_date + timedelta(days=duration)
            materials_due = max(planned_start - timedelta(days=7), date.today())

            placeholders = ", ".join(f"${param_idx + i}" for i in range(12))
            values_list.append(f"({placeholders})")
            params.extend([
                stage_id, project_id, item['order_index'], item['name'],
                'NOT_STARTED', planned_start, planned_end, materials_due,
                item['default_materials_note'], user_id, now, now
            ])
            param_idx += 12

            current_date = planned_end + timedelta(days=1)

        if not values_list:
            return []

        query = f"""
            INSERT INTO client_portal.project_stages
            (id, project_id, order_index, name, status, planned_start_date,
             planned_end_date, finish_materials_due_date, finish_materials_note,
             client_visible, created_by, created_at, updated_at)
            VALUES {", ".join(values_list)}
            RETURNING *
        """

        rows = await db_manager.execute_query(query, *params)
        created_stages = [self._convert_to_camel_case(dict(row)) for row in rows]

        # Create suggested materials from template
        await self._create_suggested_materials_from_template(
            project_id=project_id,
            template_id=template_id,
            created_stages=created_stages,
            user_id=user_id
        )

        return created_stages

    async def _create_suggested_materials_from_template(
        self,
        project_id: str,
        template_id: str,
        created_stages: List[Dict[str, Any]],
        user_id: str
    ) -> None:
        """Create material areas and items from template, linked to appropriate stages.

        Materials are created with approval_status='pending' so PMs can review
        before they become visible to clients.
        """
        # Get material templates for this stage template
        material_templates_query = """
            SELECT mt.stage_name, mt.area_name, mt.material_name,
                   mt.material_category, mt.sort_order
            FROM client_portal.material_templates mt
            WHERE mt.stage_template_id = $1
            ORDER BY mt.area_name, mt.sort_order
        """
        material_templates = await db_manager.execute_query(material_templates_query, template_id)

        if not material_templates:
            return  # No material templates for this stage template

        # Build a map of stage names to stage IDs
        stage_name_to_id = {stage['name']: stage['id'] for stage in created_stages}

        # Get or create material areas for this project
        # Group materials by area_name first
        areas_needed = set(mt['area_name'] for mt in material_templates)
        area_name_to_id = {}

        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                now = datetime.now(timezone.utc)

                # Create material areas (one per unique area_name)
                for sort_order, area_name in enumerate(sorted(areas_needed)):
                    area_id = str(uuid.uuid4())

                    # Check if area already exists for this project
                    existing_area = await conn.fetchrow(
                        """SELECT id FROM client_portal.material_areas
                           WHERE project_id = $1 AND name = $2""",
                        project_id, area_name
                    )

                    if existing_area:
                        area_name_to_id[area_name] = str(existing_area['id'])
                    else:
                        await conn.execute(
                            """INSERT INTO client_portal.material_areas
                               (id, project_id, name, description, sort_order,
                                is_from_template, created_by, created_at, updated_at)
                               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                            area_id,
                            project_id,
                            area_name,
                            f"Finish materials for {area_name}",
                            sort_order,
                            True,  # is_from_template
                            user_id,
                            now,
                            now
                        )
                        area_name_to_id[area_name] = area_id

                # Create material items with pending approval status (skip duplicates)
                for mt in material_templates:
                    area_id = area_name_to_id.get(mt['area_name'])
                    stage_id = stage_name_to_id.get(mt['stage_name'])

                    if not area_id:
                        continue

                    # Check if this material already exists in this area for this project
                    existing = await conn.fetchval(
                        """SELECT 1 FROM client_portal.material_items
                           WHERE area_id = $1 AND project_id = $2
                           AND LOWER(TRIM(name)) = LOWER(TRIM($3))""",
                        area_id, project_id, mt['material_name']
                    )
                    if existing:
                        continue

                    item_id = str(uuid.uuid4())
                    await conn.execute(
                        """INSERT INTO client_portal.material_items
                           (id, area_id, project_id, name, spec, status,
                            stage_id, approval_status, is_from_template,
                            added_by, created_at, updated_at)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)""",
                        item_id,
                        area_id,
                        project_id,
                        mt['material_name'],
                        mt['material_category'],  # Use category as initial spec hint
                        'pending',  # material status
                        stage_id,
                        'pending',  # approval_status - requires PM approval
                        True,  # is_from_template
                        user_id,
                        now,
                        now
                    )

    async def shift_dates(self, project_id: str, after_order_index: int, delta_days: int) -> List[Dict[str, Any]]:
        """Shift dates of all stages after a given order_index by delta_days.

        Shifts planned_start_date, planned_end_date, and finish_materials_due_date
        for stages with order_index > after_order_index. Only non-NULL dates are shifted.
        """
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """UPDATE client_portal.project_stages
                       SET planned_start_date = planned_start_date + ($1 || ' days')::interval,
                           planned_end_date = planned_end_date + ($1 || ' days')::interval,
                           finish_materials_due_date = finish_materials_due_date + ($1 || ' days')::interval,
                           updated_at = NOW()
                       WHERE project_id = $2 AND order_index > $3""",
                    str(delta_days), project_id, after_order_index
                )

        return await self.get_by_project(project_id)

    async def get_stages_count(self, project_id: str) -> int:
        """Get count of stages for a project."""
        query = """
            SELECT COUNT(*) as count FROM client_portal.project_stages
            WHERE project_id = $1
        """
        row = await db_manager.execute_one(query, project_id)
        return row['count'] if row else 0


# Global repository instances
stage_template_repo = StageTemplateRepository()
project_stage_repo = ProjectStageRepository()
