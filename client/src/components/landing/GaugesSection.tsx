import { useTranslation } from "react-i18next";

const GAUGES = [
  { value: "76%", labelKey: "gauges.lessAdmin", offset: 45.2 },
  { value: "88%", labelKey: "gauges.fewerCalls", offset: 22.6 },
  { value: "60%", labelKey: "gauges.fasterInvoicing", offset: 75.4 },
  { value: "95%", labelKey: "gauges.recommend", offset: 9.4 },
];

export function GaugesSection() {
  const { t } = useTranslation('landing');

  return (
    <section className="landing-gauges landing-section">
      <div className="gauges-inner">
        <div>
          <div className="landing-tag rv">{t('gauges.tag')}</div>
          <h2 className="landing-h2 rv">{t('gauges.headline')}<br /><em>{t('gauges.headlineSub')}</em></h2>
          <p className="landing-p rv" style={{ marginTop: 16 }}>
            {t('gauges.subtext')}
          </p>
        </div>
        <div className="gauges-grid rv">
          {GAUGES.map((g) => (
            <div key={g.labelKey} className="gauge-card">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(237,232,223,0.06)" strokeWidth="5" />
                <circle cx="40" cy="40" r="30" fill="none" stroke="#00C278" strokeWidth="5" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset={g.offset} transform="rotate(-90 40 40)" />
              </svg>
              <div className="gauge-val">{g.value}</div>
              <div className="gauge-label">{t(g.labelKey)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
