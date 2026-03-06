const PILLS = [
  { title: "Natural language queries", desc: "Ask anything about your projects in plain English. No training, no setup." },
  { title: "Proactive risk detection", desc: "Budget anomalies and schedule risks flagged before they become problems." },
  { title: "Automated client updates", desc: "Status reports drafted and sent on your schedule, in your voice." },
  { title: "Smart document parsing", desc: "Upload contracts — AI extracts every deadline, requirement, and obligation." },
];

export function AISection() {
  return (
    <section className="landing-ai landing-section" id="ai">
      <div className="ai-inner">
        <div>
          <div className="landing-tag rv">AI Intelligence</div>
          <h2 className="landing-h2 rv">Intelligence built in,<br /><em>not bolted on.</em></h2>
          <p className="landing-p rv" style={{ marginTop: 16 }}>
            Proesphere's AI layer is grounded in your actual project data. It doesn't just answer — it anticipates problems before they cost you money.
          </p>
          <div className="ai-pills rv">
            {PILLS.map((p) => (
              <div key={p.title} className="ai-pill">
                <div className="ai-pill-dot" />
                <div>
                  <div className="ai-pill-title">{p.title}</div>
                  <div className="ai-pill-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rv">
          <div className="ai-chat-mockup">
            <div className="ac-head">
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--mint-dim)', border: '1px solid var(--mint-line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
              }}>{"\u2726"}</div>
              <div className="ac-name">Proesphere AI</div>
              <div style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'var(--ff-mono-landing)', fontSize: 9, color: 'var(--mint)'
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mint)', boxShadow: '0 0 5px var(--mint)', display: 'inline-block' }} />
                Active
              </div>
            </div>
            <div className="ac-body">
              <div className="chat-msg user"><div className="chat-bubble">Which projects are trending over budget?</div></div>
              <div className="chat-msg assistant"><div className="chat-bubble"><span className="chat-highlight">Metro Office Complex</span> is trending <span className="chat-highlight">$24K over</span> — subcontractor hours 18% above plan in framing phase.<br /><br />Riverdale and Sunset Villas are both within 2% of budget.</div></div>
              <div className="chat-msg user"><div className="chat-bubble">Draft a change order for Metro and notify my PM.</div></div>
              <div className="chat-msg assistant"><div className="chat-bubble">{"\u2713"} <span className="chat-highlight">Change order drafted — $24,000</span> additional framing labor. Your PM notified. Ready to send to Brightfield Corp for approval.</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
