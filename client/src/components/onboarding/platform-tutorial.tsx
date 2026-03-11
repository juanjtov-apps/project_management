import { useTranslation } from "react-i18next";
import Joyride, { Step, CallBackProps, STATUS, ACTIONS } from "react-joyride";

interface PlatformTutorialProps {
  run: boolean;
  onComplete: () => void;
  userRole: string;
}

export default function PlatformTutorial({
  run,
  onComplete,
  userRole,
}: PlatformTutorialProps) {
  const { t } = useTranslation("common");

  const role = (userRole || "").toLowerCase();
  const isSubUser = role === "subcontractor" || role === "contractor";

  const staffSteps: Step[] = [
    {
      target: '[data-tour="morning-briefing"]',
      title: t("tutorial.staff.briefingTitle"),
      content: t("tutorial.staff.briefingContent"),
      disableBeacon: true,
      placement: "bottom",
    },
    {
      target: '[data-tour="embedded-chat"]',
      title: t("tutorial.staff.chatTitle"),
      content: t("tutorial.staff.chatContent"),
      disableBeacon: true,
      placement: "top",
    },
    {
      target: '[data-tour="chat-input"]',
      title: t("tutorial.staff.inputTitle"),
      content: t("tutorial.staff.inputContent"),
      disableBeacon: true,
      placement: "top",
    },
    {
      target: '[data-tour="active-jobs"]',
      title: t("tutorial.staff.jobsTitle"),
      content: t("tutorial.staff.jobsContent"),
      disableBeacon: true,
      placement: "left",
    },
  ];

  const subSteps: Step[] = [
    {
      target: '[data-tour="sub-tasks-tab"]',
      title: t("tutorial.sub.tasksTitle"),
      content: t("tutorial.sub.tasksContent"),
      disableBeacon: true,
    },
    {
      target: '[data-tour="sub-schedule-tab"]',
      title: t("tutorial.sub.scheduleTitle"),
      content: t("tutorial.sub.scheduleContent"),
      disableBeacon: true,
    },
    {
      target: '[data-tour="sub-payments-tab"]',
      title: t("tutorial.sub.paymentsTitle"),
      content: t("tutorial.sub.paymentsContent"),
      disableBeacon: true,
    },
    {
      target: '[data-tour="sub-profile-tab"]',
      title: t("tutorial.sub.profileTitle"),
      content: t("tutorial.sub.profileContent"),
      disableBeacon: true,
    },
  ];

  // Filter staff steps: remove "active-jobs" on small screens where the panel is hidden
  const filteredStaffSteps = staffSteps.filter((step) => {
    if (step.target === '[data-tour="active-jobs"]') {
      return window.innerWidth >= 1280; // xl breakpoint
    }
    return true;
  });

  const steps = isSubUser ? subSteps : filteredStaffSteps;

  const handleCallback = (data: CallBackProps) => {
    const { status, action } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      onComplete();
    }
  };

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      spotlightClicks
      disableOverlayClose={false}
      callback={handleCallback}
      styles={{
        options: {
          backgroundColor: "#161B22",
          textColor: "#FFFFFF",
          primaryColor: "#4ADE80",
          arrowColor: "#161B22",
          overlayColor: "rgba(0, 0, 0, 0.70)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 16,
          padding: 24,
          border: "1px solid #2D333B",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          maxWidth: 380,
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 4,
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.6,
          color: "#9CA3AF",
          padding: "8px 0 0",
        },
        buttonNext: {
          backgroundColor: "#4ADE80",
          color: "#0F1115",
          borderRadius: 8,
          padding: "8px 20px",
          fontWeight: 600,
          fontSize: 14,
        },
        buttonBack: {
          color: "#9CA3AF",
          marginRight: 8,
          fontSize: 14,
        },
        buttonSkip: {
          color: "#6B7280",
          fontSize: 13,
        },
        spotlight: {
          borderRadius: 12,
        },
      }}
      locale={{
        back: t("tour.back"),
        close: t("tour.close"),
        last: t("tour.gotIt"),
        next: t("tour.next"),
        skip: t("tour.skipTour"),
      }}
    />
  );
}
