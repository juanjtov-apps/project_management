/**
 * ResponseParser — Extracts structured blocks (cascade, actions, tags)
 * from agent message content, leaving the rest as plain text.
 */

export interface CascadeItem {
  title: string;
  subtitle: string;
  status: "done" | "pending" | "error";
  icon?: string;
}

export interface CascadeBlock {
  items: CascadeItem[];
  summary: string;
}

export interface ActionItem {
  label: string;
  prompt: string;
  navigateTo?: string;
}

export interface TagItem {
  key: string;
  value: string;
}

export interface ParsedResponse {
  /** Plain text content with JSON blocks removed */
  text: string;
  /** Cascade grid data (multi-action results) */
  cascade: CascadeBlock | null;
  /** Action buttons (max 2) */
  actions: ActionItem[] | null;
  /** Workflow tags */
  tags: TagItem[] | null;
}

/**
 * Parse agent message content for structured JSON blocks.
 * Blocks are expected as fenced JSON at the end of the message.
 */
export function parseResponse(content: string): ParsedResponse {
  let text = content;
  let cascade: CascadeBlock | null = null;
  let actions: ActionItem[] | null = null;
  let tags: TagItem[] | null = null;

  // Match fenced code blocks with json/JSON label
  const fencedBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)```/gi;
  const jsonBlocks: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = fencedBlockRegex.exec(content)) !== null) {
    jsonBlocks.push(match[1].trim());
  }

  // Also try to match raw JSON objects at the end of the message (no fences)
  const trailingJsonRegex = /\n(\{[\s\S]*\})\s*$/;
  const trailingMatch = trailingJsonRegex.exec(content);
  if (trailingMatch) {
    jsonBlocks.push(trailingMatch[1].trim());
  }

  for (const block of jsonBlocks) {
    try {
      const parsed = JSON.parse(block);

      if (parsed.cascade && Array.isArray(parsed.cascade)) {
        cascade = {
          items: parsed.cascade.map((item: Record<string, unknown>) => ({
            title: String(item.title || ""),
            subtitle: String(item.subtitle || ""),
            status: (item.status as string) || "done",
            icon: item.icon ? String(item.icon) : undefined,
          })),
          summary: String(parsed.summary || `${parsed.cascade.length} actions`),
        };
        // Remove this block from text
        text = text.replace(/```(?:json)?\s*\n?[\s\S]*?```/i, "").trim();
      }

      if (parsed.actions && Array.isArray(parsed.actions)) {
        actions = parsed.actions.slice(0, 2).map((item: Record<string, unknown>) => ({
          label: String(item.label || ""),
          prompt: String(item.prompt || ""),
          navigateTo: item.navigateTo ? String(item.navigateTo) : undefined,
        }));
        text = text.replace(/```(?:json)?\s*\n?[\s\S]*?```/i, "").trim();
      }

      if (parsed.tags && Array.isArray(parsed.tags)) {
        tags = parsed.tags.map((item: Record<string, unknown>) => ({
          key: String(item.key || ""),
          value: String(item.value || ""),
        }));
        text = text.replace(/```(?:json)?\s*\n?[\s\S]*?```/i, "").trim();
      }
    } catch {
      // Not valid JSON — leave it as content
    }
  }

  // Clean up any trailing JSON that was extracted
  if (trailingMatch && (cascade || actions || tags)) {
    text = text.replace(/\n\{[\s\S]*\}\s*$/, "").trim();
  }

  // Clean up multiple blank lines
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return { text, cascade, actions, tags };
}
