import { useRef } from 'react';
import { useGSAP, usePrefersReducedMotion, useIsMobile } from '@/hooks/useGSAP';
import { Zap, Package, CheckCircle2, Sparkles, MessageSquare } from 'lucide-react';

export function AgentChatDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  useGSAP((gsap) => {
    if (prefersReducedMotion) {
      gsap.set([
        '.chat-user-message',
        '.thinking-indicator',
        '.chat-ai-message',
        '.outcome-panel'
      ], { opacity: 1, y: 0, scale: 1 });
      return;
    }

    // Initial state - hide everything except outcome container
    gsap.set('.chat-user-message', { opacity: 0, y: 30 });
    gsap.set('.thinking-indicator', { opacity: 0 });
    gsap.set('.chat-ai-message', { opacity: 0, y: 30 });
    gsap.set('.outcome-panel', { opacity: 0, scale: 0.95 });
    gsap.set('.outcome-item', { opacity: 0, x: -20 });

    // Chat animation timeline with loop
    const chatTL = gsap.timeline({
      repeat: -1,
      repeatDelay: 4,
      delay: 1.5,
      defaults: { ease: 'power3.out' }
    });

    chatTL
      // 1. User message appears
      .to('.chat-user-message', {
        opacity: 1,
        y: 0,
        duration: 0.6
      })
      // 2. Thinking indicator
      .to('.thinking-indicator', {
        opacity: 1,
        duration: 0.3
      }, '+=0.4')
      // 3. Thinking dots pulse
      .to('.thinking-dot', {
        scale: 1.3,
        opacity: 0.5,
        stagger: {
          each: 0.15,
          repeat: 4,
          yoyo: true
        },
        duration: 0.3
      })
      // 4. Hide thinking, show AI response
      .to('.thinking-indicator', {
        opacity: 0,
        duration: 0.2
      })
      .to('.chat-ai-message', {
        opacity: 1,
        y: 0,
        duration: 0.7
      }, '-=0.1')
      // 5. Outcome panel materializes
      .to('.outcome-panel', {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: 'back.out(1.2)'
      }, '-=0.3')
      // 6. Items stagger in
      .to('.outcome-item', {
        opacity: 1,
        x: 0,
        stagger: 0.1,
        duration: 0.5
      }, '-=0.4')
      // 7. Glow effect on outcome
      .to('.outcome-panel', {
        boxShadow: '0 0 40px rgba(74, 222, 128, 0.25), 0 25px 60px rgba(0, 0, 0, 0.4)',
        duration: 0.6
      }, '-=0.3')
      // 8. Hold, then reset
      .to({}, { duration: 3 })
      .to(['.chat-user-message', '.chat-ai-message', '.outcome-panel', '.outcome-item'], {
        opacity: 0,
        duration: 0.5
      })
      .set(['.chat-user-message', '.chat-ai-message'], { y: 30 })
      .set('.outcome-panel', { scale: 0.95, boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)' })
      .set('.outcome-item', { x: -20 });

  }, { scope: containerRef, dependencies: [prefersReducedMotion] });

  return (
    <div
      ref={containerRef}
      className={`flex gap-4 ${isMobile ? 'flex-col' : 'flex-row items-start'}`}
    >
      {/* Chat Window */}
      <div
        className={`chat-window relative rounded-2xl border overflow-hidden ${isMobile ? 'w-full' : 'w-[45%]'}`}
        style={{
          backgroundColor: '#161B22',
          borderColor: '#2D333B',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Window Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: '#2D333B' }}
        >
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F97316' }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4ADE80' }} />
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" style={{ color: '#4ADE80' }} />
            <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
              Proesphere AI
            </span>
          </div>
        </div>

        {/* Chat Content */}
        <div
          className="p-4 space-y-4 min-h-[200px]"
          role="log"
          aria-label="AI conversation demo"
        >
          {/* User Message */}
          <div className="chat-user-message flex justify-end">
            <div
              className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md"
              style={{
                backgroundColor: 'rgba(74, 222, 128, 0.12)',
                border: '1px solid rgba(74, 222, 128, 0.25)'
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: '#FFFFFF' }}>
                What materials need to be ordered for the electrical phase?
              </p>
            </div>
          </div>

          {/* Thinking Indicator */}
          <div
            className="thinking-indicator flex items-center gap-1 px-4 py-2"
            role="status"
            aria-live="polite"
          >
            <span className="sr-only">Processing your request...</span>
            <div
              className="thinking-dot w-2 h-2 rounded-full"
              style={{ backgroundColor: '#4ADE80' }}
            />
            <div
              className="thinking-dot w-2 h-2 rounded-full"
              style={{ backgroundColor: '#4ADE80' }}
            />
            <div
              className="thinking-dot w-2 h-2 rounded-full"
              style={{ backgroundColor: '#4ADE80' }}
            />
          </div>

          {/* AI Response */}
          <div className="chat-ai-message flex justify-start">
            <div
              className="max-w-[90%] px-4 py-3 rounded-2xl rounded-bl-md"
              style={{
                backgroundColor: '#1F242C',
                border: '1px solid #2D333B'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#4ADE80' }} />
                <span className="text-xs font-medium" style={{ color: '#4ADE80' }}>
                  AI Analysis
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#E5E7EB' }}>
                I've analyzed the electrical phase schedule for Brookfield Estates. Here's what you need to order by Nov 28 to stay on track...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Outcome Panel */}
      <div
        className={`outcome-panel relative rounded-2xl border overflow-hidden ${isMobile ? 'w-full' : 'w-[55%]'}`}
        style={{
          backgroundColor: '#161B22',
          borderColor: 'rgba(74, 222, 128, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Panel Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{
            borderColor: 'rgba(74, 222, 128, 0.15)',
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08) 0%, transparent 50%)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
            >
              <Zap className="w-4 h-4" style={{ color: '#4ADE80' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                Materials Required
              </h3>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Electrical Phase — Rough-In
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#4ADE80' }} />
            <span className="text-xs font-medium" style={{ color: '#4ADE80' }}>
              Ready
            </span>
          </div>
        </div>

        {/* Materials List */}
        <div className="p-4 space-y-2">
          <MaterialItem
            name="200A Service Panel"
            quantity="1 unit"
            className="outcome-item"
          />
          <MaterialItem
            name="14/2 Romex Wire"
            quantity="500 ft"
            className="outcome-item"
          />
          <MaterialItem
            name="Outlet Boxes"
            quantity="24 units"
            className="outcome-item"
          />
          <MaterialItem
            name="LED Light Fixtures"
            quantity="12 units"
            className="outcome-item"
          />
          <MaterialItem
            name="Smart Dimmer Switches"
            quantity="8 units"
            className="outcome-item"
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{
            borderColor: '#2D333B',
            backgroundColor: '#0F1115'
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                Order by <span style={{ color: '#FFFFFF' }}>Nov 28</span>
              </span>
            </div>
            <div
              className="w-px h-3"
              style={{ backgroundColor: '#2D333B' }}
            />
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              Delivery <span style={{ color: '#4ADE80' }}>Dec 2</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MaterialItemProps {
  name: string;
  quantity: string;
  className?: string;
}

function MaterialItem({ name, quantity, className }: MaterialItemProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-200 hover:border-opacity-50 ${className || ''}`}
      style={{
        backgroundColor: '#0F1115',
        borderColor: '#2D333B'
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: '#4ADE80' }}
        />
        <span className="text-sm" style={{ color: '#E5E7EB' }}>
          {name}
        </span>
      </div>
      <span className="text-xs font-medium px-2 py-1 rounded" style={{
        backgroundColor: '#1F242C',
        color: '#9CA3AF'
      }}>
        {quantity}
      </span>
    </div>
  );
}
