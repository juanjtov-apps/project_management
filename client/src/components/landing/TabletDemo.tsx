export function TabletDemo() {
  return (
    <div className="hero-demo">
      <div className="tablet-wrap">
        <div className="tablet-glow" />

        {/* Floating chips above tablet */}
        <div className="tab-chips">
          <div className="chip"><span className="cd cdm" />3 projects on track</div>
          <div className="chip"><span className="cd" style={{ background: 'rgba(237,232,223,0.25)' }} />Budget alert &middot; Metro Office</div>
          <div className="chip"><span className="cd cdm" />$284K revenue MTD</div>
        </div>

        <div className="tablet">
          {/* Top nav bar */}
          <div className="tnav">
            <div className="tnav-logo-dot">{"\u2726"}</div>
            <div className="tnav-brand">PROE<em>sphere</em></div>
            <div className="tnav-right">
              <div className="tnav-bell">
                <span style={{ fontSize: '11px' }}>&#x1F514;</span>
                <div className="tnav-badge">3</div>
              </div>
              <div className="tnav-av">JV</div>
            </div>
          </div>

          {/* Body: icon sidebar + main + right panel */}
          <div className="tab-body">
            {/* Icon sidebar */}
            <div className="tab-icons">
              <div className="ti active">&#x26A1;<div className="ti-badge">3</div></div>
              <div className="ti">&#x1F9E0;</div>
              <div className="ti">&#x25EB;</div>
              <div className="ti">&#x1F4C1;<div className="ti-badge">6</div></div>
              <div className="ti">&#x2713;<div className="ti-badge">2</div></div>
              <div className="ti">&#x26A0;<div className="ti-badge">1</div></div>
              <div className="ti">&#x1F4C5;</div>
              <div className="ti">&#x1F4C2;<div className="ti-badge">2</div></div>
              <div className="ti">&#x1F3DB;</div>
            </div>

            {/* Main panel */}
            <div className="tab-main">
              {/* Morning briefing header */}
              <div className="brf-head">
                <div className="brf-badge"><span className="brf-bdot" />Morning Briefing</div>
                <div className="brf-date">Wed, Mar 4 &middot; 7:14 AM</div>
              </div>
              <div className="brf-body">
                <div className="brf-text">
                  <strong style={{ color: 'rgba(237,232,223,0.85)' }}>6 active jobs</strong> today.{' '}
                  <span className="hi-r">Harbor View 4 days behind</span> — framing crew unconfirmed.
                  Oak Ave window closing tomorrow.{' '}
                  <span className="hi-a">$8,400 overdue &middot; Martinez.</span>{' '}
                  <span className="hi-m">Pine Ct ready for inspection.</span>
                </div>
                <div className="brf-chips">
                  <div className="brf-chip rose"><span className="cc">{"\u2726"}</span>Harbor View — 4 days behind</div>
                  <div className="brf-chip"><span className="cc">{"\u2726"}</span>Oak Ave delivery unconfirmed</div>
                  <div className="brf-chip rose"><span className="cc">{"\u2726"}</span>$8,400 overdue</div>
                  <div className="brf-chip"><span className="cc">{"\u2726"}</span>Schedule inspection</div>
                </div>
              </div>

              {/* Conversation divider */}
              <div className="conv-div"><span>Conversation</span></div>

              {/* Proe header */}
              <div className="proe-row">
                <div className="proe-name">
                  <div className="proe-ico">{"\u2726"}</div>
                  <div className="proe-lbl">Proe</div>
                </div>
                <div className="proe-active">Active</div>
              </div>

              {/* Animated frames */}
              <div className="tab-frames">
                {/* Frame 1: Voice listening */}
                <div className="tf tf-1">
                  <div className="proe-bubble">PROE</div>
                  <div className="voice-center">
                    <div className="v-orb">
                      <div className="v-bars">
                        <div className="v-b" /><div className="v-b" /><div className="v-b" />
                        <div className="v-b" /><div className="v-b" /><div className="v-b" /><div className="v-b" />
                      </div>
                    </div>
                    <div className="v-status">Analyzing intent&hellip;</div>
                    <div className="v-quote">&ldquo;Delay the foundation pour at Riverdale by two days due to rain. Notify the sub.&rdquo;</div>
                  </div>
                </div>

                {/* Frame 2: Proe confirms */}
                <div className="tf tf-2">
                  <div className="proe-bubble">PROE</div>
                  <div className="proe-msg">
                    <p>Done. <strong>Riverdale foundation pour moved to Mar 17.</strong> Apex Builders notified via magic link. Client portal updated with delay notice.</p>
                  </div>
                  <div className="wf-tags">
                    <div className="wf-tag">PROJECT: <strong>Riverdale</strong></div>
                    <div className="wf-tag">SUB: <strong>Apex Builders</strong></div>
                    <div className="wf-tag">DELAY: <strong>+2 days</strong></div>
                  </div>
                  <div className="wf-confirm">
                    <div className="wf-conf-ico">&#x1F4C5;</div>
                    <div className="wf-conf-text">
                      <div className="wf-conf-title">Schedule Update #047 — Riverdale</div>
                      <div className="wf-conf-sub">Foundation pour &rarr; Mar 17 &middot; Magic link &rarr; Apex Builders &middot; Portal updated</div>
                    </div>
                    <div className="wf-conf-ok">&#x2713; Done</div>
                  </div>
                </div>

                {/* Frame 3: Cascade */}
                <div className="tf tf-3">
                  <div className="proe-bubble">PROE</div>
                  <div className="cascade-grid">
                    <div className="cg-item">
                      <div className="cg-ico cg-m">&#x1F4C5;</div>
                      <div><div className="cg-ti">Schedule updated</div><div className="cg-su">Foundation pour &rarr; Mar 17</div></div>
                      <div className="cg-ok cg-ok-m">&#x2713;</div>
                    </div>
                    <div className="cg-item">
                      <div className="cg-ico cg-m">&#x1F517;</div>
                      <div><div className="cg-ti">Sub notified</div><div className="cg-su">Magic link &rarr; Apex Builders</div></div>
                      <div className="cg-ok cg-ok-m">&#x2713;</div>
                    </div>
                    <div className="cg-item">
                      <div className="cg-ico cg-m">&#x1F465;</div>
                      <div><div className="cg-ti">Client portal updated</div><div className="cg-su">Delay notice &rarr; Johnson &amp; Assoc.</div></div>
                      <div className="cg-ok cg-ok-m">&#x2713;</div>
                    </div>
                    <div className="cg-item">
                      <div className="cg-ico cg-a">&#x1F327;</div>
                      <div><div className="cg-ti">AI suggests</div><div className="cg-su">2 more weather-risk tasks</div></div>
                      <div className="cg-ok cg-ok-m">&rarr;</div>
                    </div>
                  </div>
                  <div className="casc-foot">3 actions &middot; 4 seconds</div>
                </div>
              </div>

              {/* Chat input */}
              <div className="tab-input">
                <div className="tab-drop">Drop: <span>invoice, permit, contract</span> — Proe fills automatically</div>
                <div className="tab-input-row">
                  <div className="tab-input-field">Tell Proe anything&hellip;</div>
                  <div className="tab-mic">&#x1F399;</div>
                  <div className="tab-send">&rarr;</div>
                </div>
              </div>
            </div>

            {/* Right panel: Active Jobs */}
            <div className="tab-jobs">
              <div className="tab-jobs-head">
                <div className="tj-title">Active Jobs</div>
                <div className="tj-view">View all &rarr;</div>
              </div>
              <div className="tab-jobs-scroll">
                <JobCard icon="&#x1F3E0;" name="Maple St Renovation" status="ON TRACK" statusClass="st-ok" pct={68} fillColor="var(--mint)" aiText="Electrical sub confirmed Monday. Schedule drywall this week." />
                <JobCard icon="&#x1F528;" name="Oak Ave Addition" status="AT RISK" statusClass="st-risk" pct={41} fillColor="rgba(0,194,120,0.45)" aiText="No lumber confirmation. Framing week at risk." />
                <JobCard icon="&#x1F3D7;" name="Harbor View Build" status="DELAYED" statusClass="st-del" pct={22} fillColor="rgba(0,194,120,0.25)" aiText="Crew unconfirmed. Permit buffer at risk by Apr 3." updating />
                <JobCard icon="&#x1F373;" name="Pine Ct Kitchen" status="NEARLY DONE" statusClass="st-done" pct={89} fillColor="var(--mint)" aiText="All checks passed. Thu 10am slot available." />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobCard({ icon, name, status, statusClass, pct, fillColor, aiText, updating }: {
  icon: string;
  name: string;
  status: string;
  statusClass: string;
  pct: number;
  fillColor: string;
  aiText: string;
  updating?: boolean;
}) {
  return (
    <div className={`job-card${updating ? ' updating' : ''}`}>
      <div className="jc-top">
        <div className="jc-icon" dangerouslySetInnerHTML={{ __html: icon }} />
        <div className="jc-name">{name}</div>
        <div className={`jc-status ${statusClass}`}>{status}</div>
      </div>
      <div className="jc-pct">{pct}%</div>
      <div className="jc-bar"><div className="jc-fill" style={{ width: `${pct}%`, background: fillColor }} /></div>
      <div className="jc-ai">
        <div className="jc-ai-badge">AI</div>
        <div className="jc-ai-txt">{aiText}</div>
      </div>
    </div>
  );
}
