/**
 * ActionButtons — Renders 1-2 action buttons that send prompts to the agent.
 */

import { useState } from "react";
import { Check } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import type { ActionItem } from "./ResponseParser";

interface ActionButtonsProps {
  actions: ActionItem[];
  onAction: (prompt: string) => void;
}

export function ActionButtons({ actions, onAction }: ActionButtonsProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [, setLocation] = useLocation();
  const { t } = useTranslation('agent');

  const handleClick = (action: ActionItem) => {
    if (confirmed) return;
    setConfirmed(true);
    if (action.navigateTo) {
      setLocation(action.navigateTo);
    } else {
      onAction(action.prompt);
    }
  };

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Check className="w-3.5 h-3.5" style={{ color: "#4ADE80" }} />
        <span style={{ fontSize: "11px", color: "#4ADE80", fontFamily: "monospace" }}>
          {t('actionButtons.done')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => handleClick(action)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
          style={{
            backgroundColor: idx === 0 ? "#4ADE80" : "#1F242C",
            color: idx === 0 ? "#0F1115" : "#FFFFFF",
            border: idx === 0 ? "none" : "1px solid #2D333B",
          }}
          onMouseEnter={(e) => {
            if (idx === 0) {
              e.currentTarget.style.backgroundColor = "#3FCF71";
            } else {
              e.currentTarget.style.borderColor = "#4ADE80";
            }
          }}
          onMouseLeave={(e) => {
            if (idx === 0) {
              e.currentTarget.style.backgroundColor = "#4ADE80";
            } else {
              e.currentTarget.style.borderColor = "#2D333B";
            }
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
