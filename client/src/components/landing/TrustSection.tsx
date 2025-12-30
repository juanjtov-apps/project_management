import { Users, Rocket, Building2 } from 'lucide-react';
import { CountUp, SectionHeader } from './shared';
import type { LucideIcon } from 'lucide-react';

interface Stat {
  number: number;
  suffix: string;
  label: string;
  icon: LucideIcon;
}

const stats: Stat[] = [
  { number: 400, suffix: '+', label: 'professionals on the waitlist', icon: Users },
  { number: 12, suffix: '', label: 'beta teams actively testing', icon: Rocket },
  { number: 3, suffix: '', label: 'enterprise pilots in progress', icon: Building2 }
];

export function TrustSection() {
  return (
    <section
      className="relative py-24 md:py-32"
      style={{ backgroundColor: '#0F1115' }}
    >
      {/* Top separator line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #2D333B, transparent)'
        }}
      />

      <div className="container mx-auto px-6">
        <SectionHeader
          title="Built with trust"
          className="mb-12"
        />

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="trust-card group relative p-8 rounded-2xl border transition-all duration-500 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #161B22 0%, #1a2129 100%)',
                  borderColor: '#2D333B',
                  opacity: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 40px rgba(74, 222, 128, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2D333B';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Background glow */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                  style={{ backgroundColor: '#4ADE80' }}
                />

                {/* Icon */}
                <div className="relative mb-4">
                  <Icon
                    className="w-8 h-8 transition-colors duration-300"
                    style={{ color: '#4ADE80' }}
                  />
                </div>

                {/* Number */}
                <div
                  className="relative text-4xl md:text-5xl font-bold tracking-tight mb-2"
                  style={{ color: '#FFFFFF' }}
                >
                  <CountUp
                    end={stat.number}
                    suffix={stat.suffix}
                    duration={2}
                  />
                </div>

                {/* Accent line */}
                <div
                  className="w-12 h-0.5 mb-3 rounded-full transition-all duration-300 group-hover:w-16"
                  style={{ backgroundColor: '#4ADE80' }}
                />

                {/* Label */}
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#9CA3AF' }}
                >
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom separator line */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #2D333B, transparent)'
        }}
      />
    </section>
  );
}
