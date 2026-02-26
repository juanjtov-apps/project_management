import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="stages-tab"]',
    title: "Project Progress",
    content:
      "Track your project timeline and milestones here. See each stage of work and its current status.",
    disableBeacon: true,
  },
  {
    target: '[data-tour="issues-tab"]',
    title: "Issues & Approvals",
    content:
      "Report issues, request changes, or approve selections directly from this tab.",
    disableBeacon: true,
  },
  {
    target: '[data-tour="forum-tab"]',
    title: "Communication",
    content:
      "Message your project manager anytime. Ask questions, share feedback, or get updates.",
    disableBeacon: true,
  },
  {
    target: '[data-tour="materials-tab"]',
    title: "Materials",
    content:
      "View and collaborate on material selections for your project. Add specs, vendors, and links.",
    disableBeacon: true,
  },
  {
    target: '[data-tour="installments-tab"]',
    title: "Payments",
    content:
      "View your payment schedule and upload proof of payments for each installment.",
    disableBeacon: true,
  },
];

interface ClientTourProps {
  forceShow?: boolean;
}

export default function ClientTour({ forceShow }: ClientTourProps) {
  const [run, setRun] = useState(false);

  const { data: invitationStatus } = useQuery<{
    hasInvitation: boolean;
    hasCompletedTour: boolean;
  }>({
    queryKey: ["/api/v1/onboarding/invitation-status"],
    retry: false,
  });

  const completeTourMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/v1/onboarding/complete-tour", {
        method: "POST",
      });
    },
  });

  useEffect(() => {
    if (forceShow) {
      // Brief delay so DOM elements are rendered
      const timer = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(timer);
    }
    if (invitationStatus && !invitationStatus.hasCompletedTour) {
      const timer = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(timer);
    }
  }, [invitationStatus, forceShow]);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      completeTourMutation.mutate();
    }
  };

  if (!run) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: "#2563eb",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        buttonNext: {
          borderRadius: 8,
          padding: "8px 16px",
        },
        buttonSkip: {
          color: "#6b7280",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Got it!",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
}
