import { useTranslation } from "react-i18next";

const ITEM_KEYS = [
  "marquee.projectManagement",
  "marquee.clientPortal",
  "marquee.aiIntelligence",
  "marquee.financialControl",
  "marquee.subcontractorHub",
  "marquee.scheduleManagement",
  "marquee.liveReporting",
  "marquee.issueTracking",
  "marquee.paymentMilestones",
  "marquee.photoHub",
] as const;

export function Marquee() {
  const { t } = useTranslation('landing');

  const items = ITEM_KEYS.map((key) => t(key));

  return (
    <div className="landing-marquee" aria-hidden="true">
      <div className="mq-track">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="mq-item">
            <span className="mq-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
