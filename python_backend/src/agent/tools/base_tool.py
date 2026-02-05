"""
Base class for all agent tools.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List

from ..models.agent_models import SafetyLevel


class BaseTool(ABC):
    """Base class for all agent tools.

    Tools are the functions the AI agent can invoke to read, write, and
    transform data within Proesphere. Each tool has defined inputs, outputs,
    permissions, and safety levels.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for the tool."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description of what the tool does.

        This description is provided to the LLM to help it understand
        when and how to use the tool.
        """
        pass

    @property
    @abstractmethod
    def input_schema(self) -> Dict[str, Any]:
        """JSON Schema for tool input parameters.

        Returns a dict with 'properties' and 'required' keys following
        JSON Schema specification.
        """
        pass

    @property
    @abstractmethod
    def permissions(self) -> List[str]:
        """List of role names that can use this tool.

        Valid roles: admin, project_manager, office_manager, crew,
        subcontractor, client
        """
        pass

    @property
    @abstractmethod
    def safety_level(self) -> SafetyLevel:
        """Safety level for this tool.

        Determines how the tool execution is handled:
        - READ_ONLY: Execute immediately
        - AUDIT_LOGGED: Execute and log
        - REQUIRES_REVIEW: Agent drafts, human approves
        - REQUIRES_CONFIRMATION: Human confirms before execution
        - PROHIBITED: Tool refuses to execute
        """
        pass

    @abstractmethod
    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute the tool and return results.

        Args:
            params: Input parameters validated against input_schema.
            context: Execution context containing:
                - user_id: str - The user's ID
                - company_id: str - The user's company ID
                - project_id: Optional[str] - Current project context
                - role: str - The user's role
                - permissions: List[str] - The user's permissions

        Returns:
            Dict containing the tool's output. Structure varies by tool.

        Raises:
            ValueError: If input parameters are invalid.
            PermissionError: If user lacks required permissions.
            Exception: For other errors during execution.
        """
        pass

    def to_llm_schema(self) -> Dict[str, Any]:
        """Convert tool to LLM-compatible schema format.

        Returns tool definition in OpenAI/Anthropic function calling format.
        """
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {
                "type": "object",
                **self.input_schema,
            },
        }

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate input parameters against schema.

        Args:
            params: Input parameters to validate.

        Returns:
            True if valid.

        Raises:
            ValueError: If parameters are invalid.
        """
        schema = self.input_schema
        required = schema.get("required", [])

        # Check required parameters
        for param_name in required:
            if param_name not in params:
                raise ValueError(f"Missing required parameter: {param_name}")

        # Check parameter types (basic validation)
        properties = schema.get("properties", {})
        for param_name, param_value in params.items():
            if param_name in properties:
                expected_type = properties[param_name].get("type")
                if expected_type:
                    if expected_type == "string" and not isinstance(param_value, str):
                        raise ValueError(
                            f"Parameter '{param_name}' must be a string"
                        )
                    elif expected_type == "integer" and not isinstance(param_value, int):
                        raise ValueError(
                            f"Parameter '{param_name}' must be an integer"
                        )
                    elif expected_type == "boolean" and not isinstance(param_value, bool):
                        raise ValueError(
                            f"Parameter '{param_name}' must be a boolean"
                        )
                    elif expected_type == "array" and not isinstance(param_value, list):
                        raise ValueError(
                            f"Parameter '{param_name}' must be an array"
                        )

        return True

    def __repr__(self) -> str:
        return f"<Tool: {self.name} ({self.safety_level.value})>"
