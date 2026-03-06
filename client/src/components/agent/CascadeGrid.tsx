/**
 * CascadeGrid — Renders a 2x2 grid of completed action cards
 * with staggered entrance animation.
 */

import { Check, ArrowRight, AlertCircle } from "lucide-react";
import type { CascadeBlock } from "./ResponseParser";

interface CascadeGridProps {
  cascade: CascadeBlock;
}

export function CascadeGrid({ cascade }: CascadeGridProps) {
  return (
    <div className="mt-2">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: cascade.items.length === 1 ? "1fr" : "1fr 1fr",
        }}
      >
        {cascade.items.map((item, idx) => {
          const statusIcon =
            item.status === "done" ? (
              <Check className="w-3.5 h-3.5" style={{ color: "#4ADE80" }} />
            ) : item.status === "error" ? (
              <AlertCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
            );

          return (
            <div
              key={idx}
              className="p-3 rounded-lg cascade-item"
              style={{
                backgroundColor: "#161B22",
                border: "1px solid #2D333B",
                animationDelay: `${idx * 0.15}s`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{ fontSize: "11px", color: "#FFFFFF" }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="truncate mt-0.5"
                    style={{ fontSize: "10px", color: "#9CA3AF" }}
                  >
                    {item.subtitle}
                  </p>
                </div>
                <div className="flex-shrink-0 mt-0.5">{statusIcon}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <p
        className="mt-2 text-center"
        style={{
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#4ADE80",
          letterSpacing: "0.03em",
        }}
      >
        {cascade.summary}
      </p>
    </div>
  );
}
