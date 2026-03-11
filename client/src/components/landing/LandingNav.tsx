import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface LandingNavProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

export function LandingNav({ onSignIn, onGetStarted }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const { t, i18n } = useTranslation('landing');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(nextLang);
  };

  return (
    <nav className={`landing-nav${scrolled ? " scrolled" : ""}`}>
      <a href="/" className="ln-logo">
        <svg width="28" height="28" viewBox="0 0 52 52" fill="none">
          <path d="M26 3L47 13V26C47 37.6 37.6 47 26 47C14.4 47 5 37.6 5 26V13L26 3Z" stroke="rgba(0,194,120,0.55)" strokeWidth="1.1" fill="rgba(0,194,120,0.05)" />
          <circle cx="26" cy="26" r="3.8" fill="#00C278" />
        </svg>
        <span className="ln-logo-name">Proesphere</span>
      </a>
      <ul className="ln-links">
        <li><a href="#platform">{t('nav.platform')}</a></li>
        <li><a href="#ai">{t('nav.ai')}</a></li>
        <li><a href="#pricing">{t('nav.pricing')}</a></li>
      </ul>
      <div className="ln-right">
        <button
          className="ln-signin"
          onClick={toggleLanguage}
          style={{ opacity: 0.7, fontSize: '0.85rem', letterSpacing: '0.05em' }}
        >
          {i18n.language === 'es' ? 'EN' : 'ES'}
        </button>
        <button className="ln-signin" onClick={onSignIn}>{t('nav.signIn')}</button>
        <button className="ln-cta" onClick={onGetStarted}>
          {t('nav.getStarted')}
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5H11M7.5 1L11 4.5L7.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </nav>
  );
}
