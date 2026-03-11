import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const STORAGE_PREFIX = "proesphere_tutorial_done_";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function usePlatformTutorial() {
  const [run, setRun] = useState(false);
  const [hasAutoChecked, setHasAutoChecked] = useState(false);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/v1/auth/user"],
    retry: false,
  });

  const userId: string | undefined = currentUser?.id;

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/v1/users/me/preferences", {
        method: "PATCH",
        body: { preferences: { hasCompletedTutorial: true } },
      });
    },
  });

  // Auto-show on first login (once per user)
  useEffect(() => {
    if (hasAutoChecked || !userId) return;
    setHasAutoChecked(true);

    // Fast: localStorage already marked for this user
    if (localStorage.getItem(storageKey(userId)) === "1") return;

    // Backend: check preferences from auth response
    const prefs = currentUser?.preferences;
    if (prefs?.hasCompletedTutorial === true) {
      localStorage.setItem(storageKey(userId), "1");
      return;
    }

    // Neither says done → start the tour after a brief DOM-ready delay
    const timer = setTimeout(() => setRun(true), 800);
    return () => clearTimeout(timer);
  }, [currentUser, userId, hasAutoChecked]);

  const completeTutorial = useCallback(() => {
    setRun(false);
    if (userId) localStorage.setItem(storageKey(userId), "1");
    completeMutation.mutate();
  }, [completeMutation, userId]);

  const showTutorial = useCallback(() => {
    setRun(true);
  }, []);

  return { run, showTutorial, completeTutorial };
}
