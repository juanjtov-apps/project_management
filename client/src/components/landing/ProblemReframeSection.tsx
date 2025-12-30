import { useRef } from 'react';
import { useGSAP, usePrefersReducedMotion } from '@/hooks/useGSAP';
import { CountUp } from './shared';

export function ProblemReframeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP((gsap) => {
    if (prefersReducedMotion) {
      gsap.set('.problem-text', { opacity: 1, y: 0 });
      return;
    }

    gsap.from('.problem-text', {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });
  }, { scope: sectionRef, dependencies: [prefersReducedMotion] });

  return (
    <section
      ref={sectionRef}
      className="relative pt-12 md:pt-16 lg:pt-20 pb-24 md:pb-32 lg:pb-40 overflow-hidden"
      style={{ backgroundColor: '#0F1115' }}
    >
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(74, 222, 128, 0.03), transparent)'
        }}
      />

      <div className="container mx-auto px-6">
        <div className="problem-text max-w-[640px] mx-auto text-center">
          <p
            className="text-xl md:text-2xl lg:text-[1.75rem] leading-relaxed"
            style={{ color: '#9CA3AF' }}
          >
            You didn't become a project manager to chase down spreadsheets, cross-reference schedules, and manually compile reports.
          </p>
          <p
            className="text-xl md:text-2xl lg:text-[1.75rem] leading-relaxed mt-8"
            style={{ color: '#9CA3AF' }}
          >
            Yet that's where{' '}
            <span
              className="relative inline-block font-bold text-xl md:text-2xl lg:text-[1.75rem]"
              style={{ color: '#4ADE80' }}
            >
              {/* Glow effect behind the number */}
              <span
                className="absolute inset-0 blur-xl opacity-50"
                style={{ backgroundColor: '#4ADE80' }}
                aria-hidden="true"
              />
              <span className="relative">
                <CountUp end={60} suffix="%" duration={2} />
              </span>
            </span>
            {' '}of your time goes.
          </p>
        </div>
      </div>
    </section>
  );
}
