const ITEMS = [
  "Project Management", "Client Portal", "AI Intelligence", "Financial Control",
  "Subcontractor Hub", "Schedule Management", "Live Reporting", "Issue Tracking",
  "Payment Milestones", "Photo Hub",
];

export function Marquee() {
  return (
    <div className="landing-marquee" aria-hidden="true">
      <div className="mq-track">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className="mq-item">
            <span className="mq-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
