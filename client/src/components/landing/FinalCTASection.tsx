import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useGSAP, usePrefersReducedMotion } from '@/hooks/useGSAP';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface FinalCTASectionProps {
  onRequestDemo: () => void;
}

export function FinalCTASection({ onRequestDemo }: FinalCTASectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { t } = useTranslation('landing');

  useGSAP((gsap) => {
    if (prefersReducedMotion) {
      gsap.set('.cta-animate', { opacity: 1, y: 0 });
      return;
    }

    // CTA content fade in
    gsap.from('.cta-content', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      scrollTrigger: {
        trigger: '.cta-content',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });

    // Footer fade in
    gsap.from('.footer-content', {
      opacity: 0,
      duration: 0.6,
      scrollTrigger: {
        trigger: '.footer-content',
        start: 'top 95%',
        toggleActions: 'play none none none'
      }
    });
  }, { scope: sectionRef, dependencies: [prefersReducedMotion] });

  return (
    <section ref={sectionRef}>
      {/* CTA Section */}
      <div
        className="relative py-24 md:py-32"
        style={{ backgroundColor: '#0F1115' }}
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 100% 80% at 50% 100%, rgba(74, 222, 128, 0.1), transparent),
              radial-gradient(circle at 50% 0%, rgba(74, 222, 128, 0.05), transparent 50%)
            `,
          }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <div className="cta-content text-center max-w-3xl mx-auto">
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6"
              style={{ color: '#FFFFFF' }}
            >
              {t('finalCta.headline1')}{' '}
              <span style={{ color: '#4ADE80' }}>{t('finalCta.headline2')}</span>?
            </h2>
            <p
              className="text-lg mb-10"
              style={{ color: '#9CA3AF' }}
            >
              {t('finalCta.subtext')}
            </p>

            {/* CTA Button */}
            <div className="flex justify-center mb-6">
              <Button
                onClick={onRequestDemo}
                size="lg"
                className="group font-semibold px-8 h-14 rounded-full text-base transition-all duration-300"
                style={{
                  backgroundColor: '#4ADE80',
                  color: '#0F1115',
                  boxShadow: '0 0 40px rgba(74, 222, 128, 0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(74, 222, 128, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(74, 222, 128, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {t('finalCta.cta')}
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <p className="text-sm" style={{ color: '#6B7280' }}>
              {t('finalCta.disclaimer')}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="py-12 border-t"
        style={{ backgroundColor: '#0A0A0A', borderColor: '#2D333B' }}
      >
        <div className="footer-content container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <Logo size="sm" variant="full" />

            {/* Links */}
            <div className="flex items-center gap-8 text-sm">
              <a
                href="#"
                className="transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
              >
                {t('footer.privacy')}
              </a>
              <a
                href="#"
                className="transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
              >
                {t('footer.terms')}
              </a>
              <a
                href="#"
                className="transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
              >
                {t('footer.contact')}
              </a>
            </div>

            {/* Copyright */}
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {t('footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
