import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useGSAP, usePrefersReducedMotion, useIsMobile } from '@/hooks/useGSAP';
import { ChevronDown } from 'lucide-react';
import { AgentChatDemo } from './AgentChatDemo';

interface HeroSectionProps {
  onRequestDemo: () => void;
  onSeeHowItWorks: () => void;
  onSignIn: () => void;
}

export function HeroSection({ onRequestDemo, onSeeHowItWorks, onSignIn }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  useGSAP((gsap) => {
    if (prefersReducedMotion) {
      gsap.set('.hero-animate', { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Staggered entrance animation
    tl.from('.hero-eyebrow', { y: 20, opacity: 0, duration: 0.6 })
      .from('.hero-headline', { y: 40, opacity: 0, duration: 1 }, '-=0.3')
      .from('.hero-subheadline', { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
      .from('.hero-social-proof', { opacity: 0, duration: 0.6 }, '-=0.3')
      .from('.hero-cta', { y: 20, opacity: 0, stagger: 0.15, duration: 0.6 }, '-=0.4')
      .from('.hero-visual', { scale: 0.95, opacity: 0, duration: 1.2 }, '-=0.6')
      .from('.hero-scroll-indicator', { opacity: 0, duration: 0.6 }, '-=0.3');

    // Fade hero content as user scrolls (desktop only)
    if (!isMobile) {
      gsap.to('.hero-content', {
        opacity: 0.3,
        y: -50,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom 70%',
          scrub: 1,
        }
      });
    }
  }, { scope: sectionRef, dependencies: [prefersReducedMotion, isMobile] });

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col"
      style={{ backgroundColor: '#0F1115' }}
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(74, 222, 128, 0.08), transparent)',
        }}
      />

      {/* Navigation Header */}
      <header className="relative z-20 border-b" style={{ borderColor: 'rgba(45, 51, 59, 0.5)' }}>
        <div className="container mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Logo size="md" variant="full" />
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={onSignIn}
                className="text-white/70 hover:text-white hover:bg-white/5 font-medium"
              >
                Log in
              </Button>
              <Button
                onClick={onRequestDemo}
                className="hidden sm:flex font-semibold px-6 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: 'transparent',
                  border: '1.5px solid #4ADE80',
                  color: '#4ADE80'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4ADE80';
                  e.currentTarget.style.color = '#0F1115';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#4ADE80';
                }}
              >
                Request a Demo
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Content */}
      <div className="hero-content relative z-10 flex-1 flex flex-col justify-center container mx-auto px-6 py-6 md:py-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="max-w-2xl">
            <p
              className="hero-animate hero-eyebrow text-xs uppercase tracking-[0.25em] mb-4 font-medium"
              style={{ color: 'rgba(74, 222, 128, 0.75)' }}
            >
              Construction Project Intelligence
            </p>
            <h1
              className="hero-animate hero-headline text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
              style={{ color: '#FFFFFF' }}
            >
              Ask a question.{' '}
              <br className="hidden sm:block" />
              Get the answer.{' '}
              <br className="hidden sm:block" />
              <span style={{ color: '#4ADE80' }}>That's it.</span>
            </h1>
            <p
              className="hero-animate hero-subheadline text-lg sm:text-xl leading-relaxed mb-8"
              style={{ color: '#9CA3AF' }}
            >
              From RFIs to punch lists, your entire project in one AI-powered command center.
              Ask anything. Get clarity.
            </p>

            {/* Primary CTA - Join the Waitlist */}
            <button
              onClick={onRequestDemo}
              className="hero-primary-cta font-bold px-10 py-5 rounded-xl text-lg transition-all duration-300 mb-6 inline-flex items-center justify-center bg-[#4ADE80] text-[#0F1115] hover:bg-[#22C55E] hover:-translate-y-0.5 tracking-wide"
              style={{
                boxShadow: '0 4px 30px rgba(74, 222, 128, 0.35), 0 0 0 1px rgba(74, 222, 128, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 40px rgba(74, 222, 128, 0.5), 0 0 0 1px rgba(74, 222, 128, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 30px rgba(74, 222, 128, 0.35), 0 0 0 1px rgba(74, 222, 128, 0.1)';
              }}
            >
              Join the Waitlist
            </button>

            {/* Social Proof - Enhanced */}
            <div className="hero-animate hero-social-proof mt-4 mb-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold"
                      style={{
                        backgroundColor: i === 1 ? '#10B981' : i === 2 ? '#3B82F6' : i === 3 ? '#F59E0B' : '#8B5CF6',
                        borderColor: '#0F1115',
                        color: '#FFFFFF'
                      }}
                    >
                      {i === 1 ? 'JD' : i === 2 ? 'SM' : i === 3 ? 'MK' : 'RW'}
                    </div>
                  ))}
                </div>
                <p style={{ color: '#D1D5DB' }} className="text-sm font-medium">
                  Join <span style={{ color: '#10B981' }} className="font-bold">400+</span> construction professionals on the waitlist
                </p>
              </div>

              {/* Company Logos */}
              <div className="flex items-center gap-6 opacity-60">
                <span className="text-xs uppercase tracking-wider" style={{ color: '#6B7280' }}>Trusted by teams at</span>
                <div className="flex items-center gap-5">
                  {['Turner', 'Skanska', 'Clark', 'Mortenson'].map((company) => (
                    <div
                      key={company}
                      className="px-3 py-1 rounded text-xs font-semibold tracking-wide"
                      style={{ color: '#9CA3AF', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      {company}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={onRequestDemo}
                size="lg"
                className="hero-animate hero-cta font-semibold px-8 py-6 rounded-full text-base transition-all duration-300 hover:shadow-lg"
                style={{
                  backgroundColor: 'transparent',
                  border: '1.5px solid #4ADE80',
                  color: '#4ADE80'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4ADE80';
                  e.currentTarget.style.color = '#0F1115';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#4ADE80';
                }}
              >
                Request a Demo
              </Button>
              <Button
                onClick={onSeeHowItWorks}
                variant="outline"
                size="lg"
                className="hero-animate hero-cta font-medium px-8 py-6 rounded-full text-base transition-all duration-300"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: '#2D333B',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4ADE80';
                  e.currentTarget.style.color = '#4ADE80';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2D333B';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
              >
                See How It Works
              </Button>
            </div>
          </div>

          {/* Right: AI Chat Demo */}
          <div className="hero-animate hero-visual relative">
            <AgentChatDemo />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="hero-scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
        <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </div>
    </section>
  );
}
