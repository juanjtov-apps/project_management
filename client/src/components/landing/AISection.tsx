import { useTranslation } from "react-i18next";

const PILL_KEYS = ["1", "2", "3", "4"] as const;

export function AISection() {
  const { t } = useTranslation('landing');

  return (
    <section className="landing-ai landing-section" id="ai">
      <div className="ai-inner">
        <div>
          <div className="landing-tag rv">{t('ai.tag')}</div>
          <h2 className="landing-h2 rv">{t('ai.headline')}<br /><em>{t('ai.headlineSub')}</em></h2>
          <p className="landing-p rv" style={{ marginTop: 16 }}>
            {t('ai.subtext')}
          </p>
          <div className="ai-pills rv">
            {PILL_KEYS.map((key) => (
              <div key={key} className="ai-pill">
                <div className="ai-pill-dot" />
                <div>
                  <div className="ai-pill-title">{t(`ai.feature${key}.title`)}</div>
                  <div className="ai-pill-desc">{t(`ai.feature${key}.desc`)}</div>
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
              <div className="ac-name">{t('ai.chatLabel')}</div>
              <div style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'var(--ff-mono-landing)', fontSize: 9, color: 'var(--mint)'
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mint)', boxShadow: '0 0 5px var(--mint)', display: 'inline-block' }} />
                {t('ai.chatActive')}
              </div>
            </div>
            <div className="ac-body">
              <div className="chat-msg user"><div className="chat-bubble">{t('ai.chatQuery')}</div></div>
              <div className="chat-msg assistant"><div className="chat-bubble"><span className="chat-highlight">Metro Office Complex</span> {t('ai.chatResponse1')} <span className="chat-highlight">$24K over</span> — {t('ai.chatResponse2')}<br /><br />{t('ai.chatResponse3')}</div></div>
              <div className="chat-msg user"><div className="chat-bubble">{t('ai.chatFollowUp')}</div></div>
              <div className="chat-msg assistant"><div className="chat-bubble">{"\u2713"} <span className="chat-highlight">{t('ai.chatResult')}</span> {t('ai.chatResultDetail')}</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
