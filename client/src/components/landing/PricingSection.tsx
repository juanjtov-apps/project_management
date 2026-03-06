interface PricingSectionProps {
  onGetStarted: () => void;
}

export function PricingSection({ onGetStarted }: PricingSectionProps) {
  return (
    <section className="landing-pricing landing-section" id="pricing">
      <div className="pricing-inner">
        <div className="pricing-header rv">
          <div className="landing-tag" style={{ justifyContent: 'center' }}>Pricing</div>
          <h2 className="landing-h2" style={{ textAlign: 'center' }}>Simple, honest.<br /><em>Grows with you.</em></h2>
        </div>
        <div className="pricing-cards">
          <div className="pricing-card rv">
            <div className="pricing-name">Starter</div>
            <div className="pricing-price"><sup>$</sup>49</div>
            <div className="pricing-period">per month &middot; 3 active projects</div>
            <div className="pricing-rule" />
            <ul className="pricing-features">
              <li>3 active projects</li>
              <li>Unlimited team members</li>
              <li>Branded client portal</li>
              <li>Photo &amp; document hub</li>
              <li>Basic reporting</li>
            </ul>
            <button className="pricing-btn ghost" onClick={onGetStarted}>Get started free</button>
          </div>

          <div className="pricing-card featured rv">
            <div className="pricing-badge">Most Popular</div>
            <div className="pricing-name">Professional</div>
            <div className="pricing-price"><sup>$</sup>149</div>
            <div className="pricing-period">per month &middot; unlimited projects</div>
            <div className="pricing-rule" />
            <ul className="pricing-features">
              <li>Unlimited projects</li>
              <li>AI intelligence</li>
              <li>Full financial suite</li>
              <li>Automated client updates</li>
              <li>Subcontractor portal</li>
              <li>Live KPI dashboard</li>
            </ul>
            <button className="pricing-btn solid" onClick={onGetStarted}>Start 14-day trial</button>
          </div>

          <div className="pricing-card rv">
            <div className="pricing-name">Enterprise</div>
            <div className="pricing-price" style={{ fontSize: 34, paddingTop: 10 }}>Custom</div>
            <div className="pricing-period">tailored to your operation</div>
            <div className="pricing-rule" />
            <ul className="pricing-features">
              <li>Everything in Professional</li>
              <li>Custom integrations</li>
              <li>White-label options</li>
              <li>Dedicated account manager</li>
              <li>SLA &amp; compliance</li>
            </ul>
            <button className="pricing-btn ghost" onClick={onGetStarted}>Talk to sales</button>
          </div>
        </div>
      </div>
    </section>
  );
}
