import { useTranslation } from "react-i18next";

const TESTIMONIAL_KEYS = ["1", "2", "3"] as const;
const AVATARS = ["\uD83D\uDC77", "\uD83C\uDFD7\uFE0F", "\u2692\uFE0F"];

export function TestimonialsSection() {
  const { t } = useTranslation('landing');

  return (
    <section className="landing-testimonials landing-section">
      <div className="testi-inner">
        <div className="testi-header rv">
          <div>
            <div className="landing-tag">{t('testimonials.tag')}</div>
            <h2 className="landing-h2">{t('testimonials.headline')}<br /><em>{t('testimonials.headlineSub')}</em></h2>
          </div>
          <div className="testi-count">{t('testimonials.activeContractors')}</div>
        </div>
        <div className="testi-grid">
          {TESTIMONIAL_KEYS.map((key, index) => (
            <div key={key} className="testi-card rv">
              <div className="testi-qm">&ldquo;</div>
              <p className="testi-quote">{t(`testimonials.${key}.quote`)}</p>
              <div className="testi-author">
                <div className="testi-avatar">{AVATARS[index]}</div>
                <div>
                  <div className="testi-name">{t(`testimonials.${key}.name`)}</div>
                  <div className="testi-role">{t(`testimonials.${key}.role`)}</div>
                </div>
                <div className="testi-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
