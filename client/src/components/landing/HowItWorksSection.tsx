import { useRef, useState } from 'react';
import { MessageSquare, Sparkles, FileText, Package, HelpCircle, BarChart3, Check, Clock, AlertCircle } from 'lucide-react';
import { useGSAP, usePrefersReducedMotion } from '@/hooks/useGSAP';
import { SectionHeader } from './shared';

const cards = [
  {
    icon: MessageSquare,
    title: 'Ask',
    body: 'Type your question in plain language. No menus, no navigation, no learning curve.'
  },
  {
    icon: Sparkles,
    title: 'Proesphere Works',
    body: 'The AI queries all your connected project data—tasks, schedules, documents, communications.'
  },
  {
    icon: FileText,
    title: 'You Receive',
    body: 'A clear answer in your preferred format. Report, summary, action list—your call.'
  }
];

interface MaterialItem {
  name: string;
  qty: string;
  status: 'order' | 'stock';
}

interface QuestionItem {
  client: string;
  question: string;
  days: string;
}

interface PromptOutcome {
  prompt: string;
  shortPrompt: string;
  outcome: {
    type: 'materials' | 'questions' | 'report';
    title: string;
    icon: typeof Package;
    items?: MaterialItem[];
    questions?: QuestionItem[];
    stats?: { complete: string; onTrack: boolean; daysRemaining: number };
    highlights?: string[];
  };
}

const promptOutcomes: PromptOutcome[] = [
  {
    prompt: '"What materials need to be ordered for the electrical phase starting Monday?"',
    shortPrompt: 'Materials for electrical phase',
    outcome: {
      type: 'materials',
      title: 'Materials Required',
      icon: Package,
      items: [
        { name: '200A Service Panel', qty: '1 unit', status: 'order' },
        { name: '14/2 Romex Wire', qty: '500 ft', status: 'stock' },
        { name: 'Outlet Boxes', qty: '24 units', status: 'order' },
        { name: 'LED Fixtures', qty: '12 units', status: 'stock' }
      ]
    }
  },
  {
    prompt: '"Are there any unanswered client questions from the last 7 days?"',
    shortPrompt: 'Unanswered client questions',
    outcome: {
      type: 'questions',
      title: '3 Pending Questions',
      icon: HelpCircle,
      questions: [
        { client: 'Martinez', question: 'Cabinet finish options?', days: '5 days ago' },
        { client: 'Chen', question: 'Timeline for inspection?', days: '3 days ago' },
        { client: 'Williams', question: 'Permit status update?', days: '2 days ago' }
      ]
    }
  },
  {
    prompt: '"Generate a progress report for the Martinez renovation."',
    shortPrompt: 'Martinez progress report',
    outcome: {
      type: 'report',
      title: 'Progress Report',
      icon: BarChart3,
      stats: { complete: '67%', onTrack: true, daysRemaining: 23 },
      highlights: ['Framing complete', 'Electrical 80%', 'Plumbing inspection passed']
    }
  }
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedPrompt, setSelectedPrompt] = useState(0);

  useGSAP((gsap) => {
    if (prefersReducedMotion) {
      gsap.set(['.how-card', '.how-demo'], { opacity: 1, y: 0 });
      return;
    }

    // Cards stagger in
    gsap.from('.how-card', {
      y: 50,
      opacity: 0,
      stagger: 0.15,
      duration: 0.8,
      ease: 'power2.out',
      immediateRender: false,
      scrollTrigger: {
        trigger: '.how-cards-grid',
        start: 'top 80%',
        toggleActions: 'play none none none'
      }
    });

    // Demo section fades in
    gsap.from('.how-demo', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      delay: 0.3,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.how-demo',
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  }, { scope: sectionRef, dependencies: [prefersReducedMotion] });

  const currentOutcome = promptOutcomes[selectedPrompt].outcome;

  return (
    <section
      ref={sectionRef}
      className="relative pt-8 md:pt-12 pb-16 md:pb-20"
      style={{ backgroundColor: '#0F1115' }}
    >
      {/* Top border gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.3), transparent)'
        }}
      />

      <div className="container mx-auto px-6">
        <SectionHeader
          eyebrow="How It Works"
          title="Three steps to clarity"
          className="mb-6"
        />

        {/* Cards Grid */}
        <div className="how-cards-grid grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="how-card group relative p-8 rounded-2xl border transition-all duration-500"
                style={{
                  backgroundColor: '#161B22',
                  borderColor: '#2D333B',
                  opacity: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.4), 0 0 60px rgba(74, 222, 128, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2D333B';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Step number */}
                <span
                  className="absolute top-6 right-6 text-sm font-mono"
                  style={{ color: '#4B5563' }}
                >
                  0{index + 1}
                </span>

                {/* Icon with glow on hover */}
                <div className="relative mb-6">
                  <div
                    className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                    style={{ backgroundColor: '#4ADE80' }}
                  />
                  <Icon
                    className="relative w-8 h-8 transition-colors duration-300"
                    style={{ color: '#4ADE80' }}
                  />
                </div>

                <h3
                  className="text-xl font-semibold mb-3"
                  style={{ color: '#FFFFFF' }}
                >
                  {card.title}
                </h3>
                <p
                  className="leading-relaxed"
                  style={{ color: '#9CA3AF' }}
                >
                  {card.body}
                </p>
              </div>
            );
          })}
        </div>

        {/* Interactive Demo */}
        <div className="how-demo max-w-5xl mx-auto">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              backgroundColor: '#161B22',
              borderColor: '#2D333B'
            }}
          >
            {/* Header */}
            <div
              className="px-6 py-4 border-b flex items-center gap-3"
              style={{ borderColor: '#2D333B' }}
            >
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F97316' }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4ADE80' }} />
              </div>
              <span className="text-xs font-mono" style={{ color: '#6B7280' }}>
                proesphere-demo
              </span>
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-2">
              {/* Left: Prompts */}
              <div className="p-6 border-r" style={{ borderColor: '#2D333B' }}>
                <p
                  className="text-xs uppercase tracking-[0.15em] mb-4 font-medium"
                  style={{ color: '#6B7280' }}
                >
                  Try a prompt
                </p>
                <div className="space-y-3">
                  {promptOutcomes.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedPrompt(index)}
                      className="w-full text-left p-4 rounded-xl border transition-all duration-300"
                      style={{
                        backgroundColor: selectedPrompt === index ? 'rgba(74, 222, 128, 0.08)' : 'transparent',
                        borderColor: selectedPrompt === index ? 'rgba(74, 222, 128, 0.4)' : '#2D333B',
                        boxShadow: selectedPrompt === index ? '0 0 20px rgba(74, 222, 128, 0.1)' : 'none'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0 transition-colors duration-300"
                          style={{
                            backgroundColor: selectedPrompt === index ? '#4ADE80' : '#4B5563'
                          }}
                        />
                        <span
                          className="font-mono text-sm leading-relaxed transition-colors duration-300"
                          style={{
                            color: selectedPrompt === index ? '#FFFFFF' : '#9CA3AF'
                          }}
                        >
                          {item.prompt}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Outcome Panel */}
              <div className="p-6 relative overflow-hidden">
                {/* Background glow */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 blur-3xl opacity-10 pointer-events-none"
                  style={{ backgroundColor: '#4ADE80' }}
                />

                <div className="relative">
                  {/* Outcome Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
                    >
                      <currentOutcome.icon className="w-5 h-5" style={{ color: '#4ADE80' }} />
                    </div>
                    <div>
                      <h4 className="font-semibold" style={{ color: '#FFFFFF' }}>
                        {currentOutcome.title}
                      </h4>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        Generated instantly
                      </p>
                    </div>
                  </div>

                  {/* Materials List */}
                  {currentOutcome.type === 'materials' && currentOutcome.items && (
                    <div className="space-y-3">
                      {currentOutcome.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: 'rgba(22, 27, 34, 0.8)' }}
                        >
                          <div>
                            <p className="font-medium text-sm" style={{ color: '#FFFFFF' }}>
                              {item.name}
                            </p>
                            <p className="text-xs" style={{ color: '#6B7280' }}>
                              {item.qty}
                            </p>
                          </div>
                          <span
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: item.status === 'order'
                                ? 'rgba(249, 115, 22, 0.15)'
                                : 'rgba(74, 222, 128, 0.15)',
                              color: item.status === 'order' ? '#F97316' : '#4ADE80'
                            }}
                          >
                            {item.status === 'order' ? 'Order needed' : 'In stock'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Questions List */}
                  {currentOutcome.type === 'questions' && currentOutcome.questions && (
                    <div className="space-y-3">
                      {currentOutcome.questions.map((item, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg"
                          style={{ backgroundColor: 'rgba(22, 27, 34, 0.8)' }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="w-4 h-4" style={{ color: '#F97316' }} />
                                <span className="font-medium text-sm" style={{ color: '#FFFFFF' }}>
                                  {item.client}
                                </span>
                              </div>
                              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                                {item.question}
                              </p>
                            </div>
                            <span className="text-xs whitespace-nowrap" style={{ color: '#6B7280' }}>
                              {item.days}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress Report */}
                  {currentOutcome.type === 'report' && currentOutcome.stats && (
                    <div className="space-y-4">
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div
                          className="p-3 rounded-lg text-center"
                          style={{ backgroundColor: 'rgba(22, 27, 34, 0.8)' }}
                        >
                          <p className="text-2xl font-bold" style={{ color: '#4ADE80' }}>
                            {currentOutcome.stats.complete}
                          </p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>Complete</p>
                        </div>
                        <div
                          className="p-3 rounded-lg text-center"
                          style={{ backgroundColor: 'rgba(22, 27, 34, 0.8)' }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Check className="w-5 h-5" style={{ color: '#4ADE80' }} />
                          </div>
                          <p className="text-xs" style={{ color: '#6B7280' }}>On Track</p>
                        </div>
                        <div
                          className="p-3 rounded-lg text-center"
                          style={{ backgroundColor: 'rgba(22, 27, 34, 0.8)' }}
                        >
                          <p className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                            {currentOutcome.stats.daysRemaining}
                          </p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>Days left</p>
                        </div>
                      </div>

                      {/* Highlights */}
                      {currentOutcome.highlights && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wider" style={{ color: '#6B7280' }}>
                            Highlights
                          </p>
                          {currentOutcome.highlights.map((highlight, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 rounded-lg"
                              style={{ backgroundColor: 'rgba(22, 27, 34, 0.8)' }}
                            >
                              <Check className="w-4 h-4" style={{ color: '#4ADE80' }} />
                              <span className="text-sm" style={{ color: '#9CA3AF' }}>
                                {highlight}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
