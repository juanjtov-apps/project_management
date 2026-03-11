import { useTranslation } from "react-i18next";

interface PricingSectionProps {
  onGetStarted: () => void;
}

export function PricingSection({ onGetStarted }: PricingSectionProps) {
  const { t } = useTranslation('landing');

  return (
    <section className="landing-pricing landing-section" id="pricing">
      <div className="pricing-inner">
        <div className="pricing-header rv">
          <div className="landing-tag" style={{ justifyContent: 'center' }}>{t('pricing.tag')}</div>
          <h2 className="landing-h2" style={{ textAlign: 'center' }}>{t('pricing.headline')}<br /><em>{t('pricing.headlineSub')}</em></h2>
        </div>
        <div className="pricing-cards">
          <div className="pricing-card rv">
            <div className="pricing-name">{t('pricing.starter.name')}</div>
            <div className="pricing-price"><sup>$</sup>{t('pricing.starter.price')}</div>
            <div className="pricing-period">{t('pricing.starter.period')}</div>
            <div className="pricing-rule" />
            <ul className="pricing-features">
              <li>{t('pricing.starter.feature1')}</li>
              <li>{t('pricing.starter.feature2')}</li>
              <li>{t('pricing.starter.feature3')}</li>
              <li>{t('pricing.starter.feature4')}</li>
              <li>{t('pricing.starter.feature5')}</li>
            </ul>
            <button className="pricing-btn ghost" onClick={onGetStarted}>{t('pricing.starter.cta')}</button>
          </div>

          <div className="pricing-card featured rv">
            <div className="pricing-badge">{t('pricing.pro.badge')}</div>
            <div className="pricing-name">{t('pricing.pro.name')}</div>
            <div className="pricing-price"><sup>$</sup>{t('pricing.pro.price')}</div>
            <div className="pricing-period">{t('pricing.pro.period')}</div>
            <div className="pricing-rule" />
            <ul className="pricing-features">
              <li>{t('pricing.pro.feature1')}</li>
              <li>{t('pricing.pro.feature2')}</li>
              <li>{t('pricing.pro.feature3')}</li>
              <li>{t('pricing.pro.feature4')}</li>
              <li>{t('pricing.pro.feature5')}</li>
              <li>{t('pricing.pro.feature6')}</li>
            </ul>
            <button className="pricing-btn solid" onClick={onGetStarted}>{t('pricing.pro.cta')}</button>
          </div>

          <div className="pricing-card rv">
            <div className="pricing-name">{t('pricing.enterprise.name')}</div>
            <div className="pricing-price" style={{ fontSize: 34, paddingTop: 10 }}>{t('pricing.enterprise.price')}</div>
            <div className="pricing-period">{t('pricing.enterprise.period')}</div>
            <div className="pricing-rule" />
            <ul className="pricing-features">
              <li>{t('pricing.enterprise.feature1')}</li>
              <li>{t('pricing.enterprise.feature2')}</li>
              <li>{t('pricing.enterprise.feature3')}</li>
              <li>{t('pricing.enterprise.feature4')}</li>
              <li>{t('pricing.enterprise.feature5')}</li>
            </ul>
            <button className="pricing-btn ghost" onClick={onGetStarted}>{t('pricing.enterprise.cta')}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
