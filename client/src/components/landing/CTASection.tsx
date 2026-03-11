import { useTranslation } from "react-i18next";

interface CTASectionProps {
  onGetStarted: () => void;
}

export function CTASection({ onGetStarted }: CTASectionProps) {
  const { t } = useTranslation('landing');

  return (
    <section className="landing-cta landing-section">
      <div className="cta-glow-bg" />
      <div className="cta-inner rv">
        <div className="cta-tag"><span />{" "}{t('cta.tag')}{" "}<span /></div>
        <h2 className="cta-h2">{t('cta.headline')}<br /><em>{t('cta.headlineSub')}</em></h2>
        <p className="cta-sub">{t('cta.subtext')}</p>
        <div className="cta-btns">
          <button className="btn-hero-main" onClick={onGetStarted}>
            {t('cta.primary')}
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5H11M7.5 1L11 4.5L7.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="btn-hero-ghost" onClick={onGetStarted}>{t('cta.secondary')}</button>
        </div>
        <p className="cta-note">{t('cta.disclaimer')}</p>
      </div>
    </section>
  );
}
