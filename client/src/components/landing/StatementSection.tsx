import { useTranslation } from "react-i18next";

export function StatementSection() {
  const { t } = useTranslation('landing');

  return (
    <section className="landing-statement landing-section">
      <div className="stmt-bg-word" aria-hidden="true">CONTROL</div>
      <div className="stmt-grid">
        <div>
          <div className="landing-tag rv">{t('statement.tag')}</div>
          <h2 className="landing-h2 rv">
            {t('statement.headline1')}<br />{t('statement.headline2')}<br /><em>{t('statement.headline3')}</em>
          </h2>
        </div>
        <div className="stmt-briefing rv">
          <div className="stmt-briefing-glow" />
          <div className="stmt-briefing-card">
            <div className="sbr-head">
              <div className="sbr-badge">
                <span className="sbr-live-dot" />
                {t('statement.briefingTitle')}
              </div>
              <div className="sbr-date">{t('statement.briefingDate')}</div>
            </div>
            <div className="sbr-body">
              <div className="sbr-text">
                <strong>{t('statement.activeJobs')}</strong> {t('statement.today')}{' '}
                <span className="sbr-hi-risk">{t('statement.harborView')}</span> &mdash; {t('statement.framingCrew')}
                {' '}{t('statement.oakAve')}{' '}
                <span className="sbr-hi-risk">{t('statement.overdue')}</span> &middot; {t('statement.martinez')}{' '}
                <span className="sbr-hi-mint">{t('statement.pineCt')}</span>
              </div>
              <div className="sbr-chips">
                <div className="sbr-chip risk"><span className="sbr-chip-spark">{"\u2726"}</span>{t('statement.harborViewShort')}</div>
                <div className="sbr-chip"><span className="sbr-chip-spark">{"\u2726"}</span>{t('statement.oakAveDelivery')}</div>
                <div className="sbr-chip risk"><span className="sbr-chip-spark">{"\u2726"}</span>{t('statement.overdueShort')}</div>
                <div className="sbr-chip"><span className="sbr-chip-spark">{"\u2726"}</span>{t('statement.scheduleInspection')}</div>
              </div>
            </div>
            <div className="sbr-foot">
              <span><span className="sbr-foot-mint">3</span> {t('statement.risksDetected')}</span>
              <span><span className="sbr-foot-mint">2</span> {t('statement.actionsSuggested')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
