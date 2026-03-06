import { TabletDemo } from "./TabletDemo";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="landing-hero landing-section">
      <div className="hero-ambient" />
      <div className="hero-grid-bg" />

      <div className="hero-top-text" style={{ animation: 'heroFadeIn 0.7s ease-out 0.1s forwards', opacity: 0 }}>
        <div className="hero-eyebrow"><b />Built for General Contractors<b /></div>
        <h1 className="hero-h1">Every project. Every crew. <em>Fully under control.</em></h1>
        <p className="hero-sub">
          Proesphere unifies your projects, crew, clients, and finances in one AI-powered hub — so you run a flawless operation instead of chasing information.
        </p>
        <div className="hero-ctas">
          <button className="btn-hero-main" onClick={onGetStarted}>
            Start for free
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5H11M7.5 1L11 4.5L7.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="btn-hero-ghost" onClick={onGetStarted}>Watch demo</button>
        </div>
      </div>

      <TabletDemo />
    </section>
  );
}
