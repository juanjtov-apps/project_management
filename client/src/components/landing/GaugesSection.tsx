const GAUGES = [
  { value: "76%", label: "Less admin time", offset: 45.2 },
  { value: "88%", label: "Fewer client calls", offset: 22.6 },
  { value: "60%", label: "Faster invoicing", offset: 75.4 },
  { value: "95%", label: "Would recommend", offset: 9.4 },
];

export function GaugesSection() {
  return (
    <section className="landing-gauges landing-section">
      <div className="gauges-inner">
        <div>
          <div className="landing-tag rv">Results</div>
          <h2 className="landing-h2 rv">Numbers that<br /><em>speak for themselves.</em></h2>
          <p className="landing-p rv" style={{ marginTop: 16 }}>
            Contractors who switch don't go back. Proesphere typically pays for itself in the first week.
          </p>
        </div>
        <div className="gauges-grid rv">
          {GAUGES.map((g) => (
            <div key={g.label} className="gauge-card">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(237,232,223,0.06)" strokeWidth="5" />
                <circle cx="40" cy="40" r="30" fill="none" stroke="#00C278" strokeWidth="5" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset={g.offset} transform="rotate(-90 40 40)" />
              </svg>
              <div className="gauge-val">{g.value}</div>
              <div className="gauge-label">{g.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
