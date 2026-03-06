const FEATURES = [
  { num: "01 / 06", icon: "\uD83D\uDCCB", title: "Project Command Center", desc: "Every task, milestone, and schedule synchronized in one view. Your crew knows what to do — without a phone call.", tags: ["GANTT", "TASKS", "MILESTONES"] },
  { num: "02 / 06", icon: "\uD83D\uDC65", title: "Branded Client Portal", desc: "Live updates, photos, and approvals via magic link. No app, no password, no \"how's it going?\" calls.", tags: ["MAGIC LINK", "APPROVALS"] },
  { num: "03 / 06", icon: "\uD83D\uDCB0", title: "Financial Intelligence", desc: "Budgets, change orders, invoices, and payment milestones — tracked from estimate to final check.", tags: ["CHANGE ORDERS", "INVOICING"] },
  { num: "04 / 06", icon: "\u2726", title: "AI That Understands Your Business", desc: "Ask anything in plain English. Instant answers from your actual project data — not a chatbot, an intelligent co-pilot.", tags: ["NATURAL LANGUAGE", "RISK DETECTION"] },
  { num: "05 / 06", icon: "\uD83D\uDD27", title: "Subcontractor Hub", desc: "Tasks, checklists, performance scores, and payments — all from a passwordless portal subs access anywhere.", tags: ["MAGIC LINK", "SCORING"] },
  { num: "06 / 06", icon: "\uD83D\uDCCA", title: "Live Operations Dashboard", desc: "A real-time command view of every active project — what's on track, at risk, and needs your attention.", tags: ["REAL-TIME", "KPIs"] },
];

export function FeaturesSection() {
  return (
    <section className="landing-features landing-section" id="platform">
      <div className="landing-w">
        <div className="landing-tag rv">The platform</div>
        <h2 className="landing-h2 rv">Built for how <em>contractors actually work.</em></h2>
      </div>
      <div className="features-grid">
        {FEATURES.map((f) => (
          <div key={f.num} className="feature-card rv">
            <div className="feature-card-top">
              <div className="feature-card-glow" />
              <div className="feature-num">{f.num}</div>
              <div className="feature-ico">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
            </div>
            <div className="feature-card-bot">
              <p className="feature-desc">{f.desc}</p>
              <div className="feature-tags">
                {f.tags.map((t) => (
                  <span key={t} className="feature-tag">{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
