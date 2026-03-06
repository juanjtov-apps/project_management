/**
 * VoiceOverlay — Full-screen cinematic voice input overlay.
 * States: idle -> listening -> transcribed -> sending
 */

import { useEffect, useCallback, KeyboardEvent as ReactKeyboardEvent } from "react";
import { X, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { WaveformBars } from "./WaveformBars";

interface VoiceOverlayProps {
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}

const SUGGESTIONS = [
  "What's the status of my projects?",
  "Show me overdue tasks",
  "Which projects are at risk?",
  "Log today's progress on Cole Dr",
];

export function VoiceOverlay({ open, onClose, onSend }: VoiceOverlayProps) {
  const { isListening, transcript, isInterim, start, stop, reset } =
    useVoiceInput();

  // Start listening when overlay opens
  useEffect(() => {
    if (open) {
      // Small delay for animation
      const timer = setTimeout(() => start(), 300);
      return () => clearTimeout(timer);
    } else {
      reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSend = useCallback(() => {
    if (!transcript.trim()) return;
    stop();
    onSend(transcript.trim());
    onClose();
  }, [transcript, stop, onSend, onClose]);

  // Auto-send after transcription completes (not interim)
  useEffect(() => {
    if (transcript && !isInterim && !isListening) {
      const timer = setTimeout(handleSend, 600);
      return () => clearTimeout(timer);
    }
  }, [transcript, isInterim, isListening, handleSend]);

  const handleSuggestionClick = (suggestion: string) => {
    stop();
    onSend(suggestion);
    onClose();
  };

  if (!open) return null;

  const hasTranscript = transcript.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center voice-overlay-enter"
      style={{
        backgroundColor: "rgba(15, 17, 21, 0.90)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Card */}
      <div
        className="relative w-full mx-4 p-8 rounded-[22px] voice-card-enter"
        style={{
          maxWidth: "520px",
          backgroundColor: "#161B22",
          border: "1px solid #2D333B",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-[#2D333B]"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Mic orb */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{
              backgroundColor: isListening ? "#4ADE80" : "#2D333B",
              boxShadow: isListening
                ? "0 0 40px rgba(74, 222, 128, 0.3)"
                : "none",
              transition: "all 0.3s ease",
              cursor: "pointer",
              animation: isListening ? "micPulse 2s ease-in-out infinite" : "none",
            }}
            onClick={() => {
              if (isListening) {
                stop();
              } else {
                start();
              }
            }}
          >
            <Mic
              className="w-8 h-8"
              style={{
                color: isListening ? "#0F1115" : "#9CA3AF",
                transition: "color 0.3s ease",
              }}
            />
          </div>

          {/* Waveform */}
          <div className="mb-6">
            <WaveformBars isListening={isListening} />
          </div>

          {/* Status text */}
          <p
            className="text-sm mb-2 font-medium"
            style={{ color: isListening ? "#4ADE80" : "#9CA3AF" }}
          >
            {isListening
              ? "Listening..."
              : hasTranscript
                ? "Sending..."
                : "Tap mic or say something"}
          </p>

          {/* Transcript */}
          {hasTranscript && (
            <div
              className="w-full p-4 rounded-xl mb-4"
              style={{
                backgroundColor: "#0F1115",
                border: "1px solid #2D333B",
              }}
            >
              <p
                className="text-base"
                style={{
                  color: isInterim ? "#9CA3AF" : "#FFFFFF",
                  fontStyle: isInterim ? "italic" : "normal",
                }}
              >
                {transcript}
              </p>
            </div>
          )}

          {/* Manual send button (if transcript exists and not auto-sending) */}
          {hasTranscript && !isListening && isInterim && (
            <Button
              onClick={handleSend}
              className="mb-4"
              style={{ backgroundColor: "#4ADE80", color: "#0F1115" }}
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          )}

          {/* Suggestions (shown before listening starts) */}
          {!hasTranscript && !isListening && (
            <div className="w-full mt-2">
              <p
                className="text-xs mb-3"
                style={{ color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Or try saying
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-all"
                    style={{
                      backgroundColor: "transparent",
                      borderColor: "#2D333B",
                      color: "#9CA3AF",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#4ADE80";
                      e.currentTarget.style.color = "#FFFFFF";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#2D333B";
                      e.currentTarget.style.color = "#9CA3AF";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cancel hint */}
          <p
            className="mt-6"
            style={{ color: "#6B7280", fontSize: "10px", fontFamily: "monospace" }}
          >
            Press Escape to cancel
          </p>
        </div>
      </div>
    </div>
  );
}
