import { useTranslation } from "react-i18next";

export function LandingFooter() {
  const { t } = useTranslation('landing');

  return (
    <footer className="landing-footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand-name">
            <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
              <path d="M26 3L47 13V26C47 37.6 37.6 47 26 47C14.4 47 5 37.6 5 26V13L26 3Z" stroke="rgba(0,194,120,0.45)" strokeWidth="1.1" fill="rgba(0,194,120,0.04)" />
              <circle cx="26" cy="26" r="3.8" fill="#00C278" />
            </svg>
            Proesphere
          </div>
          <p className="footer-brand-desc">
            {t('footer.tagline')}
          </p>
        </div>
        <div>
          <div className="footer-col-title">{t('footer.platform')}</div>
          <ul className="footer-links">
            <li><a href="#">{t('footer.projectManagement')}</a></li>
            <li><a href="#">{t('footer.clientPortal')}</a></li>
            <li><a href="#">{t('footer.aiFeatures')}</a></li>
            <li><a href="#">{t('footer.financialTools')}</a></li>
            <li><a href="#">{t('footer.subcontractors')}</a></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">{t('footer.company')}</div>
          <ul className="footer-links">
            <li><a href="#">{t('footer.about')}</a></li>
            <li><a href="#">{t('footer.blog')}</a></li>
            <li><a href="#">{t('footer.careers')}</a></li>
            <li><a href="#">{t('footer.contact')}</a></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">{t('footer.resources')}</div>
          <ul className="footer-links">
            <li><a href="#">{t('footer.documentation')}</a></li>
            <li><a href="#">{t('footer.support')}</a></li>
            <li><a href="#">{t('footer.api')}</a></li>
            <li><a href="#">{t('footer.status')}</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-copy">{t('footer.copyright')}</span>
        <div className="footer-legal">
          <a href="#">{t('footer.privacy')}</a>
          <a href="#">{t('footer.terms')}</a>
          <a href="#">{t('footer.security')}</a>
        </div>
      </div>
    </footer>
  );
}
