import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";

interface ClientTourProps {
  forceShow?: boolean;
}

export default function ClientTour({ forceShow }: ClientTourProps) {
  const { t } = useTranslation('common');
  const [run, setRun] = useState(false);

  const TOUR_STEPS: Step[] = [
    {
      target: '[data-tour="stages-tab"]',
      title: t('tour.stagesTitle'),
      content: t('tour.stagesContent'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="issues-tab"]',
      title: t('tour.issuesTitle'),
      content: t('tour.issuesContent'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="forum-tab"]',
      title: t('tour.forumTitle'),
      content: t('tour.forumContent'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="materials-tab"]',
      title: t('tour.materialsTitle'),
      content: t('tour.materialsContent'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="installments-tab"]',
      title: t('tour.paymentsTitle'),
      content: t('tour.paymentsContent'),
      disableBeacon: true,
    },
  ];

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
        back: t('tour.back'),
        close: t('tour.close'),
        last: t('tour.gotIt'),
        next: t('tour.next'),
        skip: t('tour.skipTour'),
      }}
    />
  );
}
