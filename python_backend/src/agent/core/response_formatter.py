"""
Response formatter for agent outputs.
"""

from typing import Dict, Any, List, Optional
import json


class ResponseFormatter:
    """Formats agent responses for frontend display.

    Handles conversion of tool results and agent outputs into
    appropriate formats for the chat interface.
    """

    @staticmethod
    def format_projects_response(result: Dict[str, Any]) -> str:
        """Format get_projects result for display."""
        projects = result.get("projects", [])
        total = result.get("totalCount", len(projects))
        status_counts = result.get("statusCounts", {})

        if not projects:
            return "No projects found matching your criteria."

        lines = [f"Found **{total} projects**:"]

        # Add status summary
        if status_counts:
            status_parts = [f"{count} {status}" for status, count in status_counts.items()]
            lines.append(f"Status breakdown: {', '.join(status_parts)}")

        lines.append("")

        # List projects
        for p in projects[:10]:  # Limit display
            status_emoji = {
                "active": "",
                "completed": "",
                "on-hold": "",
                "delayed": "",
            }.get(p.get("status", ""), "")

            progress = p.get("progress", 0)
            lines.append(
                f"- **{p['name']}** {status_emoji} - {progress}% complete"
            )
            if p.get("location"):
                lines.append(f"  Location: {p['location']}")

        if total > 10:
            lines.append(f"\n... and {total - 10} more projects")

        return "\n".join(lines)

    @staticmethod
    def format_project_detail_response(result: Dict[str, Any]) -> str:
        """Format get_project_detail result for display."""
        if "error" in result:
            return f"Error: {result['error']}"

        project = result.get("project", {})
        tasks = result.get("tasks", {})
        stages = result.get("stages", {})
        issues = result.get("openIssues", {})

        lines = [f"## {project.get('name', 'Project')}"]
        lines.append("")

        # Status and progress
        lines.append(f"**Status:** {project.get('status', 'Unknown')}")
        lines.append(f"**Progress:** {project.get('progress', 0)}%")

        if project.get("dueDate"):
            lines.append(f"**Due Date:** {project['dueDate']}")

        if project.get("location"):
            lines.append(f"**Location:** {project['location']}")

        if project.get("clientName"):
            lines.append(f"**Client:** {project['clientName']}")

        # Tasks summary
        if tasks:
            lines.append("")
            lines.append(f"### Tasks ({tasks.get('totalCount', 0)} total)")
            lines.append(f"- Completed: {tasks.get('completedCount', 0)}")
            lines.append(f"- Blocked: {tasks.get('blockedCount', 0)}")

        # Stages
        if stages:
            active_stage = stages.get("activeStage")
            if active_stage:
                lines.append("")
                lines.append(f"### Current Stage: {active_stage.get('name', 'Unknown')}")

        # Open issues
        if issues and issues.get("count", 0) > 0:
            lines.append("")
            lines.append(f"### Open Issues ({issues['count']})")
            for issue in issues.get("items", [])[:3]:
                lines.append(f"- {issue.get('title', 'Untitled')}")

        return "\n".join(lines)

    @staticmethod
    def format_stages_response(result: Dict[str, Any]) -> str:
        """Format get_stages result for display."""
        stages = result.get("stages", [])
        summary = result.get("summary", {})
        active_stage = result.get("activeStage")

        if not stages:
            return "No stages found for this project."

        lines = [f"## Project Stages ({summary.get('totalStages', len(stages))} total)"]
        lines.append("")

        if active_stage:
            lines.append(f"**Current Stage:** {active_stage['name']}")
            lines.append("")

        lines.append(
            f"Status: {summary.get('complete', 0)} complete, "
            f"{summary.get('active', 0)} active, "
            f"{summary.get('notStarted', 0)} not started"
        )
        lines.append("")

        # List stages
        for stage in stages:
            status_icon = {
                "COMPLETE": "[x]",
                "ACTIVE": "[>]",
                "NOT_STARTED": "[ ]",
            }.get(stage.get("status", ""), "[ ]")

            lines.append(f"{status_icon} **{stage['name']}** - {stage.get('completionPercentage', 0)}%")

            if stage.get("plannedStartDate"):
                lines.append(f"    Planned: {stage['plannedStartDate']} to {stage.get('plannedEndDate', 'TBD')}")

        return "\n".join(lines)

    @staticmethod
    def format_tasks_response(result: Dict[str, Any]) -> str:
        """Format get_tasks result for display."""
        tasks = result.get("tasks", [])
        summary = result.get("summary", {})

        if not tasks:
            return "No tasks found matching your criteria."

        lines = [f"## Tasks ({summary.get('totalTasks', len(tasks))} total)"]
        lines.append("")

        lines.append(
            f"Status: {summary.get('completed', 0)} completed, "
            f"{summary.get('inProgress', 0)} in progress, "
            f"{summary.get('pending', 0)} pending, "
            f"{summary.get('blocked', 0)} blocked"
        )
        lines.append("")

        # List tasks
        for task in tasks[:15]:  # Limit display
            status_icon = {
                "completed": "[x]",
                "in-progress": "[~]",
                "pending": "[ ]",
                "blocked": "[!]",
            }.get(task.get("status", ""), "[ ]")

            priority_label = ""
            if task.get("priority") in ["high", "critical"]:
                priority_label = f" ({task['priority']})"

            lines.append(f"{status_icon} {task['title']}{priority_label}")

            if task.get("dueDate"):
                lines.append(f"    Due: {task['dueDate']}")

        if len(tasks) > 15:
            lines.append(f"\n... and {len(tasks) - 15} more tasks")

        return "\n".join(lines)

    @staticmethod
    def format_materials_response(result: Dict[str, Any]) -> str:
        """Format get_materials result for display."""
        materials = result.get("materials", [])
        summary = result.get("summary", {})
        by_area = result.get("materialsByArea", {})

        if not materials:
            return "No materials found for this project."

        lines = [f"## Materials ({summary.get('totalItems', len(materials))} items)"]
        lines.append("")

        if summary.get("totalEstimatedCost"):
            lines.append(f"**Estimated Total:** ${summary['totalEstimatedCost']:,.2f}")
            lines.append("")

        # Status summary
        status_counts = summary.get("statusCounts", {})
        if status_counts:
            status_parts = [f"{count} {status}" for status, count in status_counts.items()]
            lines.append(f"Status: {', '.join(status_parts)}")
            lines.append("")

        # List by area
        for area_name, items in by_area.items():
            lines.append(f"### {area_name}")
            for item in items[:5]:  # Limit per area
                status = item.get("status", "pending")
                lines.append(f"- {item['name']} [{status}]")
                if item.get("vendor"):
                    lines.append(f"  Vendor: {item['vendor']}")

            if len(items) > 5:
                lines.append(f"  ... and {len(items) - 5} more items")

            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def format_generic_response(result: Dict[str, Any]) -> str:
        """Format a generic tool result."""
        try:
            return json.dumps(result, indent=2, default=str)
        except Exception:
            return str(result)


# Global instance
response_formatter = ResponseFormatter()
