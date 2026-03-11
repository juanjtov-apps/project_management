import { useTranslation } from "react-i18next";

export function TabletDemo() {
  const { t } = useTranslation('landing');

  return (
    <div className="hero-demo">
      <div className="tablet-wrap">
        <div className="tablet-glow" />

        {/* Floating chips above tablet */}
        <div className="tab-chips">
          <div className="chip"><span className="cd cdm" />{t('tablet.chipsOnTrack')}</div>
          <div className="chip"><span className="cd" style={{ background: 'rgba(237,232,223,0.25)' }} />{t('tablet.chipsBudgetAlert')}</div>
          <div className="chip"><span className="cd cdm" />{t('tablet.chipsRevenue')}</div>
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
                <div className="brf-badge"><span className="brf-bdot" />{t('tablet.morningBriefing')}</div>
                <div className="brf-date">{t('tablet.briefingDate')}</div>
              </div>
              <div className="brf-body">
                <div className="brf-text">
                  <strong style={{ color: 'rgba(237,232,223,0.85)' }}>{t('tablet.activeJobs')}</strong> {t('tablet.activeJobsToday')}{' '}
                  <span className="hi-r">{t('tablet.harborViewBehind')}</span> {t('tablet.framingCrewUnconfirmed')}
                  {' '}{t('tablet.oakAveWindow')}{' '}
                  <span className="hi-a">{t('tablet.overdueAmount')}</span>{' '}
                  <span className="hi-m">{t('tablet.pineCtInspection')}</span>
                </div>
                <div className="brf-chips">
                  <div className="brf-chip rose"><span className="cc">{"\u2726"}</span>{t('tablet.chipHarborView')}</div>
                  <div className="brf-chip"><span className="cc">{"\u2726"}</span>{t('tablet.chipOakAve')}</div>
                  <div className="brf-chip rose"><span className="cc">{"\u2726"}</span>{t('tablet.chipOverdue')}</div>
                  <div className="brf-chip"><span className="cc">{"\u2726"}</span>{t('tablet.chipInspection')}</div>
                </div>
              </div>

              {/* Conversation divider */}
              <div className="conv-div"><span>{t('tablet.conversation')}</span></div>

              {/* Proe header */}
              <div className="proe-row">
                <div className="proe-name">
                  <div className="proe-ico">{"\u2726"}</div>
                  <div className="proe-lbl">{t('tablet.proe')}</div>
                </div>
                <div className="proe-active">{t('tablet.active')}</div>
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
                    <div className="v-status">{t('tablet.analyzingIntent')}</div>
                    <div className="v-quote">&ldquo;{t('tablet.voiceQuote')}&rdquo;</div>
                  </div>
                </div>

                {/* Frame 2: Proe confirms */}
                <div className="tf tf-2">
                  <div className="proe-bubble">PROE</div>
                  <div className="proe-msg">
                    <p><strong>{t('tablet.frame2Done')}</strong> {t('tablet.frame2Msg')}</p>
                  </div>
                  <div className="wf-tags">
                    <div className="wf-tag">{t('tablet.tagProject')} <strong>Riverdale</strong></div>
                    <div className="wf-tag">{t('tablet.tagSub')} <strong>Apex Builders</strong></div>
                    <div className="wf-tag">{t('tablet.tagDelay')} <strong>{t('tablet.delayValue')}</strong></div>
                  </div>
                  <div className="wf-confirm">
                    <div className="wf-conf-ico">&#x1F4C5;</div>
                    <div className="wf-conf-text">
                      <div className="wf-conf-title">{t('tablet.scheduleUpdateTitle')}</div>
                      <div className="wf-conf-sub">{t('tablet.scheduleUpdateDetail')}</div>
                    </div>
                    <div className="wf-conf-ok">&#x2713; {t('tablet.done')}</div>
                  </div>
                </div>

                {/* Frame 3: Cascade */}
                <div className="tf tf-3">
                  <div className="proe-bubble">PROE</div>
                  <div className="cascade-grid">
                    <div className="cg-item">
                      <div className="cg-ico cg-m">&#x1F4C5;</div>
                      <div><div className="cg-ti">{t('tablet.cascadeSchedule')}</div><div className="cg-su">{t('tablet.cascadeScheduleSub')}</div></div>
                      <div className="cg-ok cg-ok-m">&#x2713;</div>
                    </div>
                    <div className="cg-item">
                      <div className="cg-ico cg-m">&#x1F517;</div>
                      <div><div className="cg-ti">{t('tablet.cascadeSubNotified')}</div><div className="cg-su">{t('tablet.cascadeSubSub')}</div></div>
                      <div className="cg-ok cg-ok-m">&#x2713;</div>
                    </div>
                    <div className="cg-item">
                      <div className="cg-ico cg-m">&#x1F465;</div>
                      <div><div className="cg-ti">{t('tablet.cascadePortal')}</div><div className="cg-su">{t('tablet.cascadePortalSub')}</div></div>
                      <div className="cg-ok cg-ok-m">&#x2713;</div>
                    </div>
                    <div className="cg-item">
                      <div className="cg-ico cg-a">&#x1F327;</div>
                      <div><div className="cg-ti">{t('tablet.cascadeAI')}</div><div className="cg-su">{t('tablet.cascadeAISub')}</div></div>
                      <div className="cg-ok cg-ok-m">&rarr;</div>
                    </div>
                  </div>
                  <div className="casc-foot">{t('tablet.cascadeFoot')}</div>
                </div>
              </div>

              {/* Chat input */}
              <div className="tab-input">
                <div className="tab-drop">{t('tablet.dropLabel')} <span>{t('tablet.dropItems')}</span> {t('tablet.dropAuto')}</div>
                <div className="tab-input-row">
                  <div className="tab-input-field">{t('tablet.inputPlaceholder')}</div>
                  <div className="tab-mic">&#x1F399;</div>
                  <div className="tab-send">&rarr;</div>
                </div>
              </div>
            </div>

            {/* Right panel: Active Jobs */}
            <div className="tab-jobs">
              <div className="tab-jobs-head">
                <div className="tj-title">{t('tablet.activeJobsTitle')}</div>
                <div className="tj-view">{t('tablet.viewAll')}</div>
              </div>
              <div className="tab-jobs-scroll">
                <JobCard icon="&#x1F3E0;" name={t('tablet.job1Name')} status={t('tablet.job1Status')} statusClass="st-ok" pct={68} fillColor="var(--mint)" aiText={t('tablet.job1AI')} />
                <JobCard icon="&#x1F528;" name={t('tablet.job2Name')} status={t('tablet.job2Status')} statusClass="st-risk" pct={41} fillColor="rgba(0,194,120,0.45)" aiText={t('tablet.job2AI')} />
                <JobCard icon="&#x1F3D7;" name={t('tablet.job3Name')} status={t('tablet.job3Status')} statusClass="st-del" pct={22} fillColor="rgba(0,194,120,0.25)" aiText={t('tablet.job3AI')} updating />
                <JobCard icon="&#x1F373;" name={t('tablet.job4Name')} status={t('tablet.job4Status')} statusClass="st-done" pct={89} fillColor="var(--mint)" aiText={t('tablet.job4AI')} />
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
