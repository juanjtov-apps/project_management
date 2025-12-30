import { useRef } from 'react';
import { X, Check } from 'lucide-react';
import { useGSAP, usePrefersReducedMotion } from '@/hooks/useGSAP';
import { SectionHeader } from './shared';

const withoutItems = [
  'Switching between 5+ apps',
  'Manual status tracking',
  'Compiling reports by hand',
  'Chasing down updates',
  'Reactive firefighting'
];

const withItems = [
  'One interface for everything',
  'Automatic progress awareness',
  'Reports generated on demand',
  'Updates surfaced proactively',
  'Preventive problem-solving'
];

export function ValueShiftSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP((gsap) => {
    if (prefersReducedMotion) {
      gsap.set(['.value-without', '.value-with', '.value-statement', '.check-item'], {
        opacity: 1,
        x: 0,
        y: 0
      });
      return;
    }

    // Left column slides from left
    gsap.from('.value-without', {
      x: -50,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.value-grid',
        start: 'top 75%',
        toggleActions: 'play none none reverse'
      }
    });

    // Right column slides from right
    gsap.from('.value-with', {
      x: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.value-grid',
        start: 'top 75%',
        toggleActions: 'play none none reverse'
      }
    });

    // Checkmarks bounce in (only exception to no-bounce rule)
    gsap.from('.check-item', {
      x: -20,
      opacity: 0,
      stagger: 0.1,
      duration: 0.5,
      delay: 0.4,
      ease: 'back.out(1.2)',
      scrollTrigger: {
        trigger: '.value-with',
        start: 'top 70%',
        toggleActions: 'play none none reverse'
      }
    });

    // Supporting statement fades in
    gsap.from('.value-statement', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      delay: 0.6,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.value-statement',
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  }, { scope: sectionRef, dependencies: [prefersReducedMotion] });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 lg:py-40"
      style={{ backgroundColor: '#0F1115' }}
    >
      {/* Top border */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.2), transparent)'
        }}
      />

      <div className="container mx-auto px-6">
        <SectionHeader
          eyebrow="The Shift"
          title="Your time, reclaimed"
          className="mb-16 md:mb-20"
        />

        {/* Comparison Grid */}
        <div className="value-grid grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Without Proesphere (Left) */}
          <div
            className="value-without relative p-8 rounded-2xl border"
            style={{
              backgroundColor: 'rgba(22, 27, 34, 0.5)',
              borderColor: '#2D333B'
            }}
          >
            {/* Subtle red glow */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none opacity-20"
              style={{
                background: 'radial-gradient(ellipse 80% 80% at 50% 0%, rgba(239, 68, 68, 0.15), transparent)'
              }}
            />

            <h3
              className="relative text-lg font-semibold mb-6"
              style={{ color: '#6B7280' }}
            >
              Without Proesphere
            </h3>
            <ul className="relative space-y-4">
              {withoutItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                    style={{ color: '#EF4444' }}
                  />
                  <span style={{ color: '#9CA3AF' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* With Proesphere (Right) */}
          <div
            className="value-with relative p-8 rounded-2xl border"
            style={{
              backgroundColor: '#161B22',
              borderColor: 'rgba(74, 222, 128, 0.3)'
            }}
          >
            {/* Mint glow */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 80% at 50% 0%, rgba(74, 222, 128, 0.08), transparent)'
              }}
            />

            <h3
              className="relative text-lg font-semibold mb-6"
              style={{ color: '#4ADE80' }}
            >
              With Proesphere
            </h3>
            <ul className="relative space-y-4">
              {withItems.map((item) => (
                <li key={item} className="check-item flex items-start gap-3">
                  <Check
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                    style={{ color: '#4ADE80' }}
                  />
                  <span style={{ color: '#FFFFFF' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Supporting Statement */}
        <p
          className="value-statement text-center text-lg max-w-2xl mx-auto mt-12 leading-relaxed"
          style={{ color: '#9CA3AF' }}
        >
          When you're not hunting for information, you're free to do what
          actually moves projects forward: client communication, quality
          oversight, team leadership.
        </p>
      </div>
    </section>
  );
}
