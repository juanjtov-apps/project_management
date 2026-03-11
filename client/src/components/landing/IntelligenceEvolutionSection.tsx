import { useRef } from 'react';
import { Eye, Lightbulb, Shield } from 'lucide-react';
import { useGSAP, usePrefersReducedMotion, useIsMobile } from '@/hooks/useGSAP';
import { SectionHeader } from './shared';
import { useTranslation } from "react-i18next";
import type { LucideIcon } from 'lucide-react';

interface TimelineStage {
  labelKey: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const stages: TimelineStage[] = [
  {
    labelKey: 'intelligence.day1.label',
    icon: Eye,
    titleKey: 'intelligence.day1.title',
    descKey: 'intelligence.day1.desc'
  },
  {
    labelKey: 'intelligence.month1.label',
    icon: Lightbulb,
    titleKey: 'intelligence.month1.title',
    descKey: 'intelligence.month1.desc'
  },
  {
    labelKey: 'intelligence.overTime.label',
    icon: Shield,
    titleKey: 'intelligence.overTime.title',
    descKey: 'intelligence.overTime.desc'
  }
];

export function IntelligenceEvolutionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile(1024);
  const { t } = useTranslation('landing');

  useGSAP((gsap) => {
    if (prefersReducedMotion) {
      gsap.set(['.timeline-node', '.timeline-line', '.timeline-quote'], { opacity: 1, y: 0, scaleX: 1 });
      return;
    }

    // Timeline nodes reveal sequentially
    gsap.from('.timeline-node', {
      y: 40,
      opacity: 0,
      stagger: 0.25,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.timeline-container',
        start: 'top 75%',
        toggleActions: 'play none none reverse'
      }
    });

    // Connecting line animates
    gsap.from('.timeline-line', {
      scaleX: 0,
      transformOrigin: 'left center',
      duration: 1.2,
      ease: 'power2.inOut',
      scrollTrigger: {
        trigger: '.timeline-container',
        start: 'top 75%',
        toggleActions: 'play none none reverse'
      }
    });

    // Quote fades in last
    gsap.from('.timeline-quote', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      delay: 0.6,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.timeline-quote',
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  }, { scope: sectionRef, dependencies: [prefersReducedMotion, isMobile] });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: '#0F1115' }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(74, 222, 128, 0.04), transparent)'
        }}
      />

      <div className="container mx-auto px-6">
        <SectionHeader
          eyebrow={t('intelligence.tag')}
          title={t('intelligence.headline')}
          className="mb-16 md:mb-24"
        />

        {/* Timeline Container */}
        <div className="timeline-container relative max-w-4xl mx-auto">
          {/* Desktop: Horizontal Timeline */}
          {!isMobile && (
            <>
              {/* Connecting Line */}
              <div
                className="timeline-line absolute top-[60px] left-[10%] right-[10%] h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, rgba(74, 222, 128, 0.2), rgba(74, 222, 128, 0.6), rgba(74, 222, 128, 0.2))'
                }}
              />

              {/* Timeline Nodes */}
              <div className="grid grid-cols-3 gap-8">
                {stages.map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <div key={stage.labelKey} className="timeline-node text-center">
                      {/* Label */}
                      <p
                        className="text-xs uppercase tracking-[0.2em] mb-4 font-medium"
                        style={{ color: '#6B7280' }}
                      >
                        {t(stage.labelKey)}
                      </p>

                      {/* Icon Node */}
                      <div className="relative inline-flex items-center justify-center mb-6">
                        {/* Glow effect */}
                        <div
                          className="absolute w-20 h-20 rounded-full blur-xl opacity-30"
                          style={{ backgroundColor: '#4ADE80' }}
                        />
                        {/* Node circle */}
                        <div
                          className="relative w-14 h-14 rounded-full flex items-center justify-center border-2"
                          style={{
                            backgroundColor: '#161B22',
                            borderColor: '#4ADE80'
                          }}
                        >
                          <Icon className="w-6 h-6" style={{ color: '#4ADE80' }} />
                        </div>
                      </div>

                      {/* Title */}
                      <h3
                        className="text-xl font-semibold mb-2"
                        style={{ color: '#FFFFFF' }}
                      >
                        {t(stage.titleKey)}
                      </h3>

                      {/* Description */}
                      <p
                        className="text-sm leading-relaxed max-w-[200px] mx-auto"
                        style={{ color: '#9CA3AF' }}
                      >
                        {t(stage.descKey)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Mobile: Vertical Timeline */}
          {isMobile && (
            <div className="relative pl-12">
              {/* Vertical Line */}
              <div
                className="timeline-line absolute left-5 top-0 bottom-0 w-[2px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(74, 222, 128, 0.2), rgba(74, 222, 128, 0.6), rgba(74, 222, 128, 0.2))'
                }}
              />

              <div className="space-y-12">
                {stages.map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <div key={stage.labelKey} className="timeline-node relative">
                      {/* Node */}
                      <div
                        className="absolute left-[-28px] w-10 h-10 rounded-full flex items-center justify-center border-2"
                        style={{
                          backgroundColor: '#161B22',
                          borderColor: '#4ADE80'
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: '#4ADE80' }} />
                      </div>

                      {/* Content */}
                      <div>
                        <p
                          className="text-xs uppercase tracking-[0.2em] mb-2 font-medium"
                          style={{ color: '#6B7280' }}
                        >
                          {t(stage.labelKey)}
                        </p>
                        <h3
                          className="text-lg font-semibold mb-1"
                          style={{ color: '#FFFFFF' }}
                        >
                          {t(stage.titleKey)}
                        </h3>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: '#9CA3AF' }}
                        >
                          {t(stage.descKey)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quote Callout */}
        <blockquote
          className="timeline-quote mt-16 md:mt-24 max-w-2xl mx-auto border-l-2 pl-6 italic"
          style={{ borderColor: '#4ADE80' }}
        >
          <p
            className="text-lg leading-relaxed"
            style={{ color: '#9CA3AF' }}
          >
            {t('intelligence.quote')}
          </p>
        </blockquote>
      </div>
    </section>
  );
}
