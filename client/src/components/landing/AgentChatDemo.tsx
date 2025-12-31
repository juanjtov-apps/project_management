import { useRef, useCallback } from 'react';
import { useGSAP, usePrefersReducedMotion, useIsMobile } from '@/hooks/useGSAP';
import { Zap, Package, CheckCircle2, Sparkles, MessageSquare, AlertTriangle } from 'lucide-react';

// Scenario data for cycling demos
const SCENARIOS = [
  {
    userPrompt: "What materials need to be ordered for the electrical phase?",
    aiResponse: "I've analyzed the electrical phase schedule for Brookfield Estates. Here's what you need to order by Nov 28 to stay on track...",
    panelTitle: "Materials Required",
    panelSubtitle: "Electrical Phase — Rough-In",
    panelIcon: "zap",
    items: [
      { name: "200A Service Panel", quantity: "1 unit" },
      { name: "14/2 Romex Wire", quantity: "500 ft" },
      { name: "Outlet Boxes", quantity: "24 units" },
      { name: "LED Light Fixtures", quantity: "12 units" },
      { name: "Smart Dimmer Switches", quantity: "8 units" }
    ],
    footerLabel: "Order by",
    footerDate: "Nov 28",
    deliveryDate: "Dec 2"
  },
  {
    userPrompt: "What's the status on the kitchen remodel punch list?",
    aiResponse: "I've reviewed the punch list for the Miller Kitchen Remodel. Here are the remaining items before final walkthrough...",
    panelTitle: "Punch List Items",
    panelSubtitle: "Miller Kitchen — Final Phase",
    panelIcon: "alert",
    items: [
      { name: "Cabinet door alignment", quantity: "2 items" },
      { name: "Backsplash grout touch-up", quantity: "1 area" },
      { name: "Under-cabinet lighting", quantity: "3 fixtures" },
      { name: "Drawer soft-close adjust", quantity: "4 drawers" },
      { name: "Final paint touch-ups", quantity: "Complete" }
    ],
    footerLabel: "Walkthrough",
    footerDate: "Dec 8",
    deliveryDate: "Dec 10"
  }
];

export function AgentChatDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scenarioIndexRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile(1024);

  // Function to update DOM content with new scenario
  const updateScenarioContent = useCallback((index: number) => {
    const scenario = SCENARIOS[index];
    if (!containerRef.current) return;

    // Update user message
    const userMsg = containerRef.current.querySelector('.user-message-text');
    if (userMsg) userMsg.textContent = scenario.userPrompt;

    // Update AI response
    const aiMsg = containerRef.current.querySelector('.ai-message-text');
    if (aiMsg) aiMsg.textContent = scenario.aiResponse;

    // Update panel title and subtitle
    const panelTitle = containerRef.current.querySelector('.panel-title');
    if (panelTitle) panelTitle.textContent = scenario.panelTitle;

    const panelSubtitle = containerRef.current.querySelector('.panel-subtitle');
    if (panelSubtitle) panelSubtitle.textContent = scenario.panelSubtitle;

    // Update panel icon
    const zapIcon = containerRef.current.querySelector('.panel-icon-zap');
    const alertIcon = containerRef.current.querySelector('.panel-icon-alert');
    if (zapIcon && alertIcon) {
      if (scenario.panelIcon === 'zap') {
        (zapIcon as HTMLElement).style.display = 'block';
        (alertIcon as HTMLElement).style.display = 'none';
      } else {
        (zapIcon as HTMLElement).style.display = 'none';
        (alertIcon as HTMLElement).style.display = 'block';
      }
    }

    // Update items
    const items = containerRef.current.querySelectorAll('.outcome-item');
    items.forEach((item, i) => {
      if (scenario.items[i]) {
        const nameEl = item.querySelector('.item-name');
        const quantityEl = item.querySelector('.item-quantity');
        if (nameEl) nameEl.textContent = scenario.items[i].name;
        if (quantityEl) quantityEl.textContent = scenario.items[i].quantity;
      }
    });

    // Update footer
    const footerLabel = containerRef.current.querySelector('.footer-label');
    if (footerLabel) footerLabel.textContent = scenario.footerLabel;

    const footerDate = containerRef.current.querySelector('.footer-date');
    if (footerDate) footerDate.textContent = scenario.footerDate;

    const deliveryDate = containerRef.current.querySelector('.delivery-date');
    if (deliveryDate) deliveryDate.textContent = scenario.deliveryDate;
  }, []);

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
      repeatDelay: 0.3,
      delay: 1.5,
      defaults: { ease: 'power3.out' },
      onRepeat: () => {
        // Cycle to next scenario
        scenarioIndexRef.current = (scenarioIndexRef.current + 1) % SCENARIOS.length;
        updateScenarioContent(scenarioIndexRef.current);
      }
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
      .to({}, { duration: 4 })
      .to(['.chat-user-message', '.chat-ai-message', '.outcome-panel', '.outcome-item'], {
        opacity: 0,
        duration: 0.3
      })
      .set(['.chat-user-message', '.chat-ai-message'], { y: 30 })
      .set('.outcome-panel', { scale: 0.95, boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)' })
      .set('.outcome-item', { x: -20 });

  }, { scope: containerRef, dependencies: [prefersReducedMotion, updateScenarioContent] });

  // Get initial scenario data
  const initialScenario = SCENARIOS[0];

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
              <p className="user-message-text text-sm leading-relaxed" style={{ color: '#FFFFFF' }}>
                {initialScenario.userPrompt}
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
              <p className="ai-message-text text-sm leading-relaxed" style={{ color: '#E5E7EB' }}>
                {initialScenario.aiResponse}
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
              <Zap className="panel-icon-zap w-4 h-4" style={{ color: '#4ADE80' }} />
              <AlertTriangle className="panel-icon-alert w-4 h-4" style={{ color: '#F97316', display: 'none' }} />
            </div>
            <div>
              <h3 className="panel-title text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                {initialScenario.panelTitle}
              </h3>
              <p className="panel-subtitle text-xs" style={{ color: '#9CA3AF' }}>
                {initialScenario.panelSubtitle}
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

        {/* Items List */}
        <div className="p-4 space-y-2">
          {initialScenario.items.map((item, index) => (
            <div
              key={index}
              className="outcome-item flex items-center justify-between p-3 rounded-lg border transition-colors duration-200 hover:border-opacity-50"
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
                <span className="item-name text-sm" style={{ color: '#E5E7EB' }}>
                  {item.name}
                </span>
              </div>
              <span className="item-quantity text-xs font-medium px-2 py-1 rounded" style={{
                backgroundColor: '#1F242C',
                color: '#9CA3AF'
              }}>
                {item.quantity}
              </span>
            </div>
          ))}
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
                <span className="footer-label">{initialScenario.footerLabel}</span>{' '}
                <span className="footer-date" style={{ color: '#FFFFFF' }}>{initialScenario.footerDate}</span>
              </span>
            </div>
            <div
              className="w-px h-3"
              style={{ backgroundColor: '#2D333B' }}
            />
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              Delivery <span className="delivery-date" style={{ color: '#4ADE80' }}>{initialScenario.deliveryDate}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
