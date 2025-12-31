import { useRef, useState, useEffect } from 'react';
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

// Professional avatar images from UI Faces / randomuser.me style
const avatarImages = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
];

// Construction company logo-style text treatments
const companyLogos = [
  { name: 'TURNER', letterSpacing: '0.15em', fontWeight: 800 },
  { name: 'SKANSKA', letterSpacing: '0.12em', fontWeight: 700 },
  { name: 'CLARK', letterSpacing: '0.18em', fontWeight: 800 },
  { name: 'MORTENSON', letterSpacing: '0.08em', fontWeight: 600 },
];

export function HeroSection({ onRequestDemo, onSeeHowItWorks, onSignIn }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  // Hide scroll indicator when user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowScrollIndicator(scrollY < 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useGSAP((gsap) => {
    if (prefersReducedMotion) {
      gsap.set(['.hero-animate', '.hero-cta', '.hero-visual'], { opacity: 1, y: 0, scale: 1 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Staggered entrance animation
    tl.from('.hero-eyebrow', { y: 20, opacity: 0, duration: 0.6 })
      .from('.hero-headline', { y: 40, opacity: 0, duration: 1 }, '-=0.3')
      .from('.hero-subheadline', { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
      .from('.hero-social-proof', { opacity: 0, duration: 0.6 }, '-=0.3')
      .from('.hero-cta', { y: 20, opacity: 0, stagger: 0.15, duration: 0.6, immediateRender: false }, '-=0.4')
      .from('.hero-visual', { scale: 0.95, opacity: 0, duration: 1.2 }, '-=0.6');

    // Animate "That's it." with a subtle pulse
    gsap.to('.hero-thats-it', {
      textShadow: '0 0 40px rgba(74, 222, 128, 0.6)',
      repeat: -1,
      yoyo: true,
      duration: 2,
      ease: 'power1.inOut'
    });

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
    <>
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

        {/* Hero Content - Reduced top padding */}
        <div className="hero-content relative z-10 flex-1 flex flex-col justify-center container mx-auto px-6 py-4 md:py-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-end lg:items-center">
            {/* Left: Copy */}
            <div className="max-w-2xl flex flex-col">
              <p
                className="hero-animate hero-eyebrow text-xs uppercase tracking-[0.25em] mb-3 font-medium"
                style={{ color: 'rgba(74, 222, 128, 0.75)' }}
              >
                Construction Project Intelligence
              </p>
              <h1
                className="hero-animate hero-headline text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-5"
                style={{ color: '#FFFFFF' }}
              >
                Ask a question.{' '}
                <br className="hidden sm:block" />
                Get the answer.{' '}
                <br className="hidden sm:block" />
                <span
                  className="hero-thats-it inline-block text-5xl sm:text-6xl lg:text-7xl"
                  style={{ color: '#4ADE80' }}
                >
                  That's it.
                </span>
              </h1>
              <p
                className="hero-animate hero-subheadline text-lg sm:text-xl leading-relaxed mb-6"
                style={{ color: '#9CA3AF' }}
              >
                From RFIs to punch lists, your entire project in one AI-powered command center.
                Ask anything. Get clarity.
              </p>

              {/* CTA Buttons - Symmetric layout */}
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <button
                  onClick={onRequestDemo}
                  className="hero-animate hero-cta hero-primary-cta font-semibold px-8 py-4 rounded-full text-base transition-all duration-300 inline-flex items-center justify-center bg-[#4ADE80] text-[#0F1115] hover:bg-[#22C55E] hover:-translate-y-0.5"
                  style={{
                    boxShadow: '0 0 20px rgba(74, 222, 128, 0.3), 0 4px 20px rgba(74, 222, 128, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(74, 222, 128, 0.5), 0 6px 30px rgba(74, 222, 128, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(74, 222, 128, 0.3), 0 4px 20px rgba(74, 222, 128, 0.2)';
                  }}
                >
                  Join the Waitlist
                </button>
                <Button
                  onClick={onSeeHowItWorks}
                  variant="outline"
                  className="hero-animate hero-cta font-medium px-8 py-4 rounded-full text-base transition-all duration-300 h-auto"
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

              {/* Social Proof - Refined with real avatars */}
              <div className="hero-animate hero-social-proof space-y-4 mt-8">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {avatarImages.map((src, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 rounded-full border-2 overflow-hidden transition-transform hover:scale-110 hover:z-10"
                        style={{
                          borderColor: '#0F1115',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                      >
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                  <p style={{ color: '#D1D5DB' }} className="text-sm font-medium">
                    Join <span style={{ color: '#4ADE80' }} className="font-bold">400+</span> construction pros on the waitlist
                  </p>
                </div>

                {/* Company Logos - Styled as grayscale logo treatments */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: '#4B5563' }}>
                    Trusted by teams at
                  </span>
                  <div className="flex items-center gap-6 sm:gap-8">
                    {companyLogos.map((company) => (
                      <span
                        key={company.name}
                        className="text-sm sm:text-base transition-all duration-300 hover:opacity-100 cursor-default"
                        style={{
                          color: '#6B7280',
                          letterSpacing: company.letterSpacing,
                          fontWeight: company.fontWeight,
                          opacity: 0.7,
                          fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}
                      >
                        {company.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Right: AI Chat Demo */}
            <div className="hero-animate hero-visual relative lg:self-end">
              <AgentChatDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Scroll Indicator - Outside section to avoid GSAP transform issues */}
      {showScrollIndicator && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 cursor-pointer"
          style={{ opacity: 0.5 }}
          onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
        >
          <ChevronDown className="w-6 h-6 text-white animate-bounce" />
        </div>
      )}
    </>
  );
}
