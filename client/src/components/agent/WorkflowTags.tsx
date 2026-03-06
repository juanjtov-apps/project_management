/**
 * WorkflowTags — Renders metadata chips (KEY: value) for context.
 */

import type { TagItem } from "./ResponseParser";

interface WorkflowTagsProps {
  tags: TagItem[];
}

export function WorkflowTags({ tags }: WorkflowTagsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {tags.map((tag, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
          style={{
            backgroundColor: "#161B22",
            border: "1px solid #2D333B",
            fontSize: "9px",
            fontFamily: "monospace",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "#6B7280" }}>{tag.key}:</span>
          <span style={{ color: "#D1D5DB" }}>{tag.value}</span>
        </span>
      ))}
    </div>
  );
}
