const TESTIMONIALS = [
  {
    quote: "I used to spend every Monday piecing together where each project stood. Now I open Proesphere and it's all right there. I got those three hours back — every single week.",
    name: "Marcus T.", role: "Owner, Tiernan Construction", avatar: "\uD83D\uDC77",
  },
  {
    quote: "My clients love the portal. They stop calling. That alone made it worth ten times the subscription cost in the first month.",
    name: "Sandra R.", role: "PM, Rosario Build Group", avatar: "\uD83C\uDFD7\uFE0F",
  },
  {
    quote: "The AI caught a budget overrun two weeks before I would have noticed. It saved us a very uncomfortable conversation — and about $40K.",
    name: "Derek O.", role: "Principal, Ortega & Sons", avatar: "\u2692\uFE0F",
  },
];

export function TestimonialsSection() {
  return (
    <section className="landing-testimonials landing-section">
      <div className="testi-inner">
        <div className="testi-header rv">
          <div>
            <div className="landing-tag">Testimonials</div>
            <h2 className="landing-h2">From contractors who<br /><em>refuse to go back.</em></h2>
          </div>
          <div className="testi-count">340+ active contractors</div>
        </div>
        <div className="testi-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="testi-card rv">
              <div className="testi-qm">&ldquo;</div>
              <p className="testi-quote">{t.quote}</p>
              <div className="testi-author">
                <div className="testi-avatar">{t.avatar}</div>
                <div>
                  <div className="testi-name">{t.name}</div>
                  <div className="testi-role">{t.role}</div>
                </div>
                <div className="testi-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
