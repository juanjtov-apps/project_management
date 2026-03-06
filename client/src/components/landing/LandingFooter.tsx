export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand-name">
            <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
              <path d="M26 3L47 13V26C47 37.6 37.6 47 26 47C14.4 47 5 37.6 5 26V13L26 3Z" stroke="rgba(0,194,120,0.45)" strokeWidth="1.1" fill="rgba(0,194,120,0.04)" />
              <circle cx="26" cy="26" r="3.8" fill="#00C278" />
            </svg>
            Proesphere
          </div>
          <p className="footer-brand-desc">
            The central operations hub for general contractors. Every project, team, client, and dollar — unified and intelligently managed.
          </p>
        </div>
        <div>
          <div className="footer-col-title">Platform</div>
          <ul className="footer-links">
            <li><a href="#">Project Management</a></li>
            <li><a href="#">Client Portal</a></li>
            <li><a href="#">AI Features</a></li>
            <li><a href="#">Financial Tools</a></li>
            <li><a href="#">Subcontractors</a></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">Company</div>
          <ul className="footer-links">
            <li><a href="#">About</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">Resources</div>
          <ul className="footer-links">
            <li><a href="#">Documentation</a></li>
            <li><a href="#">Support</a></li>
            <li><a href="#">API</a></li>
            <li><a href="#">Status</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-copy">&copy; 2025 Proesphere, Inc.</span>
        <div className="footer-legal">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Security</a>
        </div>
      </div>
    </footer>
  );
}
