import { Trans, useTranslation } from "react-i18next";

const FEATURES = [
  { num: "01 / 06", icon: "\uD83D\uDCCB", key: "1", tags: ["GANTT", "TASKS", "MILESTONES"] },
  { num: "02 / 06", icon: "\uD83D\uDC65", key: "2", tags: ["MAGIC LINK", "APPROVALS"] },
  { num: "03 / 06", icon: "\uD83D\uDCB0", key: "3", tags: ["CHANGE ORDERS", "INVOICING"] },
  { num: "04 / 06", icon: "\u2726", key: "4", tags: ["NATURAL LANGUAGE", "RISK DETECTION"] },
  { num: "05 / 06", icon: "\uD83D\uDD27", key: "5", tags: ["MAGIC LINK", "SCORING"] },
  { num: "06 / 06", icon: "\uD83D\uDCCA", key: "6", tags: ["REAL-TIME", "KPIs"] },
];

export function FeaturesSection() {
  const { t } = useTranslation('landing');

  return (
    <section className="landing-features landing-section" id="platform">
      <div className="landing-w">
        <div className="landing-tag rv">{t('features.tag')}</div>
        <h2 className="landing-h2 rv"><Trans i18nKey="features.headline" ns="landing" components={{ em: <em /> }} /></h2>
      </div>
      <div className="features-grid">
        {FEATURES.map((f) => (
          <div key={f.num} className="feature-card rv">
            <div className="feature-card-top">
              <div className="feature-card-glow" />
              <div className="feature-num">{f.num}</div>
              <div className="feature-ico">{f.icon}</div>
              <h3 className="feature-title">{t(`features.${f.key}.title`)}</h3>
            </div>
            <div className="feature-card-bot">
              <p className="feature-desc">{t(`features.${f.key}.desc`)}</p>
              <div className="feature-tags">
                {f.tags.map((tag) => (
                  <span key={tag} className="feature-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
