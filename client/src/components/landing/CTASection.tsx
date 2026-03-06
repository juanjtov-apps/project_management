interface CTASectionProps {
  onGetStarted: () => void;
}

export function CTASection({ onGetStarted }: CTASectionProps) {
  return (
    <section className="landing-cta landing-section">
      <div className="cta-glow-bg" />
      <div className="cta-inner rv">
        <div className="cta-tag"><span />{" "}Get started today{" "}<span /></div>
        <h2 className="cta-h2">Run every project<br /><em>exactly as it deserves.</em></h2>
        <p className="cta-sub">No credit card. No contract. No consultants. Start free in the next five minutes.</p>
        <div className="cta-btns">
          <button className="btn-hero-main" onClick={onGetStarted}>
            Start for free
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5H11M7.5 1L11 4.5L7.5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="btn-hero-ghost" onClick={onGetStarted}>Book a 20-min demo</button>
        </div>
        <p className="cta-note">14-day free trial &middot; No credit card &middot; Cancel anytime</p>
      </div>
    </section>
  );
}
