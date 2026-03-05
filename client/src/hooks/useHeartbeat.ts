import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Sends periodic heartbeat pings to track time-in-app.
 * Pauses when the tab is hidden and resumes when visible.
 *
 * @param agentActive - whether the AI agent drawer is currently open
 */
export function useHeartbeat(agentActive: boolean) {
  const agentActiveRef = useRef(agentActive);
  agentActiveRef.current = agentActive;

  useEffect(() => {
    const sendHeartbeat = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        await fetch("/api/v1/analytics/heartbeat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentActive: agentActiveRef.current }),
        });
      } catch {
        // Silently fail — analytics must never interfere with UX
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Pause when tab hidden, resume on visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}
